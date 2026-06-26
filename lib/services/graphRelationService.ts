/**
 * GraphRelationService — 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ graphEntityRepo（校验 source/target 引用）
 *                            ↘ researchCardRepo（提供 card 列表给 bind UI）
 *
 * 业务规则：
 *   1. sourceEntityId / targetEntityId 必填，引用必须存在
 *   2. sourceEntityId !== targetEntityId（禁止 self-loop）
 *   3. relationType 必填，必须 ∈ 12 个 GraphRelationKind
 *   4. strength ∈ [0, 100] 整数
 *   5. evidence optional 字符串
 *   6. linkedResearchCardIds 由 service 在 update 时归一化（去重 / 上限 50）
 *      并**手动管理**（不派生）—— 与 entity 上的同名字段策略不同
 *
 * 切到 Supabase：只改 repo，service 零改动。
 */

import {
  listGraphRelations as _repoList,
  getGraphRelation as _repoGet,
  listGraphRelationsByType as _repoListByType,
  listGraphRelationsByEntity as _repoListByEntity,
  createGraphRelation as _repoCreate,
  updateGraphRelation as _repoUpdate,
  deleteGraphRelation as _repoDelete,
  type CreateGraphRelationInput,
  type UpdateGraphRelationInput,
} from '@/lib/repos/knowledge-graph';
import { getGraphEntity } from '@/lib/repos/knowledge-graph';
import {
  RELATION_STRENGTH_MIN,
  RELATION_STRENGTH_MAX,
} from '@/types';
import type {
  GraphRelation,
  GraphRelationKind,
} from '@/types';

const LINKED_CARDS_MAX = 50;
const EVIDENCE_MAX = 2000;

const VALID_KINDS: GraphRelationKind[] = [
  'competes_with', 'invested_by', 'built_by', 'uses',
  'belongs_to', 'growing_in', 'mentioned_in', 'supports',
  'contradicts', 'influences', 'similar_to', 'alternative_to',
];

export class GraphRelationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphRelationServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateKind(kind: string | undefined): GraphRelationKind {
  if (VALID_KINDS.includes(kind as GraphRelationKind)) {
    return kind as GraphRelationKind;
  }
  throw new GraphRelationServiceError(
    `relationType must be one of: ${VALID_KINDS.join(', ')}`,
  );
}

function validateStrength(strength: number | undefined): number {
  if (strength === undefined || strength === null) {
    throw new GraphRelationServiceError('strength is required');
  }
  if (typeof strength !== 'number' || Number.isNaN(strength)) {
    throw new GraphRelationServiceError('strength must be a number');
  }
  if (strength < RELATION_STRENGTH_MIN || strength > RELATION_STRENGTH_MAX) {
    throw new GraphRelationServiceError(
      `strength must be in [${RELATION_STRENGTH_MIN}, ${RELATION_STRENGTH_MAX}]`,
    );
  }
  return Math.round(strength);
}

function validateEvidence(evidence: string | undefined): string | undefined {
  if (evidence === undefined) return undefined;
  const trimmed = evidence.trim();
  if (trimmed === '') return undefined;
  if (trimmed.length > EVIDENCE_MAX) {
    throw new GraphRelationServiceError(`evidence must be ≤ ${EVIDENCE_MAX} chars`);
  }
  return trimmed;
}

function normalizeLinkedCards(ids: string[] | undefined): string[] {
  if (!ids) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const t = raw.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= LINKED_CARDS_MAX) break;
  }
  return out;
}

async function validateEntityRef(entityId: string | undefined, label: string): Promise<string> {
  if (!entityId) {
    throw new GraphRelationServiceError(`${label} is required`);
  }
  const e = await getGraphEntity(entityId);
  if (!e) {
    throw new GraphRelationServiceError(`${label} references unknown entity: ${entityId}`);
  }
  return entityId;
}

function validateNoSelfLoop(source: string, target: string): void {
  if (source === target) {
    throw new GraphRelationServiceError(
      'sourceEntityId and targetEntityId must be different (self-loop not allowed)',
    );
  }
}

/* ============================================================ */
/* Read 入口                                                       */
/* ============================================================ */

export async function listRelations(): Promise<GraphRelation[]> {
  return _repoList();
}

export async function getRelation(id: string): Promise<GraphRelation | undefined> {
  return _repoGet(id);
}

export async function listRelationsByType(type: GraphRelationKind): Promise<GraphRelation[]> {
  return _repoListByType(type);
}

export async function listRelationsByEntity(entityId: string): Promise<GraphRelation[]> {
  return _repoListByEntity(entityId);
}

/**
 * 组合筛选：type + 至少一端包含某 entity + 强度下限。
 */
export async function listRelationsFiltered(filter: {
  relationType?: GraphRelationKind;
  entityId?: string;
  minStrength?: number;
}): Promise<GraphRelation[]> {
  const all = await _repoList();
  return all.filter((r) => {
    if (filter.relationType && r.relationType !== filter.relationType) return false;
    if (
      filter.entityId &&
      r.sourceEntityId !== filter.entityId &&
      r.targetEntityId !== filter.entityId
    ) {
      return false;
    }
    if (filter.minStrength !== undefined && r.strength < filter.minStrength) {
      return false;
    }
    return true;
  });
}

/* ============================================================ */
/* Write 入口                                                      */
/* ============================================================ */

export async function createRelation(input: CreateGraphRelationInput): Promise<GraphRelation> {
  const sourceEntityId = await validateEntityRef(input.sourceEntityId, 'sourceEntityId');
  const targetEntityId = await validateEntityRef(input.targetEntityId, 'targetEntityId');
  validateNoSelfLoop(sourceEntityId, targetEntityId);
  const relationType = validateKind(input.relationType);
  const strength = validateStrength(input.strength);
  const evidence = validateEvidence(input.evidence);
  const linkedResearchCardIds = normalizeLinkedCards(input.linkedResearchCardIds);

  return _repoCreate({
    sourceEntityId,
    targetEntityId,
    relationType,
    strength,
    evidence,
    linkedResearchCardIds,
  });
}

export async function updateRelation(
  id: string,
  patch: UpdateGraphRelationInput,
): Promise<GraphRelation> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new GraphRelationServiceError(`relation not found: ${id}`);
  }
  if (patch.sourceEntityId !== undefined) {
    patch.sourceEntityId = await validateEntityRef(patch.sourceEntityId, 'sourceEntityId');
  }
  if (patch.targetEntityId !== undefined) {
    patch.targetEntityId = await validateEntityRef(patch.targetEntityId, 'targetEntityId');
  }
  if (
    patch.sourceEntityId !== undefined &&
    patch.targetEntityId !== undefined
  ) {
    validateNoSelfLoop(patch.sourceEntityId, patch.targetEntityId);
  } else if (patch.sourceEntityId !== undefined || patch.targetEntityId !== undefined) {
    // 增量更新：与未改的另一边比较
    const newSource = patch.sourceEntityId ?? existing.sourceEntityId;
    const newTarget = patch.targetEntityId ?? existing.targetEntityId;
    validateNoSelfLoop(newSource, newTarget);
  }
  if (patch.relationType !== undefined) {
    patch.relationType = validateKind(patch.relationType);
  }
  if (patch.strength !== undefined) {
    patch.strength = validateStrength(patch.strength);
  }
  if (patch.evidence !== undefined) {
    patch.evidence = validateEvidence(patch.evidence);
  }
  if (patch.linkedResearchCardIds !== undefined) {
    patch.linkedResearchCardIds = normalizeLinkedCards(patch.linkedResearchCardIds);
  }
  return _repoUpdate(id, patch);
}

export async function deleteRelation(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new GraphRelationServiceError(`relation not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ============================================================ */
/* Bind / Unbind Research Card（手动管理）                          */
/* ============================================================ */

/**
 * 把 cardId 加到 relation.linkedResearchCardIds。幂等。
 *
 * 与 entity 模块的区别：relation 字段是**手动**管理（不存在派生规则），
 * UI 提供 bind/unbind 控件直接写入此字段。
 */
export async function bindCardToRelation(relationId: string, cardId: string): Promise<void> {
  const rel = await _repoGet(relationId);
  if (!rel) {
    throw new GraphRelationServiceError(`relation not found: ${relationId}`);
  }
  if (rel.linkedResearchCardIds.includes(cardId)) {
    return; // 幂等
  }
  await _repoUpdate(relationId, {
    linkedResearchCardIds: [...rel.linkedResearchCardIds, cardId],
  });
}

/** 把 cardId 从 relation.linkedResearchCardIds 移除。幂等。 */
export async function unbindCardFromRelation(relationId: string, cardId: string): Promise<void> {
  const rel = await _repoGet(relationId);
  if (!rel) {
    throw new GraphRelationServiceError(`relation not found: ${relationId}`);
  }
  if (!rel.linkedResearchCardIds.includes(cardId)) {
    return; // 幂等
  }
  await _repoUpdate(relationId, {
    linkedResearchCardIds: rel.linkedResearchCardIds.filter((id) => id !== cardId),
  });
}
