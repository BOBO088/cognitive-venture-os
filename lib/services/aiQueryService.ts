/**
 * AIQueryService — AIQueryBankItem 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ geoBrandService（校验 brandEntityId 引用）
 *                            ↘ geo repo（校验 linkedAssetIds 引用）
 *                            ↘ llmProvider.generateAIQueryBankDraft（批量生成）
 *
 * 业务规则：
 *   1. brandEntityId 必须指向存在的 BrandEntityProfile（service 校验）
 *   2. query 1-500 字符
 *   3. intent ∈ AI_QUERY_BANK_INTENTS
 *   4. platform ∈ AI_QUERY_BANK_PLATFORMS
 *   5. priority ∈ AI_QUERY_BANK_PRIORITIES
 *   6. status ∈ AI_QUERY_BANK_STATUSES
 *   7. linkedAssetIds 每项必须指向存在的 GEOContentAsset
 *   8. id 唯一性
 *   9. createdAt / updatedAt 由调用方提供
 *
 * 与 AIQuery 的关系：AIQueryBankItem = 监控的"问题库"（战略层）；
 * AIQuery = 监控的"执行单元"（provider / schedule / 引用结果）。两者独立。
 */

import {
  listAIQueryBankItems as _repoList,
  listAIQueryBankItemsSorted as _repoListSorted,
  listAIQueryBankItemsByBrand as _repoListByBrand,
  getAIQueryBankItem as _repoGet,
  listContentAssets as _repoListAssets,
  insertAIQueryBankItem as _repoInsert,
  updateAIQueryBankItemInStore as _repoUpdate,
  deleteAIQueryBankItemFromStore as _repoDelete,
} from '@/lib/repos/geo';
import { getBrandEntityProfile } from './geoBrandService';
import { getLLMProvider } from '@/lib/providers';
import {
  AI_QUERY_BANK_INTENTS,
  AI_QUERY_BANK_PLATFORMS,
  AI_QUERY_BANK_PRIORITIES,
  AI_QUERY_BANK_STATUSES,
} from '@/types';
import type {
  AIQueryBankItem,
  AIQueryBankIntent,
  AIQueryBankPlatform,
  AIQueryBankPriority,
  AIQueryBankStatus,
  BrandEntityProfile,
  GEOContentAsset,
} from '@/types';

const QUERY_MIN = 1;
const QUERY_MAX = 500;
const ASSET_IDS_MAX = 50;

export class AIQueryServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIQueryServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateQuery(q: string | undefined): string {
  if (typeof q !== 'string') {
    throw new AIQueryServiceError('query is required');
  }
  const v = q.trim();
  if (v.length < QUERY_MIN) {
    throw new AIQueryServiceError('query cannot be empty');
  }
  if (v.length > QUERY_MAX) {
    throw new AIQueryServiceError(`query must be ≤ ${QUERY_MAX} characters`);
  }
  return v;
}

function validateIntent(v: string | undefined): AIQueryBankIntent {
  if (AI_QUERY_BANK_INTENTS.includes(v as AIQueryBankIntent)) {
    return v as AIQueryBankIntent;
  }
  throw new AIQueryServiceError(
    `intent must be one of: ${AI_QUERY_BANK_INTENTS.join(', ')}`,
  );
}

function validatePlatform(v: string | undefined): AIQueryBankPlatform {
  if (AI_QUERY_BANK_PLATFORMS.includes(v as AIQueryBankPlatform)) {
    return v as AIQueryBankPlatform;
  }
  throw new AIQueryServiceError(
    `platform must be one of: ${AI_QUERY_BANK_PLATFORMS.join(', ')}`,
  );
}

function validatePriority(v: string | undefined): AIQueryBankPriority {
  if (AI_QUERY_BANK_PRIORITIES.includes(v as AIQueryBankPriority)) {
    return v as AIQueryBankPriority;
  }
  throw new AIQueryServiceError(
    `priority must be one of: ${AI_QUERY_BANK_PRIORITIES.join(', ')}`,
  );
}

function validateStatus(v: string | undefined): AIQueryBankStatus {
  if (AI_QUERY_BANK_STATUSES.includes(v as AIQueryBankStatus)) {
    return v as AIQueryBankStatus;
  }
  throw new AIQueryServiceError(
    `status must be one of: ${AI_QUERY_BANK_STATUSES.join(', ')}`,
  );
}

function normalizeAssetIds(input: string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') {
      throw new AIQueryServiceError('linkedAssetIds[] must be string');
    }
    const t = raw.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= ASSET_IDS_MAX) {
      throw new AIQueryServiceError(
        `linkedAssetIds must be ≤ ${ASSET_IDS_MAX} ids`,
      );
    }
  }
  return out;
}

async function validateAssetReferences(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const all = await _repoListAssets();
  const known = new Set(all.map((a: GEOContentAsset) => a.id));
  for (const id of ids) {
    if (!known.has(id)) {
      throw new AIQueryServiceError(`GEO content asset not found: ${id}`);
    }
  }
}

/* ----------------- Read ----------------- */

export async function listAIQueryBankItems(): Promise<AIQueryBankItem[]> {
  return _repoListSorted();
}

export async function getAIQueryBankItem(
  id: string,
): Promise<AIQueryBankItem | undefined> {
  return _repoGet(id);
}

export async function listAIQueryBankItemsByBrand(
  brandEntityId: string,
): Promise<AIQueryBankItem[]> {
  return _repoListByBrand(brandEntityId);
}

export async function listAIQueryBankItemsFiltered(filter: {
  brandEntityId?: string;
  intent?: AIQueryBankIntent;
  platform?: AIQueryBankPlatform;
  priority?: AIQueryBankPriority;
  status?: AIQueryBankStatus;
}): Promise<AIQueryBankItem[]> {
  const all = await _repoListSorted();
  return all
    .filter((q) =>
      filter.brandEntityId ? q.brandEntityId === filter.brandEntityId : true,
    )
    .filter((q) => (filter.intent ? q.intent === filter.intent : true))
    .filter((q) => (filter.platform ? q.platform === filter.platform : true))
    .filter((q) => (filter.priority ? q.priority === filter.priority : true))
    .filter((q) => (filter.status ? q.status === filter.status : true));
}

/* ----------------- Aggregates ----------------- */

export interface AIQueryBankStats {
  totalItems: number;
  byIntent: Record<AIQueryBankIntent, number>;
  byPlatform: Record<AIQueryBankPlatform, number>;
  byPriority: Record<AIQueryBankPriority, number>;
  byStatus: Record<AIQueryBankStatus, number>;
  withAssets: number;
}

export async function computeAIQueryBankStats(
  items?: AIQueryBankItem[],
): Promise<AIQueryBankStats> {
  const all = items ?? (await _repoList());
  const byIntent = {} as Record<AIQueryBankIntent, number>;
  const byPlatform = {} as Record<AIQueryBankPlatform, number>;
  const byPriority = {} as Record<AIQueryBankPriority, number>;
  const byStatus = {} as Record<AIQueryBankStatus, number>;
  for (const i of AI_QUERY_BANK_INTENTS) byIntent[i] = 0;
  for (const p of AI_QUERY_BANK_PLATFORMS) byPlatform[p] = 0;
  for (const p of AI_QUERY_BANK_PRIORITIES) byPriority[p] = 0;
  for (const s of AI_QUERY_BANK_STATUSES) byStatus[s] = 0;
  let withAssets = 0;
  for (const q of all) {
    byIntent[q.intent] = (byIntent[q.intent] ?? 0) + 1;
    byPlatform[q.platform] = (byPlatform[q.platform] ?? 0) + 1;
    byPriority[q.priority] = (byPriority[q.priority] ?? 0) + 1;
    byStatus[q.status] = (byStatus[q.status] ?? 0) + 1;
    if (q.linkedAssetIds.length > 0) withAssets += 1;
  }
  return {
    totalItems: all.length,
    byIntent,
    byPlatform,
    byPriority,
    byStatus,
    withAssets,
  };
}

/* ----------------- Write ----------------- */

export interface CreateAIQueryBankItemInput {
  id: string;
  brandEntityId: string;
  query: string;
  intent: AIQueryBankIntent;
  platform: AIQueryBankPlatform;
  priority: AIQueryBankPriority;
  status: AIQueryBankStatus;
  linkedAssetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAIQueryBankItemInput {
  brandEntityId?: string;
  query?: string;
  intent?: AIQueryBankIntent;
  platform?: AIQueryBankPlatform;
  priority?: AIQueryBankPriority;
  status?: AIQueryBankStatus;
  linkedAssetIds?: string[];
  updatedAt: string;
}

export async function createAIQueryBankItem(
  input: CreateAIQueryBankItemInput,
): Promise<AIQueryBankItem> {
  const brandEntityId = input.brandEntityId;
  // service 校验 brandEntityId 存在
  const brand = await getBrandEntityProfile(brandEntityId);
  if (!brand) {
    throw new AIQueryServiceError(`Brand profile not found: ${brandEntityId}`);
  }
  const query = validateQuery(input.query);
  const intent = validateIntent(input.intent);
  const platform = validatePlatform(input.platform);
  const priority = validatePriority(input.priority);
  const status = validateStatus(input.status);
  const linkedAssetIds = normalizeAssetIds(input.linkedAssetIds);
  await validateAssetReferences(linkedAssetIds);

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new AIQueryServiceError(
      `AI query bank item with id "${input.id}" already exists`,
    );
  }

  const created: AIQueryBankItem = {
    id: input.id,
    brandEntityId,
    query,
    intent,
    platform,
    priority,
    status,
    linkedAssetIds,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateAIQueryBankItem(
  id: string,
  patch: UpdateAIQueryBankItemInput,
): Promise<AIQueryBankItem> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new AIQueryServiceError(`AI query bank item not found: ${id}`);
  }
  let brandEntityId = existing.brandEntityId;
  if (patch.brandEntityId !== undefined && patch.brandEntityId !== existing.brandEntityId) {
    const brand = await getBrandEntityProfile(patch.brandEntityId);
    if (!brand) {
      throw new AIQueryServiceError(
        `Brand profile not found: ${patch.brandEntityId}`,
      );
    }
    brandEntityId = patch.brandEntityId;
  }
  const query = patch.query !== undefined ? validateQuery(patch.query) : existing.query;
  const intent =
    patch.intent !== undefined ? validateIntent(patch.intent) : existing.intent;
  const platform =
    patch.platform !== undefined ? validatePlatform(patch.platform) : existing.platform;
  const priority =
    patch.priority !== undefined ? validatePriority(patch.priority) : existing.priority;
  const status =
    patch.status !== undefined ? validateStatus(patch.status) : existing.status;
  const linkedAssetIds =
    patch.linkedAssetIds !== undefined
      ? normalizeAssetIds(patch.linkedAssetIds)
      : existing.linkedAssetIds;
  if (patch.linkedAssetIds !== undefined) {
    await validateAssetReferences(linkedAssetIds);
  }

  const next: AIQueryBankItem = {
    id: existing.id,
    brandEntityId,
    query,
    intent,
    platform,
    priority,
    status,
    linkedAssetIds,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new AIQueryServiceError(
      `failed to persist AI query bank item update: ${id}`,
    );
  }
  return updated;
}

export async function deleteAIQueryBankItem(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new AIQueryServiceError(`AI query bank item not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Bulk generate ----------------- */

export interface GenerateAIQueryBankInput {
  brandEntityId: string;
  intent: AIQueryBankIntent;
  platform: AIQueryBankPlatform;
  count: number;
  /** 落地时使用的 priority 兜底（草稿里 priorityScore ≥ 75 → urgent / ≥ 50 → high / ≥ 25 → medium / else low）。 */
  defaultPriority: AIQueryBankPriority;
  defaultStatus: AIQueryBankStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedAIQueryBankDraft {
  query: string;
  intent: AIQueryBankIntent;
  platform: AIQueryBankPlatform;
  priority: AIQueryBankPriority;
  status: AIQueryBankStatus;
}

function scoreToPriority(score: number): AIQueryBankPriority {
  if (score >= 75) return 'urgent';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

/**
 * 批量生成 AI Query Bank 草稿 → 直接落库（不返回 draft）。
 *
 * 数据流：
 *   1. service 校验 brandEntityId 存在
 *   2. service 调 LLMProvider.generateAIQueryBankDraft
 *   3. service 把 priorityScore 映射到 priority enum
 *   4. service 给每条草稿分配 id + 时间戳
 *   5. service 批量 insert
 *
 * 返回已落库的 item 列表。
 */
export async function generateAIQueryBankForBrand(
  input: GenerateAIQueryBankInput,
): Promise<AIQueryBankItem[]> {
  const brand = await getBrandEntityProfile(input.brandEntityId);
  if (!brand) {
    throw new AIQueryServiceError(
      `Brand profile not found: ${input.brandEntityId}`,
    );
  }
  if (input.count < 1) {
    throw new AIQueryServiceError('count must be ≥ 1');
  }
  if (input.count > 50) {
    throw new AIQueryServiceError('count must be ≤ 50');
  }
  validatePriority(input.defaultPriority);
  validateStatus(input.defaultStatus);

  const provider = await getLLMProvider();
  const drafts = await provider.generateAIQueryBankDraft({
    brand,
    intent: input.intent,
    platform: input.platform,
    count: input.count,
  });
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return [];
  }

  const created: AIQueryBankItem[] = [];
  const now = input.updatedAt;
  const rand = Math.random().toString(36).slice(2, 10);
  let n = 0;
  for (const d of drafts) {
    n += 1;
    const id = `bank_${Date.now().toString(36)}-${rand}-${n}`;
    const item: AIQueryBankItem = {
      id,
      brandEntityId: brand.id,
      query: validateQuery(d.query),
      intent: validateIntent(d.intent),
      platform: validatePlatform(d.platform),
      priority: scoreToPriority(d.priorityScore),
      status: input.defaultStatus,
      linkedAssetIds: [],
      createdAt: now,
      updatedAt: now,
    };
    // 使用 _repoInsert 跳过 brandEntityId 校验（已通过 getBrandEntityProfile 校验）
    await _repoInsert(item);
    created.push(item);
  }
  return created;
}

/* ----------------- Resolve helpers ----------------- */

/** 把 brandEntityId 解析为可读的 brand name（service 不做，前端 UI 用）。 */
export async function resolveBrandName(
  brandEntityId: string,
): Promise<string | undefined> {
  const brand: BrandEntityProfile | undefined = await getBrandEntityProfile(
    brandEntityId,
  );
  return brand?.name;
}
