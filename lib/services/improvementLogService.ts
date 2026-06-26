/**
 * ImprovementLogService — 改进建议的业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ promptVersionService（校验 targetId 当 type=prompt）
 *                            ↘ loopVersionService（校验 targetId 当 type=loop）
 *
 * 业务规则：
 *   1. targetType ∈ IMPROVEMENT_TARGET_TYPES
 *   2. targetId：
 *        - type=prompt → 必须指向存在的 PromptVersion
 *        - type=loop → 必须指向存在的 LoopVersion
 *        - type=score_model / other → 任意 sentinel 字符串
 *   3. problem 1-4000 字符
 *   4. suggestion 1-4000 字符
 *   5. result 0-4000 字符（可空：尚未应用）
 *   6. id 唯一性
 */

import {
  listImprovementLogs as _repoList,
  listImprovementLogsSorted as _repoListSorted,
  listImprovementLogsByTarget as _repoListByTarget,
  getImprovementLog as _repoGet,
  insertImprovementLog as _repoInsert,
  updateImprovementLogInStore as _repoUpdate,
  deleteImprovementLogFromStore as _repoDelete,
} from '@/lib/repos/iteration';
import { getPromptVersion } from './promptVersionService';
import { getLoopVersion } from './loopVersionService';
import { IMPROVEMENT_TARGET_TYPES } from '@/types';
import type {
  ImprovementLog,
  ImprovementTargetType,
} from '@/types';

const TEXT_MAX = 4000;
const TARGET_ID_MAX = 200;

export class ImprovementLogServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImprovementLogServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateTargetType(v: string | undefined): ImprovementTargetType {
  if (IMPROVEMENT_TARGET_TYPES.includes(v as ImprovementTargetType)) {
    return v as ImprovementTargetType;
  }
  throw new ImprovementLogServiceError(
    `targetType must be one of: ${IMPROVEMENT_TARGET_TYPES.join(', ')}`,
  );
}

function validateTargetId(v: string | undefined): string {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new ImprovementLogServiceError('targetId is required');
  }
  const t = v.trim();
  if (t.length > TARGET_ID_MAX) {
    throw new ImprovementLogServiceError(
      `targetId must be ≤ ${TARGET_ID_MAX} characters`,
    );
  }
  return t;
}

async function validateTargetExists(
  targetType: ImprovementTargetType,
  targetId: string,
): Promise<void> {
  if (targetType === 'prompt') {
    const p = await getPromptVersion(targetId);
    if (!p) {
      throw new ImprovementLogServiceError(
        `Target prompt not found: ${targetId}`,
      );
    }
  } else if (targetType === 'loop') {
    const l = await getLoopVersion(targetId);
    if (!l) {
      throw new ImprovementLogServiceError(
        `Target loop not found: ${targetId}`,
      );
    }
  }
  // score_model / other: 任意 sentinel，无校验
}

function validateText(
  v: string | undefined,
  fieldName: string,
  required: boolean,
): string {
  if (v === undefined || v === null) {
    if (required) {
      throw new ImprovementLogServiceError(`${fieldName} is required`);
    }
    return '';
  }
  if (typeof v !== 'string') {
    throw new ImprovementLogServiceError(`${fieldName} must be a string`);
  }
  if (v.length === 0 && required) {
    throw new ImprovementLogServiceError(`${fieldName} is required`);
  }
  if (v.length > TEXT_MAX) {
    throw new ImprovementLogServiceError(
      `${fieldName} must be ≤ ${TEXT_MAX} characters`,
    );
  }
  return v;
}

/* ----------------- Read ----------------- */

export async function listImprovementLogs(): Promise<ImprovementLog[]> {
  return _repoListSorted();
}

export async function getImprovementLog(
  id: string,
): Promise<ImprovementLog | undefined> {
  return _repoGet(id);
}

export async function listImprovementLogsByTarget(
  targetId: string,
): Promise<ImprovementLog[]> {
  return _repoListByTarget(targetId);
}

export async function listImprovementLogsFiltered(filter: {
  targetType?: ImprovementTargetType;
  targetId?: string;
}): Promise<ImprovementLog[]> {
  const all = await _repoListSorted();
  return all
    .filter((l) =>
      filter.targetType ? l.targetType === filter.targetType : true,
    )
    .filter((l) => (filter.targetId ? l.targetId === filter.targetId : true));
}

/* ----------------- Aggregates ----------------- */

export interface ImprovementLogStats {
  totalLogs: number;
  byTargetType: Record<ImprovementTargetType, number>;
  appliedCount: number;
  pendingCount: number;
}

export async function computeImprovementLogStats(
  logs?: ImprovementLog[],
): Promise<ImprovementLogStats> {
  const all = logs ?? (await _repoList());
  const byTargetType = {} as Record<ImprovementTargetType, number>;
  for (const t of IMPROVEMENT_TARGET_TYPES) byTargetType[t] = 0;
  let appliedCount = 0;
  let pendingCount = 0;
  for (const l of all) {
    byTargetType[l.targetType] = (byTargetType[l.targetType] ?? 0) + 1;
    if (l.result.trim().length > 0) appliedCount += 1;
    else pendingCount += 1;
  }
  return {
    totalLogs: all.length,
    byTargetType,
    appliedCount,
    pendingCount,
  };
}

/* ----------------- Write ----------------- */

export interface CreateImprovementLogInput {
  id: string;
  targetType: ImprovementTargetType;
  targetId: string;
  problem: string;
  suggestion: string;
  result: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateImprovementLogInput {
  targetType?: ImprovementTargetType;
  targetId?: string;
  problem?: string;
  suggestion?: string;
  result?: string;
  updatedAt: string;
}

export async function createImprovementLog(
  input: CreateImprovementLogInput,
): Promise<ImprovementLog> {
  const targetType = validateTargetType(input.targetType);
  const targetId = validateTargetId(input.targetId);
  await validateTargetExists(targetType, targetId);
  const problem = validateText(input.problem, 'problem', true);
  const suggestion = validateText(input.suggestion, 'suggestion', true);
  const result = validateText(input.result, 'result', false);

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new ImprovementLogServiceError(
      `Improvement log with id "${input.id}" already exists`,
    );
  }

  const created: ImprovementLog = {
    id: input.id,
    targetType,
    targetId,
    problem,
    suggestion,
    result,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateImprovementLog(
  id: string,
  patch: UpdateImprovementLogInput,
): Promise<ImprovementLog> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new ImprovementLogServiceError(
      `Improvement log not found: ${id}`,
    );
  }
  const targetType =
    patch.targetType !== undefined
      ? validateTargetType(patch.targetType)
      : existing.targetType;
  let targetId: string = existing.targetId;
  if (patch.targetId !== undefined || patch.targetType !== undefined) {
    targetId = validateTargetId(patch.targetId ?? existing.targetId);
    await validateTargetExists(targetType, targetId);
  }
  const problem =
    patch.problem !== undefined
      ? validateText(patch.problem, 'problem', true)
      : existing.problem;
  const suggestion =
    patch.suggestion !== undefined
      ? validateText(patch.suggestion, 'suggestion', true)
      : existing.suggestion;
  const result =
    patch.result !== undefined
      ? validateText(patch.result, 'result', false)
      : existing.result;

  const next: ImprovementLog = {
    id: existing.id,
    targetType,
    targetId,
    problem,
    suggestion,
    result,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new ImprovementLogServiceError(
      `failed to persist improvement log update: ${id}`,
    );
  }
  return updated;
}

export async function deleteImprovementLog(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new ImprovementLogServiceError(
      `Improvement log not found: ${id}`,
    );
  }
  await _repoDelete(id);
}
