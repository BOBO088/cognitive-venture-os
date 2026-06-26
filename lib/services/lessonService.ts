/**
 * LessonService — 复盘文档的业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ mvpProjectService（校验 projectId 引用）
 *                            ↘ launchResultService（校验 launchResultId 引用）
 *                            ↘ llmProvider（generateLessonLearned 用于"从 launch 预填"）
 *
 * 业务规则：
 *   1. projectId 必须存在（service 校验 MVPProject 引用）
 *   2. launchResultId 可选；若提供必须存在（service 校验 LaunchResult 引用）
 *   3. 9 个文本字段（whatWorked / whatFailed / why / 4 insights / nextAction /
 *      scoreModelSuggestion）每个 1-4000 字符
 *   4. id 唯一性
 *   5. createdAt / updatedAt 由调用方提供
 *
 * 自动生成：generateLessonForLaunch(launchResultId) 调用 LLMProvider
 * 预填一个草稿，由 UI 端让用户编辑后保存；service 不直接落库。
 */

import {
  listLessons as _repoList,
  listLessonsSorted as _repoListSorted,
  getLesson as _repoGet,
  listLessonsByProject as _repoListByProject,
  listLessonsByLaunch as _repoListByLaunch,
  insertLesson as _repoInsert,
  updateLessonInStore as _repoUpdate,
  deleteLessonFromStore as _repoDelete,
} from '@/lib/repos/learning';
import { getMVPProject } from './mvpProjectService';
import { getLaunchResult } from './launchResultService';
import { getLLMProvider } from '@/lib/providers';
import type { LessonLearned, MVPProject, LaunchResult } from '@/types';

const FIELD_MAX = 4000;
const PROJECT_ID_MAX = 200;

const TEXT_FIELDS = [
  'whatWorked',
  'whatFailed',
  'why',
  'customerInsight',
  'marketInsight',
  'productInsight',
  'geoInsight',
  'nextAction',
  'scoreModelSuggestion',
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

export class LessonServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LessonServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateProjectId(id: string | undefined): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new LessonServiceError('projectId is required');
  }
  const v = id.trim();
  if (v.length > PROJECT_ID_MAX) {
    throw new LessonServiceError(
      `projectId must be ≤ ${PROJECT_ID_MAX} characters`,
    );
  }
  return v;
}

async function validateProjectExists(id: string): Promise<MVPProject> {
  const m = await getMVPProject(id);
  if (!m) {
    throw new LessonServiceError(`MVP project not found: ${id}`);
  }
  return m;
}

async function validateLaunchExists(
  id: string,
): Promise<LaunchResult> {
  const r = await getLaunchResult(id);
  if (!r) {
    throw new LessonServiceError(`Launch result not found: ${id}`);
  }
  return r;
}

function validateTextField(
  fieldName: TextField,
  v: string | undefined,
): string {
  if (typeof v !== 'string') {
    throw new LessonServiceError(`${fieldName} is required`);
  }
  const trimmed = v.trim();
  if (trimmed.length === 0) {
    throw new LessonServiceError(`${fieldName} cannot be empty`);
  }
  if (trimmed.length > FIELD_MAX) {
    throw new LessonServiceError(
      `${fieldName} must be ≤ ${FIELD_MAX} characters`,
    );
  }
  return trimmed;
}

/* ----------------- Read ----------------- */

export async function listLessons(): Promise<LessonLearned[]> {
  return _repoListSorted();
}

export async function getLesson(
  id: string,
): Promise<LessonLearned | undefined> {
  return _repoGet(id);
}

export async function listLessonsByProject(
  projectId: string,
): Promise<LessonLearned[]> {
  return _repoListByProject(projectId);
}

export async function listLessonsByLaunch(
  launchResultId: string,
): Promise<LessonLearned[]> {
  return _repoListByLaunch(launchResultId);
}

export async function listLessonsFiltered(filter: {
  projectId?: string;
  launchResultId?: string;
}): Promise<LessonLearned[]> {
  const all = await _repoListSorted();
  return all
    .filter((l) => (filter.projectId ? l.projectId === filter.projectId : true))
    .filter((l) =>
      filter.launchResultId ? l.launchResultId === filter.launchResultId : true,
    );
}

/* ----------------- Aggregates ----------------- */

export interface LessonStats {
  totalLessons: number;
  withLaunchCount: number;
  projectIds: string[];
}

export async function computeLessonStats(
  lessons?: LessonLearned[],
): Promise<LessonStats> {
  const all = lessons ?? (await _repoList());
  const withLaunchCount = all.filter((l) => !!l.launchResultId).length;
  const projectIds = Array.from(new Set(all.map((l) => l.projectId))).sort();
  return {
    totalLessons: all.length,
    withLaunchCount,
    projectIds,
  };
}

/* ----------------- Write ----------------- */

export interface CreateLessonInput {
  id: string;
  projectId: string;
  launchResultId?: string;
  whatWorked: string;
  whatFailed: string;
  why: string;
  customerInsight: string;
  marketInsight: string;
  productInsight: string;
  geoInsight: string;
  nextAction: string;
  scoreModelSuggestion: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLessonInput {
  projectId?: string;
  launchResultId?: string | null; // null = 清空
  whatWorked?: string;
  whatFailed?: string;
  why?: string;
  customerInsight?: string;
  marketInsight?: string;
  productInsight?: string;
  geoInsight?: string;
  nextAction?: string;
  scoreModelSuggestion?: string;
  updatedAt: string;
}

export async function createLesson(
  input: CreateLessonInput,
): Promise<LessonLearned> {
  const projectId = validateProjectId(input.projectId);
  await validateProjectExists(projectId);
  let launchResultId: string | undefined;
  if (input.launchResultId !== undefined && input.launchResultId !== '') {
    const r = await validateLaunchExists(input.launchResultId);
    if (r.mvpProjectId !== projectId) {
      throw new LessonServiceError(
        `Launch result ${r.id} does not belong to project ${projectId}`,
      );
    }
    launchResultId = r.id;
  }

  const textValues: Record<TextField, string> = {} as Record<TextField, string>;
  for (const f of TEXT_FIELDS) {
    textValues[f] = validateTextField(f, input[f]);
  }

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new LessonServiceError(
      `Lesson with id "${input.id}" already exists`,
    );
  }

  const created: LessonLearned = {
    id: input.id,
    projectId,
    ...(launchResultId ? { launchResultId } : {}),
    whatWorked: textValues.whatWorked,
    whatFailed: textValues.whatFailed,
    why: textValues.why,
    customerInsight: textValues.customerInsight,
    marketInsight: textValues.marketInsight,
    productInsight: textValues.productInsight,
    geoInsight: textValues.geoInsight,
    nextAction: textValues.nextAction,
    scoreModelSuggestion: textValues.scoreModelSuggestion,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateLesson(
  id: string,
  patch: UpdateLessonInput,
): Promise<LessonLearned> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new LessonServiceError(`Lesson not found: ${id}`);
  }

  let projectId = existing.projectId;
  if (patch.projectId !== undefined) {
    projectId = validateProjectId(patch.projectId);
    await validateProjectExists(projectId);
  }

  let launchResultId: string | undefined = existing.launchResultId;
  if (patch.launchResultId === null) {
    launchResultId = undefined;
  } else if (patch.launchResultId !== undefined && patch.launchResultId !== '') {
    const r = await validateLaunchExists(patch.launchResultId);
    if (r.mvpProjectId !== projectId) {
      throw new LessonServiceError(
        `Launch result ${r.id} does not belong to project ${projectId}`,
      );
    }
    launchResultId = r.id;
  }

  const textValues: Record<TextField, string> = {} as Record<TextField, string>;
  for (const f of TEXT_FIELDS) {
    const incoming = patch[f];
    textValues[f] =
      incoming !== undefined
        ? validateTextField(f, incoming)
        : existing[f];
  }

  const next: LessonLearned = {
    id: existing.id,
    projectId,
    launchResultId, // 显式赋值（含 undefined），让 repo spread 不会回退到旧值
    whatWorked: textValues.whatWorked,
    whatFailed: textValues.whatFailed,
    why: textValues.why,
    customerInsight: textValues.customerInsight,
    marketInsight: textValues.marketInsight,
    productInsight: textValues.productInsight,
    geoInsight: textValues.geoInsight,
    nextAction: textValues.nextAction,
    scoreModelSuggestion: textValues.scoreModelSuggestion,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new LessonServiceError(`failed to persist lesson update: ${id}`);
  }
  return updated;
}

export async function deleteLesson(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new LessonServiceError(`Lesson not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Auto-generate from launch ----------------- */

export interface GenerateLessonFromLaunchOptions {
  /** 由调用方提供 draft id（service 不生成）。 */
  draftId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 调用 LLMProvider.generateLessonLearned 预填 lesson 草稿。
 *
 * 注意：本方法**不写库**。它只是给 UI 一个"由 launch 预填"的入口；
 * 用户在表单里编辑后才会 createLesson。这是与 prdService.generatePRDForMVP
 * 不同的策略——lesson 的人工编辑量更大，不适合 LLM 直出。
 */
export async function generateLessonDraftForLaunch(
  launchResultId: string,
): Promise<LessonLearned> {
  const launch = await validateLaunchExists(launchResultId);
  const provider = await getLLMProvider();
  return provider.generateLessonLearned(launch);
}
