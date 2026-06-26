/**
 * PRDService — PRD 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ mvpProjectService（校验 mvpProjectId 引用 + 派生 launchCount）
 *                            ↘ opportunityService（提供关联 opportunity 上下文）
 *                            ↘ llmProvider（生成 PRDDraft）
 *
 * 业务规则：
 *   1. title 1-200 字符
 *   2. 9 个 section 各 1-20000 字符
 *   3. mvpProjectId 必须存在（service 校验）
 *   4. version 由 service 自动管理（创建时递增；不允许外部指定）
 *   5. 同一 (mvpProjectId, version) 唯一
 *   6. id 唯一性
 *   7. createdAt / updatedAt 由调用方提供
 *   8. generatedByMock 由 service 在创建时根据 LLMProvider 实际行为决定
 *      （当前 mock 永远 = true；接入真实 provider 后由 service 接收元数据切换）
 *
 * 与 opportunityService / evaluationService / mvpProjectService 一致：
 * service 保持纯净，不直接调外部 API；所有 AI 走 LLMProvider。
 */

import {
  listPRDs as _repoList,
  listPRDsSorted as _repoListSorted,
  getPRD as _repoGet,
  listPRDsByMVP as _repoListByMVP,
  getNextVersionForMVP as _repoNextVersion,
  getPRDByMVPAndVersion as _repoGetByVersion,
  insertPRD as _repoInsert,
  updatePRDInStore as _repoUpdate,
  deletePRDFromStore as _repoDelete,
} from '@/lib/repos/prd';
import { getMVPProject } from './mvpProjectService';
import { getOpportunity } from './opportunityService';
import { listLaunchResultsByMVP } from '@/lib/repos/mvp';
import { getLLMProvider } from '@/lib/providers';
import type {
  PRD,
  MVPProject,
  Opportunity,
  LaunchResult,
} from '@/types';
import type { PRDDraft, PRDDraftInput } from '@/lib/providers/llm';

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const SECTION_MIN = 1;
const SECTION_MAX = 20000;

const SECTIONS: Array<keyof Pick<
  PRD,
  | 'productPositioning'
  | 'targetUsers'
  | 'corePainPoints'
  | 'mvpFeatureScope'
  | 'pageStructure'
  | 'dataModel'
  | 'apiDesign'
  | 'acceptanceCriteria'
  | 'devPlan'
>> = [
  'productPositioning',
  'targetUsers',
  'corePainPoints',
  'mvpFeatureScope',
  'pageStructure',
  'dataModel',
  'apiDesign',
  'acceptanceCriteria',
  'devPlan',
];

export class PRDServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PRDServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateTitle(title: string | undefined): string {
  if (typeof title !== 'string') {
    throw new PRDServiceError('title is required');
  }
  const v = title.trim();
  if (v.length < TITLE_MIN) {
    throw new PRDServiceError('title cannot be empty');
  }
  if (v.length > TITLE_MAX) {
    throw new PRDServiceError(`title must be ≤ ${TITLE_MAX} characters`);
  }
  return v;
}

function validateSection(
  fieldName: string,
  value: string | undefined,
): string {
  if (typeof value !== 'string') {
    throw new PRDServiceError(`${fieldName} is required`);
  }
  const v = value.trim();
  if (v.length < SECTION_MIN) {
    throw new PRDServiceError(`${fieldName} cannot be empty`);
  }
  if (v.length > SECTION_MAX) {
    throw new PRDServiceError(
      `${fieldName} must be ≤ ${SECTION_MAX} characters`,
    );
  }
  return v;
}

function validateMVPProjectId(id: string | undefined): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new PRDServiceError('mvpProjectId is required');
  }
  return id.trim();
}

async function validateMVPProjectExists(id: string): Promise<MVPProject> {
  const m = await getMVPProject(id);
  if (!m) {
    throw new PRDServiceError(`MVP project not found: ${id}`);
  }
  return m;
}

/* ----------------- Read ----------------- */

export async function listPRDs(): Promise<PRD[]> {
  return _repoListSorted();
}

export async function getPRD(id: string): Promise<PRD | undefined> {
  return _repoGet(id);
}

export async function listPRDsByMVP(mvpProjectId: string): Promise<PRD[]> {
  return _repoListByMVP(mvpProjectId);
}

export async function getLatestPRDForMVP(
  mvpProjectId: string,
): Promise<PRD | undefined> {
  const list = await _repoListByMVP(mvpProjectId);
  if (list.length === 0) return undefined;
  return list[0]; // repo 已按 version desc 排
}

/**
 * 按 mvpProjectId 分组返回所有 PRDs（每组内按 version desc）。
 */
export interface PRDGroup {
  mvpProject: MVPProject;
  prds: PRD[];
}

export async function listPRDsGroupedByMVP(): Promise<PRDGroup[]> {
  const all = await _repoList();
  const byMvp = new Map<string, PRD[]>();
  for (const p of all) {
    const arr = byMvp.get(p.mvpProjectId) ?? [];
    arr.push(p);
    byMvp.set(p.mvpProjectId, arr);
  }
  const out: PRDGroup[] = [];
  for (const [mvpId, prds] of byMvp) {
    const m = await getMVPProject(mvpId);
    if (!m) continue;
    prds.sort((a, b) => b.version - a.version);
    out.push({ mvpProject: m, prds });
  }
  out.sort((a, b) => {
    const la = a.prds[0]?.updatedAt ?? '';
    const lb = b.prds[0]?.updatedAt ?? '';
    return lb.localeCompare(la);
  });
  return out;
}

/* ----------------- Write ----------------- */

export interface CreatePRDInput {
  id: string;
  mvpProjectId: string;
  title: string;
  productPositioning: string;
  targetUsers: string;
  corePainPoints: string;
  mvpFeatureScope: string;
  pageStructure: string;
  dataModel: string;
  apiDesign: string;
  acceptanceCriteria: string;
  devPlan: string;
  generatedByMock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePRDInput {
  title?: string;
  productPositioning?: string;
  targetUsers?: string;
  corePainPoints?: string;
  mvpFeatureScope?: string;
  pageStructure?: string;
  dataModel?: string;
  apiDesign?: string;
  acceptanceCriteria?: string;
  devPlan?: string;
  updatedAt: string;
}

export async function createPRD(input: CreatePRDInput): Promise<PRD> {
  const mvpProjectId = validateMVPProjectId(input.mvpProjectId);
  await validateMVPProjectExists(mvpProjectId);
  const title = validateTitle(input.title);
  const sections: Record<string, string> = {};
  for (const k of SECTIONS) {
    sections[k] = validateSection(k, (input as unknown as Record<string, string | undefined>)[k]);
  }

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new PRDServiceError(`PRD with id "${input.id}" already exists`);
  }

  const version = await _repoNextVersion(mvpProjectId);
  const dup = await _repoGetByVersion(mvpProjectId, version);
  if (dup) {
    throw new PRDServiceError(
      `PRD for MVP ${mvpProjectId} v${version} already exists`,
    );
  }

  const created: PRD = {
    id: input.id,
    mvpProjectId,
    version,
    title,
    productPositioning: sections.productPositioning!,
    targetUsers: sections.targetUsers!,
    corePainPoints: sections.corePainPoints!,
    mvpFeatureScope: sections.mvpFeatureScope!,
    pageStructure: sections.pageStructure!,
    dataModel: sections.dataModel!,
    apiDesign: sections.apiDesign!,
    acceptanceCriteria: sections.acceptanceCriteria!,
    devPlan: sections.devPlan!,
    generatedByMock: input.generatedByMock,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updatePRD(
  id: string,
  patch: UpdatePRDInput,
): Promise<PRD> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new PRDServiceError(`PRD not found: ${id}`);
  }
  const title = patch.title !== undefined ? validateTitle(patch.title) : existing.title;
  const sections: Record<string, string> = {};
  for (const k of SECTIONS) {
    const incoming = (patch as unknown as Record<string, string | undefined>)[k];
    sections[k] = incoming !== undefined ? validateSection(k, incoming) : (existing as unknown as Record<string, string>)[k]!;
  }
  const next: PRD = {
    ...existing,
    title,
    productPositioning: sections.productPositioning!,
    targetUsers: sections.targetUsers!,
    corePainPoints: sections.corePainPoints!,
    mvpFeatureScope: sections.mvpFeatureScope!,
    pageStructure: sections.pageStructure!,
    dataModel: sections.dataModel!,
    apiDesign: sections.apiDesign!,
    acceptanceCriteria: sections.acceptanceCriteria!,
    devPlan: sections.devPlan!,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new PRDServiceError(`failed to persist PRD update: ${id}`);
  }
  return updated;
}

export async function deletePRD(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new PRDServiceError(`PRD not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Draft generation ----------------- */

export interface GeneratePRDOptions {
  /** 由调用方提供 draft id（service 不生成）。 */
  draftId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 调用 LLMProvider 起草 PRD，service 写入存储并返回完整 PRD（含 id / version / 时间戳）。
 */
export async function generatePRDForMVP(
  mvpProjectId: string,
  options: GeneratePRDOptions,
): Promise<PRD> {
  const mvp = await validateMVPProjectExists(mvpProjectId);
  const [opp, launches] = await Promise.all([
    getOpportunity(mvp.opportunityId),
    listLaunchResultsByMVP(mvp.id),
  ]);
  const draft = await callPRDDraft({
    mvp,
    opportunity: opp,
    launches,
  });
  return createPRD({
    id: options.draftId,
    mvpProjectId,
    title: draft.title,
    productPositioning: draft.productPositioning,
    targetUsers: draft.targetUsers,
    corePainPoints: draft.corePainPoints,
    mvpFeatureScope: draft.mvpFeatureScope,
    pageStructure: draft.pageStructure,
    dataModel: draft.dataModel,
    apiDesign: draft.apiDesign,
    acceptanceCriteria: draft.acceptanceCriteria,
    devPlan: draft.devPlan,
    generatedByMock: true,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  });
}

async function callPRDDraft(input: {
  mvp: MVPProject;
  opportunity: Opportunity | undefined;
  launches: LaunchResult[];
}): Promise<PRDDraft> {
  const provider = await getLLMProvider();
  const providerInput: PRDDraftInput = {
    mvpProject: {
      id: input.mvp.id,
      name: input.mvp.name,
      description: input.mvp.description,
      stage: input.mvp.stage,
      startDate: input.mvp.startDate,
    },
    launchCount: input.launches.length,
    ...(input.opportunity
      ? {
          opportunity: {
            id: input.opportunity.id,
            title: input.opportunity.title,
            targetUser: input.opportunity.targetUser,
            painPoint: input.opportunity.painPoint,
            solutionIdea: input.opportunity.solutionIdea,
            status: input.opportunity.status,
          },
        }
      : {}),
  };
  return provider.generatePRDDraft(providerInput);
}
