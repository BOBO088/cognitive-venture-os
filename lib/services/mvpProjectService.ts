/**
 * MVPProjectService — MVP 项目的业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ opportunityRepo（校验 opportunityId 引用）
 *
 * 业务规则：
 *   1. name 1-200 字符
 *   2. description 1-4000 字符
 *   3. owner 1-100 字符（自由文本：人名 / 角色 / 团队）
 *   4. opportunityId 必须存在（service 校验）
 *   5. stage ∈ MVPStage（7 个枚举值）
 *   6. startDate 必填，YYYY-MM-DD
 *   7. launchDate 可选；若提供必须 ≥ startDate
 *   8. revenue ≥ 0（默认 0）
 *   9. cost ≥ 0（默认 0）
 *  10. lessons ≤ 4000 字符
 *  11. stage 流转约束：killed 不可再切到其它 stage；其它 stage 任意切换
 *  12. id 唯一性
 *  13. createdAt / updatedAt 由调用方提供
 *
 * 关联 opportunityId 是**手动管理**——service 只校验引用一致性，不主动派生。
 */

import {
  listMVPProjects as _repoList,
  getMVPProject as _repoGet,
  listMVPProjectsByStage as _repoListByStage,
  listMVPProjectsByOpportunity as _repoListByOpp,
  insertMVPProject as _repoInsert,
  updateMVPProjectInStore as _repoUpdate,
  deleteMVPProjectFromStore as _repoDelete,
} from '@/lib/repos/mvp';
import { getOpportunity } from './opportunityService';
import { MVP_STAGES } from '@/types';
import type { MVPProject, MVPStage, Opportunity } from '@/types';

const NAME_MAX = 200;
const NAME_MIN = 1;
const DESCRIPTION_MAX = 4000;
const DESCRIPTION_MIN = 1;
const OWNER_MAX = 100;
const OWNER_MIN = 1;
const LESSONS_MAX = 4000;
const REVENUE_MAX = 1_000_000_000; // 1B 上限
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class MVPProjectServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MVPProjectServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateName(name: string | undefined): string {
  if (typeof name !== 'string') {
    throw new MVPProjectServiceError('name is required');
  }
  const v = name.trim();
  if (v.length < NAME_MIN) {
    throw new MVPProjectServiceError('name cannot be empty');
  }
  if (v.length > NAME_MAX) {
    throw new MVPProjectServiceError(`name must be ≤ ${NAME_MAX} characters`);
  }
  return v;
}

function validateDescription(description: string | undefined): string {
  if (typeof description !== 'string') {
    throw new MVPProjectServiceError('description is required');
  }
  const v = description.trim();
  if (v.length < DESCRIPTION_MIN) {
    throw new MVPProjectServiceError('description cannot be empty');
  }
  if (v.length > DESCRIPTION_MAX) {
    throw new MVPProjectServiceError(
      `description must be ≤ ${DESCRIPTION_MAX} characters`,
    );
  }
  return v;
}

function validateOwner(owner: string | undefined): string {
  if (typeof owner !== 'string') {
    throw new MVPProjectServiceError('owner is required');
  }
  const v = owner.trim();
  if (v.length < OWNER_MIN) {
    throw new MVPProjectServiceError('owner cannot be empty');
  }
  if (v.length > OWNER_MAX) {
    throw new MVPProjectServiceError(`owner must be ≤ ${OWNER_MAX} characters`);
  }
  return v;
}

function validateStage(stage: string | undefined): MVPStage {
  if (MVP_STAGES.includes(stage as MVPStage)) {
    return stage as MVPStage;
  }
  throw new MVPProjectServiceError(
    `stage must be one of: ${MVP_STAGES.join(', ')}`,
  );
}

function validateDate(
  v: string | undefined,
  fieldName: string,
  required: boolean,
): string | undefined {
  if (v === undefined || v === null || v === '') {
    if (required) {
      throw new MVPProjectServiceError(`${fieldName} is required`);
    }
    return undefined;
  }
  if (typeof v !== 'string' || !DATE_REGEX.test(v)) {
    throw new MVPProjectServiceError(
      `${fieldName} must be in YYYY-MM-DD format`,
    );
  }
  return v;
}

function validateMoney(
  v: number | undefined,
  fieldName: string,
): number {
  if (v === undefined || v === null) return 0;
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new MVPProjectServiceError(`${fieldName} must be a number`);
  }
  if (v < 0) {
    throw new MVPProjectServiceError(`${fieldName} must be ≥ 0`);
  }
  if (v > REVENUE_MAX) {
    throw new MVPProjectServiceError(
      `${fieldName} must be ≤ ${REVENUE_MAX.toLocaleString()}`,
    );
  }
  // 保留 2 位小数
  return Math.round(v * 100) / 100;
}

function validateLessons(lessons: string | undefined): string {
  if (typeof lessons !== 'string') return '';
  if (lessons.length > LESSONS_MAX) {
    throw new MVPProjectServiceError(
      `lessons must be ≤ ${LESSONS_MAX} characters`,
    );
  }
  return lessons;
}

function validateOpportunityId(
  id: string | undefined,
): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new MVPProjectServiceError('opportunityId is required');
  }
  return id.trim();
}

async function validateOpportunityExists(id: string): Promise<Opportunity> {
  const opp = await getOpportunity(id);
  if (!opp) {
    throw new MVPProjectServiceError(`opportunity not found: ${id}`);
  }
  return opp;
}

/**
 * stage 流转校验。
 * - killed 是终态：从任何 stage 切到 killed 都允许，但从 killed 切到其它 stage 拒绝
 * - 其它 stage 任意切换
 */
function assertStageTransition(from: MVPStage, to: MVPStage): void {
  if (from === to) return;
  if (from === 'killed' && to !== 'killed') {
    throw new MVPProjectServiceError(
      `cannot transition from killed to ${to}; killed is terminal`,
    );
  }
}

/* ----------------- Read ----------------- */

export async function listMVPProjects(): Promise<MVPProject[]> {
  const all = await _repoList();
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getMVPProject(
  id: string,
): Promise<MVPProject | undefined> {
  return _repoGet(id);
}

export async function listMVPProjectsFiltered(filter: {
  stage?: MVPStage;
  opportunityId?: string;
}): Promise<MVPProject[]> {
  const all = await _repoList();
  return all
    .filter((m) => (filter.stage ? m.stage === filter.stage : true))
    .filter((m) =>
      filter.opportunityId ? m.opportunityId === filter.opportunityId : true,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listMVPProjectsGroupedByStage(): Promise<
  Record<MVPStage, MVPProject[]>
> {
  const all = await _repoList();
  const out = {} as Record<MVPStage, MVPProject[]>;
  for (const s of MVP_STAGES) out[s] = [];
  for (const m of all) out[m.stage].push(m);
  for (const s of MVP_STAGES) {
    out[s].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return out;
}

export async function listMVPProjectsByOpportunity(
  opportunityId: string,
): Promise<MVPProject[]> {
  return _repoListByOpp(opportunityId);
}

export async function listMVPProjectsByStageService(
  stage: MVPStage,
): Promise<MVPProject[]> {
  return _repoListByStage(stage);
}

/* ----------------- Aggregates ----------------- */

export interface MVPFinancialSummary {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  /** 投资回报率 = (revenue - cost) / cost；cost=0 时为 null。 */
  roi: number | null;
  /** 处于 revenue stage 的项目数。 */
  revenueStageCount: number;
  /** 处于 killed stage 的项目数。 */
  killedStageCount: number;
  /** 总项目数。 */
  projectCount: number;
}

export async function computeFinancialSummary(
  projects?: MVPProject[],
): Promise<MVPFinancialSummary> {
  const all = projects ?? (await _repoList());
  let totalRevenue = 0;
  let totalCost = 0;
  let revenueStageCount = 0;
  let killedStageCount = 0;
  for (const m of all) {
    totalRevenue += m.revenue;
    totalCost += m.cost;
    if (m.stage === 'revenue') revenueStageCount += 1;
    if (m.stage === 'killed') killedStageCount += 1;
  }
  const netProfit = totalRevenue - totalCost;
  const roi = totalCost === 0 ? null : Math.round((netProfit / totalCost) * 1000) / 10;
  return {
    totalRevenue,
    totalCost,
    netProfit,
    roi,
    revenueStageCount,
    killedStageCount,
    projectCount: all.length,
  };
}

/* ----------------- Write ----------------- */

export interface CreateMVPProjectInput {
  id: string;
  opportunityId: string;
  name: string;
  description: string;
  stage: MVPStage;
  owner: string;
  startDate: string;
  launchDate?: string;
  revenue?: number;
  cost?: number;
  lessons?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMVPProjectInput {
  opportunityId?: string;
  name?: string;
  description?: string;
  stage?: MVPStage;
  owner?: string;
  startDate?: string;
  launchDate?: string | null; // null = 清空
  revenue?: number;
  cost?: number;
  lessons?: string;
  updatedAt: string;
}

export async function createMVPProject(
  input: CreateMVPProjectInput,
): Promise<MVPProject> {
  const opportunityId = validateOpportunityId(input.opportunityId);
  await validateOpportunityExists(opportunityId);
  const name = validateName(input.name);
  const description = validateDescription(input.description);
  const stage = validateStage(input.stage);
  const owner = validateOwner(input.owner);
  const startDate = validateDate(input.startDate, 'startDate', true)!;
  const launchDate = validateDate(input.launchDate, 'launchDate', false);
  const revenue = validateMoney(input.revenue, 'revenue');
  const cost = validateMoney(input.cost, 'cost');
  const lessons = validateLessons(input.lessons);

  if (launchDate && launchDate < startDate) {
    throw new MVPProjectServiceError(
      'launchDate must be on or after startDate',
    );
  }

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new MVPProjectServiceError(
      `MVP project with id "${input.id}" already exists`,
    );
  }

  const created: MVPProject = {
    id: input.id,
    opportunityId,
    name,
    description,
    stage,
    owner,
    startDate,
    ...(launchDate ? { launchDate } : {}),
    revenue,
    cost,
    lessons,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateMVPProject(
  id: string,
  patch: UpdateMVPProjectInput,
): Promise<MVPProject> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new MVPProjectServiceError(`MVP project not found: ${id}`);
  }

  const opportunityId =
    patch.opportunityId !== undefined
      ? validateOpportunityId(patch.opportunityId)
      : existing.opportunityId;
  if (patch.opportunityId !== undefined) {
    await validateOpportunityExists(opportunityId);
  }
  const name = patch.name !== undefined ? validateName(patch.name) : existing.name;
  const description =
    patch.description !== undefined
      ? validateDescription(patch.description)
      : existing.description;
  const newStage = patch.stage !== undefined ? validateStage(patch.stage) : existing.stage;
  assertStageTransition(existing.stage, newStage);
  const owner =
    patch.owner !== undefined ? validateOwner(patch.owner) : existing.owner;
  const startDate =
    patch.startDate !== undefined
      ? validateDate(patch.startDate, 'startDate', true)!
      : existing.startDate;
  let launchDate: string | undefined;
  if (patch.launchDate === null) {
    launchDate = undefined;
  } else if (patch.launchDate !== undefined) {
    launchDate = validateDate(patch.launchDate, 'launchDate', false);
  } else {
    launchDate = existing.launchDate;
  }
  if (launchDate && launchDate < startDate) {
    throw new MVPProjectServiceError(
      'launchDate must be on or after startDate',
    );
  }
  const revenue =
    patch.revenue !== undefined
      ? validateMoney(patch.revenue, 'revenue')
      : existing.revenue;
  const cost =
    patch.cost !== undefined ? validateMoney(patch.cost, 'cost') : existing.cost;
  const lessons =
    patch.lessons !== undefined ? validateLessons(patch.lessons) : existing.lessons;

  const next: MVPProject = {
    id: existing.id,
    opportunityId,
    name,
    description,
    stage: newStage,
    owner,
    startDate,
    ...(launchDate ? { launchDate } : {}),
    revenue,
    cost,
    lessons,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new MVPProjectServiceError(
      `failed to persist MVP project update: ${id}`,
    );
  }
  return updated;
}

export async function deleteMVPProject(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new MVPProjectServiceError(`MVP project not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Stage transition shortcut ----------------- */

export async function transitionStage(
  id: string,
  toStage: MVPStage,
  updatedAt: string,
): Promise<MVPProject> {
  const target = validateStage(toStage);
  return updateMVPProject(id, { stage: target, updatedAt });
}
