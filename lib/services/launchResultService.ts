/**
 * LaunchResultService — 上线结果的业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ mvpProjectService（校验 mvpProjectId 引用）
 *
 * 业务规则：
 *   1. mvpProjectId 必须存在（service 校验）
 *   2. launchDate 必填，YYYY-MM-DD
 *   3. users / signups / traffic / revenue ≥ 0
 *   4. conversionRate / retentionRate ∈ [0, 100]
 *   5. resultStatus ∈ LAUNCH_RESULT_STATUSES
 *   6. resultStatus 未指定时按 inferLaunchResultStatus 自动判定
 *   7. feedbackSummary ≤ 4000 字符
 *   8. id 唯一性
 *   9. createdAt / updatedAt 由调用方提供
 *
 * 关联 mvpProjectId 是引用关系——service 只校验引用一致性，
 * 不主动派生。LaunchResult 与 LessonLearned 不再互相引用 id 列表，
 * Lesson 通过 launchResultId 反查。
 */

import {
  listLaunchResults as _repoList,
  listLaunchResultsSorted as _repoListSorted,
  getLaunchResult as _repoGet,
  listLaunchResultsByMVP as _repoListByMVP,
  insertLaunchResult as _repoInsert,
  updateLaunchResultInStore as _repoUpdate,
  deleteLaunchResultFromStore as _repoDelete,
} from '@/lib/repos/mvp';
import { getMVPProject } from './mvpProjectService';
import {
  LAUNCH_RESULT_STATUSES,
  inferLaunchResultStatus,
} from '@/types';
import type {
  LaunchResult,
  LaunchResultStatus,
  MVPProject,
} from '@/types';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const FEEDBACK_MAX = 4000;
const MONEY_MAX = 1_000_000_000;

export class LaunchResultServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LaunchResultServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateMvpProjectId(id: string | undefined): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new LaunchResultServiceError('mvpProjectId is required');
  }
  return id.trim();
}

async function validateMvpProjectExists(id: string): Promise<MVPProject> {
  const m = await getMVPProject(id);
  if (!m) {
    throw new LaunchResultServiceError(`MVP project not found: ${id}`);
  }
  return m;
}

function validateLaunchDate(v: string | undefined): string {
  if (typeof v !== 'string' || !DATE_REGEX.test(v)) {
    throw new LaunchResultServiceError(
      'launchDate must be in YYYY-MM-DD format',
    );
  }
  return v;
}

function validateNonNegativeInt(
  v: number | undefined,
  fieldName: string,
): number {
  if (v === undefined || v === null) return 0;
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) {
    throw new LaunchResultServiceError(`${fieldName} must be a number`);
  }
  if (v < 0) {
    throw new LaunchResultServiceError(`${fieldName} must be ≥ 0`);
  }
  if (v > MONEY_MAX) {
    throw new LaunchResultServiceError(
      `${fieldName} must be ≤ ${MONEY_MAX.toLocaleString()}`,
    );
  }
  return Math.round(v);
}

function validatePercent(
  v: number | undefined,
  fieldName: string,
): number {
  if (v === undefined || v === null) return 0;
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) {
    throw new LaunchResultServiceError(`${fieldName} must be a number`);
  }
  if (v < 0 || v > 100) {
    throw new LaunchResultServiceError(
      `${fieldName} must be between 0 and 100`,
    );
  }
  return Math.round(v * 10) / 10;
}

function validateResultStatus(
  v: LaunchResultStatus | undefined,
): LaunchResultStatus {
  if (v === undefined) return 'unknown';
  if (LAUNCH_RESULT_STATUSES.includes(v)) return v;
  throw new LaunchResultServiceError(
    `resultStatus must be one of: ${LAUNCH_RESULT_STATUSES.join(', ')}`,
  );
}

function validateFeedback(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') {
    throw new LaunchResultServiceError('feedbackSummary must be a string');
  }
  if (v.length > FEEDBACK_MAX) {
    throw new LaunchResultServiceError(
      `feedbackSummary must be ≤ ${FEEDBACK_MAX} characters`,
    );
  }
  return v;
}

/* ----------------- Read ----------------- */

export async function listLaunchResults(): Promise<LaunchResult[]> {
  return _repoListSorted();
}

export async function getLaunchResult(
  id: string,
): Promise<LaunchResult | undefined> {
  return _repoGet(id);
}

export async function listLaunchResultsByMVP(
  mvpProjectId: string,
): Promise<LaunchResult[]> {
  return _repoListByMVP(mvpProjectId);
}

export async function listLaunchResultsFiltered(filter: {
  mvpProjectId?: string;
}): Promise<LaunchResult[]> {
  const all = await _repoListSorted();
  return all.filter((r) =>
    filter.mvpProjectId ? r.mvpProjectId === filter.mvpProjectId : true,
  );
}

/* ----------------- Aggregates ----------------- */

export interface LaunchResultStats {
  totalLaunches: number;
  successCount: number;
  neutralCount: number;
  failedCount: number;
  unknownCount: number;
  totalRevenue: number;
  totalSignups: number;
}

export async function computeLaunchResultStats(
  results?: LaunchResult[],
): Promise<LaunchResultStats> {
  const all = results ?? (await _repoList());
  let successCount = 0;
  let neutralCount = 0;
  let failedCount = 0;
  let unknownCount = 0;
  let totalRevenue = 0;
  let totalSignups = 0;
  for (const r of all) {
    if (r.resultStatus === 'success') successCount += 1;
    else if (r.resultStatus === 'neutral') neutralCount += 1;
    else if (r.resultStatus === 'failed') failedCount += 1;
    else unknownCount += 1;
    totalRevenue += r.revenue;
    totalSignups += r.signups;
  }
  return {
    totalLaunches: all.length,
    successCount,
    neutralCount,
    failedCount,
    unknownCount,
    totalRevenue,
    totalSignups,
  };
}

/* ----------------- Write ----------------- */

export interface CreateLaunchResultInput {
  id: string;
  mvpProjectId: string;
  launchDate: string;
  users: number;
  signups: number;
  revenue: number;
  traffic: number;
  conversionRate: number;
  retentionRate: number;
  feedbackSummary?: string;
  resultStatus?: LaunchResultStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLaunchResultInput {
  mvpProjectId?: string;
  launchDate?: string;
  users?: number;
  signups?: number;
  revenue?: number;
  traffic?: number;
  conversionRate?: number;
  retentionRate?: number;
  feedbackSummary?: string;
  resultStatus?: LaunchResultStatus;
  updatedAt: string;
}

export async function createLaunchResult(
  input: CreateLaunchResultInput,
): Promise<LaunchResult> {
  const mvpProjectId = validateMvpProjectId(input.mvpProjectId);
  await validateMvpProjectExists(mvpProjectId);
  const launchDate = validateLaunchDate(input.launchDate);
  const users = validateNonNegativeInt(input.users, 'users');
  const signups = validateNonNegativeInt(input.signups, 'signups');
  const revenue = validateNonNegativeInt(input.revenue, 'revenue');
  const traffic = validateNonNegativeInt(input.traffic, 'traffic');
  const conversionRate = validatePercent(
    input.conversionRate,
    'conversionRate',
  );
  const retentionRate = validatePercent(
    input.retentionRate,
    'retentionRate',
  );
  const feedbackSummary = validateFeedback(input.feedbackSummary);
  const resultStatus = validateResultStatus(input.resultStatus);

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new LaunchResultServiceError(
      `Launch result with id "${input.id}" already exists`,
    );
  }

  // 若调用方未指定 resultStatus，按阈值自动判定
  const finalStatus: LaunchResultStatus =
    input.resultStatus === undefined
      ? inferLaunchResultStatus({ conversionRate, retentionRate, signups })
      : resultStatus;

  const created: LaunchResult = {
    id: input.id,
    mvpProjectId,
    launchDate,
    users,
    signups,
    revenue,
    traffic,
    conversionRate,
    retentionRate,
    ...(feedbackSummary ? { feedbackSummary } : {}),
    resultStatus: finalStatus,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateLaunchResult(
  id: string,
  patch: UpdateLaunchResultInput,
): Promise<LaunchResult> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new LaunchResultServiceError(`Launch result not found: ${id}`);
  }

  let mvpProjectId = existing.mvpProjectId;
  if (patch.mvpProjectId !== undefined) {
    mvpProjectId = validateMvpProjectId(patch.mvpProjectId);
    await validateMvpProjectExists(mvpProjectId);
  }
  const launchDate =
    patch.launchDate !== undefined
      ? validateLaunchDate(patch.launchDate)
      : existing.launchDate;
  const users =
    patch.users !== undefined
      ? validateNonNegativeInt(patch.users, 'users')
      : existing.users;
  const signups =
    patch.signups !== undefined
      ? validateNonNegativeInt(patch.signups, 'signups')
      : existing.signups;
  const revenue =
    patch.revenue !== undefined
      ? validateNonNegativeInt(patch.revenue, 'revenue')
      : existing.revenue;
  const traffic =
    patch.traffic !== undefined
      ? validateNonNegativeInt(patch.traffic, 'traffic')
      : existing.traffic;
  const conversionRate =
    patch.conversionRate !== undefined
      ? validatePercent(patch.conversionRate, 'conversionRate')
      : existing.conversionRate;
  const retentionRate =
    patch.retentionRate !== undefined
      ? validatePercent(patch.retentionRate, 'retentionRate')
      : existing.retentionRate;
  const feedbackSummary =
    patch.feedbackSummary !== undefined
      ? validateFeedback(patch.feedbackSummary)
      : existing.feedbackSummary;
  const resultStatus =
    patch.resultStatus !== undefined
      ? validateResultStatus(patch.resultStatus)
      : existing.resultStatus;

  const next: LaunchResult = {
    id: existing.id,
    mvpProjectId,
    launchDate,
    users,
    signups,
    revenue,
    traffic,
    conversionRate,
    retentionRate,
    ...(feedbackSummary ? { feedbackSummary } : {}),
    resultStatus,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new LaunchResultServiceError(
      `failed to persist launch result update: ${id}`,
    );
  }
  return updated;
}

export async function deleteLaunchResult(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new LaunchResultServiceError(`Launch result not found: ${id}`);
  }
  await _repoDelete(id);
}
