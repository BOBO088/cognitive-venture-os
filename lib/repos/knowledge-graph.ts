/**
 * Knowledge Graph 仓储：GraphEntity / GraphRelation 查询入口 + CRUD。
 *
 * 当前实现 = 直接读 mock-data/knowledge-graph.ts。切到 Supabase 时只改函数体。
 */

import { mockGraphEntities, mockGraphRelations } from '@/mock-data/knowledge-graph';
import type {
  GraphEntity,
  GraphRelation,
  GraphEntityKind,
  GraphRelationKind,
} from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function newEntityId(): string {
  return `entity_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function newRelationId(): string {
  return `rel_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ============================================================ */
/* GraphEntity                                                     */
/* ============================================================ */

export async function listGraphEntities(): Promise<GraphEntity[]> {
  return [...mockGraphEntities].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getGraphEntity(id: string): Promise<GraphEntity | undefined> {
  return mockGraphEntities.find((e) => e.id === id);
}

export async function listGraphEntitiesByKind(kind: GraphEntityKind): Promise<GraphEntity[]> {
  return mockGraphEntities.filter((e) => e.kind === kind);
}

export interface CreateGraphEntityInput {
  name: string;
  kind: GraphEntityKind;
  aliases?: string[];
  description?: string;
  metadata?: Record<string, string | number | boolean>;
  tags?: string[];
}

export type UpdateGraphEntityInput = Partial<CreateGraphEntityInput>;

export async function createGraphEntity(input: CreateGraphEntityInput): Promise<GraphEntity> {
  if (!input.name || input.name.trim() === '') {
    throw new Error('[graph repo] entity name is required');
  }
  const entity: GraphEntity = {
    id: newEntityId(),
    name: input.name.trim(),
    kind: input.kind,
    aliases: input.aliases ?? [],
    description: input.description,
    metadata: input.metadata ?? {},
    tags: input.tags ?? [],
    linkedResearchCardIds: [],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  mockGraphEntities.unshift(entity);
  return entity;
}

export async function updateGraphEntity(
  id: string,
  patch: UpdateGraphEntityInput,
): Promise<GraphEntity> {
  const idx = mockGraphEntities.findIndex((e) => e.id === id);
  if (idx === -1) {
    throw new Error(`[graph repo] entity not found: ${id}`);
  }
  const existing = mockGraphEntities[idx]!;
  const next: GraphEntity = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    // linkedResearchCardIds 由 service 在 read 时派生，不允许 repo 覆盖
    updatedAt: MOCK_NOW,
  };
  mockGraphEntities[idx] = next;
  return next;
}

export async function deleteGraphEntity(id: string): Promise<void> {
  const idx = mockGraphEntities.findIndex((e) => e.id === id);
  if (idx === -1) {
    throw new Error(`[graph repo] entity not found: ${id}`);
  }
  mockGraphEntities.splice(idx, 1);
}

/* ============================================================ */
/* GraphRelation                                                   */
/* ============================================================ */

export async function listGraphRelations(): Promise<GraphRelation[]> {
  return [...mockGraphRelations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getGraphRelation(id: string): Promise<GraphRelation | undefined> {
  return mockGraphRelations.find((r) => r.id === id);
}

export async function listGraphRelationsByType(type: GraphRelationKind): Promise<GraphRelation[]> {
  return mockGraphRelations.filter((r) => r.relationType === type);
}

export async function listGraphRelationsByEntity(entityId: string): Promise<GraphRelation[]> {
  return mockGraphRelations.filter(
    (r) => r.sourceEntityId === entityId || r.targetEntityId === entityId,
  );
}

export interface CreateGraphRelationInput {
  sourceEntityId: string;
  targetEntityId: string;
  relationType: GraphRelationKind;
  strength: number;
  evidence?: string;
  linkedResearchCardIds?: string[];
}

export type UpdateGraphRelationInput = Partial<CreateGraphRelationInput>;

export async function createGraphRelation(input: CreateGraphRelationInput): Promise<GraphRelation> {
  if (!input.sourceEntityId || !input.targetEntityId) {
    throw new Error('[graph repo] sourceEntityId and targetEntityId are required');
  }
  if (input.sourceEntityId === input.targetEntityId) {
    throw new Error('[graph repo] self-loop relations are not allowed');
  }
  const rel: GraphRelation = {
    id: newRelationId(),
    sourceEntityId: input.sourceEntityId,
    targetEntityId: input.targetEntityId,
    relationType: input.relationType,
    strength: input.strength,
    evidence: input.evidence,
    linkedResearchCardIds: input.linkedResearchCardIds ?? [],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  mockGraphRelations.unshift(rel);
  return rel;
}

export async function updateGraphRelation(
  id: string,
  patch: UpdateGraphRelationInput,
): Promise<GraphRelation> {
  const idx = mockGraphRelations.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new Error(`[graph repo] relation not found: ${id}`);
  }
  const existing = mockGraphRelations[idx]!;
  const next: GraphRelation = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: MOCK_NOW,
  };
  mockGraphRelations[idx] = next;
  return next;
}

export async function deleteGraphRelation(id: string): Promise<void> {
  const idx = mockGraphRelations.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new Error(`[graph repo] relation not found: ${id}`);
  }
  mockGraphRelations.splice(idx, 1);
}
