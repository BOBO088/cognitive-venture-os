/**
 * OpportunityService — 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ graphEntityRepo（校验 relatedEntityIds 引用）
 *                            ↘ researchCardRepo（校验 relatedResearchCardIds 引用）
 *                            ↘ signalRepo（校验 relatedSignalIds 引用）
 *
 * 业务规则：
 *   1. title 1-200 字符
 *   2. description 1-2000 字符
 *   3. painPoint 1-2000 字符
 *   4. solutionIdea 1-2000 字符
 *   5. targetUser 1-500 字符
 *   6. status ∈ 6 个 OpportunityStatus
 *   7. relatedSignalIds / relatedResearchCardIds / relatedEntityIds
 *      各自去重 + 上限 50 + 引用必须存在于对应域（service 校验）
 *   8. id 唯一性
 *   9. createdAt / updatedAt 由调用方提供
 *
 * 关联三个域（Signal / Card / Entity）都是**手动管理**——
 * UI 提供 bind/unbind 控件，service 只校验引用一致性。
 */

import {
  listOpportunities as _repoList,
  getOpportunity as _repoGet,
  listOpportunitiesByStatus as _repoListByStatus,
  insertOpportunity as _repoInsert,
  updateOpportunityInStore as _repoUpdate,
  deleteOpportunityFromStore as _repoDelete,
} from '@/lib/repos/opportunities';
import { getSignal } from '@/lib/repos/opportunities';
import { getGraphEntity } from '@/lib/repos/knowledge-graph';
import { getResearchCard } from '@/lib/repos/research';
import { OPPORTUNITY_STATUSES } from '@/types';
import type {
  Opportunity,
  OpportunityStatus,
} from '@/types';

const TITLE_MAX = 200;
const TARGET_USER_MAX = 500;
const DESCRIPTION_MAX = 2000;
const PAIN_POINT_MAX = 2000;
const SOLUTION_IDEA_MAX = 2000;
const LINKED_MAX = 50;

export class OpportunityServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpportunityServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateTitle(t: string | undefined): string {
  if (typeof t !== 'string') {
    throw new OpportunityServiceError('title is required');
  }
  const v = t.trim();
  if (v.length === 0) {
    throw new OpportunityServiceError('title cannot be empty');
  }
  if (v.length > TITLE_MAX) {
    throw new OpportunityServiceError(`title must be ≤ ${TITLE_MAX} characters`);
  }
  return v;
}

function validateStringField(
  value: string | undefined,
  fieldName: string,
  max: number,
  required: boolean,
): string {
  if (value === undefined || value === null) {
    if (required) {
      throw new OpportunityServiceError(`${fieldName} is required`);
    }
    return '';
  }
  if (typeof value !== 'string') {
    throw new OpportunityServiceError(`${fieldName} must be a string`);
  }
  if (value.length > max) {
    throw new OpportunityServiceError(`${fieldName} must be ≤ ${max} characters`);
  }
  return value;
}

function validateStatus(status: string | undefined): OpportunityStatus {
  if (OPPORTUNITY_STATUSES.includes(status as OpportunityStatus)) {
    return status as OpportunityStatus;
  }
  throw new OpportunityServiceError(
    `status must be one of: ${OPPORTUNITY_STATUSES.join(', ')}`,
  );
}

function dedupAndCap(ids: string[] | undefined, fieldName: string): string[] {
  if (!ids) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length > LINKED_MAX) {
      throw new OpportunityServiceError(`${fieldName} cannot exceed ${LINKED_MAX} unique ids`);
    }
  }
  return out;
}

async function validateSignalIds(ids: string[]): Promise<string[]> {
  for (const id of ids) {
    const s = await getSignal(id);
    if (!s) {
      throw new OpportunityServiceError(`relatedSignalIds references missing signal: ${id}`);
    }
  }
  return ids;
}

async function validateCardIds(ids: string[]): Promise<string[]> {
  for (const id of ids) {
    const c = await getResearchCard(id);
    if (!c) {
      throw new OpportunityServiceError(
        `relatedResearchCardIds references missing card: ${id}`,
      );
    }
  }
  return ids;
}

async function validateEntityIds(ids: string[]): Promise<string[]> {
  for (const id of ids) {
    const e = await getGraphEntity(id);
    if (!e) {
      throw new OpportunityServiceError(`relatedEntityIds references missing entity: ${id}`);
    }
  }
  return ids;
}

/* ----------------- Read ----------------- */

export async function listOpportunities(): Promise<Opportunity[]> {
  return _repoList();
}

export async function getOpportunity(id: string): Promise<Opportunity | undefined> {
  return _repoGet(id);
}

export async function listOpportunitiesByStatus(
  status: OpportunityStatus,
): Promise<Opportunity[]> {
  return _repoListByStatus(status);
}

export async function listOpportunitiesFiltered(filter: {
  status?: OpportunityStatus;
}): Promise<Opportunity[]> {
  const all = await _repoList();
  return all
    .filter((o) => (filter.status ? o.status === filter.status : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/* ----------------- Write ----------------- */

export interface CreateOpportunityInput {
  id: string;
  title: string;
  description: string;
  targetUser: string;
  painPoint: string;
  solutionIdea: string;
  status: OpportunityStatus;
  relatedSignalIds?: string[];
  relatedResearchCardIds?: string[];
  relatedEntityIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOpportunityInput {
  title?: string;
  description?: string;
  targetUser?: string;
  painPoint?: string;
  solutionIdea?: string;
  status?: OpportunityStatus;
  relatedSignalIds?: string[];
  relatedResearchCardIds?: string[];
  relatedEntityIds?: string[];
  updatedAt: string;
}

export async function createOpportunity(
  input: CreateOpportunityInput,
): Promise<Opportunity> {
  const title = validateTitle(input.title);
  const description = validateStringField(
    input.description, 'description', DESCRIPTION_MAX, true,
  );
  const targetUser = validateStringField(
    input.targetUser, 'targetUser', TARGET_USER_MAX, true,
  );
  const painPoint = validateStringField(
    input.painPoint, 'painPoint', PAIN_POINT_MAX, true,
  );
  const solutionIdea = validateStringField(
    input.solutionIdea, 'solutionIdea', SOLUTION_IDEA_MAX, true,
  );
  const status = validateStatus(input.status);
  const relatedSignalIds = await validateSignalIds(
    dedupAndCap(input.relatedSignalIds, 'relatedSignalIds'),
  );
  const relatedResearchCardIds = await validateCardIds(
    dedupAndCap(input.relatedResearchCardIds, 'relatedResearchCardIds'),
  );
  const relatedEntityIds = await validateEntityIds(
    dedupAndCap(input.relatedEntityIds, 'relatedEntityIds'),
  );

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new OpportunityServiceError(
      `opportunity with id "${input.id}" already exists`,
    );
  }

  const created: Opportunity = {
    id: input.id,
    title,
    description,
    targetUser,
    painPoint,
    solutionIdea,
    status,
    relatedSignalIds,
    relatedResearchCardIds,
    relatedEntityIds,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateOpportunity(
  id: string,
  patch: UpdateOpportunityInput,
): Promise<Opportunity> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new OpportunityServiceError(`opportunity not found: ${id}`);
  }
  const title = patch.title !== undefined ? validateTitle(patch.title) : existing.title;
  const description = patch.description !== undefined
    ? validateStringField(patch.description, 'description', DESCRIPTION_MAX, true)
    : existing.description;
  const targetUser = patch.targetUser !== undefined
    ? validateStringField(patch.targetUser, 'targetUser', TARGET_USER_MAX, true)
    : existing.targetUser;
  const painPoint = patch.painPoint !== undefined
    ? validateStringField(patch.painPoint, 'painPoint', PAIN_POINT_MAX, true)
    : existing.painPoint;
  const solutionIdea = patch.solutionIdea !== undefined
    ? validateStringField(patch.solutionIdea, 'solutionIdea', SOLUTION_IDEA_MAX, true)
    : existing.solutionIdea;
  const status = patch.status !== undefined ? validateStatus(patch.status) : existing.status;
  const relatedSignalIds = patch.relatedSignalIds !== undefined
    ? await validateSignalIds(dedupAndCap(patch.relatedSignalIds, 'relatedSignalIds'))
    : existing.relatedSignalIds;
  const relatedResearchCardIds = patch.relatedResearchCardIds !== undefined
    ? await validateCardIds(dedupAndCap(patch.relatedResearchCardIds, 'relatedResearchCardIds'))
    : existing.relatedResearchCardIds;
  const relatedEntityIds = patch.relatedEntityIds !== undefined
    ? await validateEntityIds(dedupAndCap(patch.relatedEntityIds, 'relatedEntityIds'))
    : existing.relatedEntityIds;

  const next: Opportunity = {
    id: existing.id,
    title,
    description,
    targetUser,
    painPoint,
    solutionIdea,
    status,
    relatedSignalIds,
    relatedResearchCardIds,
    relatedEntityIds,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(existing.id, next);
  if (!updated) {
    throw new OpportunityServiceError(`failed to persist opportunity update: ${id}`);
  }
  return updated;
}

export async function deleteOpportunity(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new OpportunityServiceError(`opportunity not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Bind / Unbind ----------------- */

async function addToLinkedList(
  opportunityId: string,
  fieldName: 'relatedSignalIds' | 'relatedResearchCardIds' | 'relatedEntityIds',
  value: string,
  validator: (id: string) => Promise<unknown>,
): Promise<Opportunity> {
  const opp = await _repoGet(opportunityId);
  if (!opp) {
    throw new OpportunityServiceError(`opportunity not found: ${opportunityId}`);
  }
  const list = opp[fieldName];
  if (list.includes(value)) return opp;
  if (list.length >= LINKED_MAX) {
    throw new OpportunityServiceError(
      `${fieldName} cannot exceed ${LINKED_MAX}`,
    );
  }
  await validator(value);
  return updateOpportunity(opportunityId, {
    [fieldName]: [...list, value],
    updatedAt: new Date().toISOString(),
  });
}

async function removeFromLinkedList(
  opportunityId: string,
  fieldName: 'relatedSignalIds' | 'relatedResearchCardIds' | 'relatedEntityIds',
  value: string,
): Promise<Opportunity> {
  const opp = await _repoGet(opportunityId);
  if (!opp) {
    throw new OpportunityServiceError(`opportunity not found: ${opportunityId}`);
  }
  if (!opp[fieldName].includes(value)) return opp;
  return updateOpportunity(opportunityId, {
    [fieldName]: opp[fieldName].filter((x) => x !== value),
    updatedAt: new Date().toISOString(),
  });
}

export function bindSignalToOpportunity(
  opportunityId: string,
  signalId: string,
): Promise<Opportunity> {
  return addToLinkedList(opportunityId, 'relatedSignalIds', signalId, (id) =>
    getSignal(id).then((s) => {
      if (!s) {
        throw new OpportunityServiceError(`signal not found: ${id}`);
      }
    }),
  );
}

export function unbindSignalFromOpportunity(
  opportunityId: string,
  signalId: string,
): Promise<Opportunity> {
  return removeFromLinkedList(opportunityId, 'relatedSignalIds', signalId);
}

export function bindCardToOpportunity(
  opportunityId: string,
  cardId: string,
): Promise<Opportunity> {
  return addToLinkedList(opportunityId, 'relatedResearchCardIds', cardId, async (id) => {
    const c = await getResearchCard(id);
    if (!c) {
      throw new OpportunityServiceError(`research card not found: ${id}`);
    }
  });
}

export function unbindCardFromOpportunity(
  opportunityId: string,
  cardId: string,
): Promise<Opportunity> {
  return removeFromLinkedList(opportunityId, 'relatedResearchCardIds', cardId);
}

export function bindEntityToOpportunity(
  opportunityId: string,
  entityId: string,
): Promise<Opportunity> {
  return addToLinkedList(opportunityId, 'relatedEntityIds', entityId, async (id) => {
    const e = await getGraphEntity(id);
    if (!e) {
      throw new OpportunityServiceError(`graph entity not found: ${id}`);
    }
  });
}

export function unbindEntityFromOpportunity(
  opportunityId: string,
  entityId: string,
): Promise<Opportunity> {
  return removeFromLinkedList(opportunityId, 'relatedEntityIds', entityId);
}
