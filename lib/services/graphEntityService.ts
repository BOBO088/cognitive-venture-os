/**
 * GraphEntityService — 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ researchCardRepo（派生 linkedResearchCardIds）
 *
 * 业务规则：
 *   1. name 必填，1-200 字符
 *   2. kind 必填，必须 ∈ GraphEntityKind 联合
 *   3. aliases 每项 1-100 字符，trim / 去空 / 去重 / 上限 10
 *   4. tags 规范化：lowercase / 空格→'-' / 截断 32 / 去重 / 上限 20
 *   5. metadata 值限定为 string/number/boolean（service 层兜底校验）
 *   6. linkedResearchCardIds 由 service 从 ResearchCard.graphEntityIds 派生
 *      （写入时不允许 patch 覆盖；读取时自动注入）
 *   7. 绑卡/解卡：通过 patch 对应 ResearchCard.graphEntityIds 字段，service 同步
 *
 * 切到 Supabase：只改 repo，service 零改动。linkedResearchCardIds 改为 view / 计算列。
 */

import {
  listGraphEntities as _repoList,
  getGraphEntity as _repoGet,
  listGraphEntitiesByKind as _repoListByKind,
  createGraphEntity as _repoCreate,
  updateGraphEntity as _repoUpdate,
  deleteGraphEntity as _repoDelete,
  type CreateGraphEntityInput,
  type UpdateGraphEntityInput,
} from '@/lib/repos/knowledge-graph';
import { listResearchCards, updateResearchCard } from '@/lib/repos/research';
import type {
  GraphEntity,
  GraphEntityKind,
} from '@/types';

const NAME_MAX = 200;
const TAGS_MAX = 20;
const TAG_MAX_LEN = 32;
const ALIAS_MAX = 100;
const ALIASES_MAX = 10;
const METADATA_KEY_MAX = 64;
const METADATA_KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const VALID_KINDS: GraphEntityKind[] = [
  'company', 'product', 'person', 'technology',
  'market', 'trend', 'investor', 'ip',
  'character', 'content_asset', 'platform', 'tool',
];

export class GraphEntityServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphEntityServiceError';
  }
}

/* ----------------- 规范化 helpers ----------------- */

function normalizeTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, '-').slice(0, TAG_MAX_LEN);
}

function normalizeTags(input: string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = normalizeTag(raw);
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}

function normalizeAliases(input: string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = raw.trim();
    if (!t) continue;
    if (t.length > ALIAS_MAX) {
      throw new GraphEntityServiceError(`alias must be ≤ ${ALIAS_MAX} chars: "${t.slice(0, 30)}…"`);
    }
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= ALIASES_MAX) {
      throw new GraphEntityServiceError(`aliases must be ≤ ${ALIASES_MAX}`);
    }
  }
  return out;
}

function validateName(name: string | undefined): string {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new GraphEntityServiceError('name is required');
  }
  const trimmed = name.trim();
  if (trimmed.length > NAME_MAX) {
    throw new GraphEntityServiceError(`name must be ≤ ${NAME_MAX} chars`);
  }
  return trimmed;
}

function validateKind(kind: string | undefined): GraphEntityKind {
  if (VALID_KINDS.includes(kind as GraphEntityKind)) {
    return kind as GraphEntityKind;
  }
  throw new GraphEntityServiceError(
    `kind must be one of: ${VALID_KINDS.join(', ')}`,
  );
}

function validateMetadata(
  meta: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  if (!meta) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k.length > METADATA_KEY_MAX || !METADATA_KEY_RE.test(k)) {
      throw new GraphEntityServiceError(
        `metadata key must match /^[a-zA-Z_][a-zA-Z0-9_]*$/ and be ≤ ${METADATA_KEY_MAX} chars: "${k}"`,
      );
    }
    if (
      typeof v !== 'string' &&
      typeof v !== 'number' &&
      typeof v !== 'boolean'
    ) {
      throw new GraphEntityServiceError(
        `metadata["${k}"] must be string | number | boolean`,
      );
    }
    out[k] = v;
  }
  return out;
}

/* ----------------- linkedResearchCardIds 派生 ----------------- */

/** 从 cards 列表算出 entityId → cardId[] 反查表。 */
function buildLinkedCardsIndex(cards: { id: string; graphEntityIds?: string[] }[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const c of cards) {
    for (const eid of c.graphEntityIds ?? []) {
      const arr = idx.get(eid) ?? [];
      arr.push(c.id);
      idx.set(eid, arr);
    }
  }
  return idx;
}

function withLinkedCards(entity: GraphEntity, idx: Map<string, string[]>): GraphEntity {
  return { ...entity, linkedResearchCardIds: idx.get(entity.id) ?? [] };
}

/* ============================================================ */
/* Read 入口                                                        */
/* ============================================================ */

export async function listEntities(): Promise<GraphEntity[]> {
  const [entities, cards] = await Promise.all([_repoList(), listResearchCards()]);
  const idx = buildLinkedCardsIndex(cards);
  return entities.map((e) => withLinkedCards(e, idx));
}

export async function getEntity(id: string): Promise<GraphEntity | undefined> {
  const [entity, cards] = await Promise.all([_repoGet(id), listResearchCards()]);
  if (!entity) return undefined;
  const idx = buildLinkedCardsIndex(cards);
  return withLinkedCards(entity, idx);
}

export async function listEntitiesByKind(kind: GraphEntityKind): Promise<GraphEntity[]> {
  const [entities, cards] = await Promise.all([_repoListByKind(kind), listResearchCards()]);
  const idx = buildLinkedCardsIndex(cards);
  return entities.map((e) => withLinkedCards(e, idx));
}

/**
 * 按 tag 搜索（不区分大小写）。空 query 走 listEntities。
 */
export async function searchEntitiesByTag(query: string): Promise<GraphEntity[]> {
  const q = query.trim().toLowerCase();
  const all = await listEntities();
  if (!q) return all;
  return all.filter((e) =>
    e.tags.some((t) => t.toLowerCase().includes(q)),
  );
}

/**
 * 组合筛选：type + tag 搜索。type = undefined 表示不按 type 过滤。
 */
export async function listEntitiesFiltered(filter: {
  kind?: GraphEntityKind;
  tagQuery?: string;
}): Promise<GraphEntity[]> {
  const all = await listEntities();
  const q = filter.tagQuery?.trim().toLowerCase() ?? '';
  return all.filter((e) => {
    if (filter.kind && e.kind !== filter.kind) return false;
    if (q && !e.tags.some((t) => t.toLowerCase().includes(q))) return false;
    return true;
  });
}

/* ============================================================ */
/* Write 入口                                                       */
/* ============================================================ */

export async function createEntity(input: CreateGraphEntityInput): Promise<GraphEntity> {
  const name = validateName(input.name);
  const kind = validateKind(input.kind);
  const aliases = normalizeAliases(input.aliases);
  const tags = normalizeTags(input.tags);
  const metadata = validateMetadata(input.metadata);

  return _repoCreate({ name, kind, aliases, tags, metadata, description: input.description });
}

export async function updateEntity(
  id: string,
  patch: UpdateGraphEntityInput,
): Promise<GraphEntity> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new GraphEntityServiceError(`entity not found: ${id}`);
  }
  if (patch.name !== undefined) patch.name = validateName(patch.name);
  if (patch.kind !== undefined) patch.kind = validateKind(patch.kind);
  if (patch.aliases !== undefined) patch.aliases = normalizeAliases(patch.aliases);
  if (patch.tags !== undefined) patch.tags = normalizeTags(patch.tags);
  if (patch.metadata !== undefined) patch.metadata = validateMetadata(patch.metadata);
  return _repoUpdate(id, patch);
}

export async function deleteEntity(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new GraphEntityServiceError(`entity not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ============================================================ */
/* Bind / Unbind Research Card                                      */
/* ============================================================ */

/**
 * 绑定：把 cardId 加到 entity 的反向视图 + 把 entityId 加到 card.graphEntityIds。
 * 两侧互为反查视图，service 一次性写完。
 */
export async function bindCardToEntity(entityId: string, cardId: string): Promise<void> {
  const [entity, cards] = await Promise.all([_repoGet(entityId), listResearchCards()]);
  if (!entity) {
    throw new GraphEntityServiceError(`entity not found: ${entityId}`);
  }
  const card = cards.find((c) => c.id === cardId);
  if (!card) {
    throw new GraphEntityServiceError(`card not found: ${cardId}`);
  }
  if ((card.graphEntityIds ?? []).includes(entityId)) {
    return; // 已绑定，幂等
  }
  await updateResearchCard(cardId, {
    graphEntityIds: [...(card.graphEntityIds ?? []), entityId],
  });
}

/**
 * 解绑：把 cardId 从 entity 反向视图移除 + 把 entityId 从 card.graphEntityIds 移除。
 */
export async function unbindCardFromEntity(entityId: string, cardId: string): Promise<void> {
  const cards = await listResearchCards();
  const card = cards.find((c) => c.id === cardId);
  if (!card) {
    throw new GraphEntityServiceError(`card not found: ${cardId}`);
  }
  if (!(card.graphEntityIds ?? []).includes(entityId)) {
    return; // 未绑定，幂等
  }
  await updateResearchCard(cardId, {
    graphEntityIds: (card.graphEntityIds ?? []).filter((id) => id !== entityId),
  });
}

