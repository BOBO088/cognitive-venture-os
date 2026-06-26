/**
 * ContentAssetService — ContentAsset 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ geoBrandService（校验 brandEntityId 引用）
 *                            ↘ aiQueryService（校验 targetQueryIds 引用）
 *
 * 业务规则：
 *   1. title 1-200 字符
 *   2. url 必须是合法 http(s) URL
 *   3. type ∈ CONTENT_ASSET_TYPES（9 个值）
 *   4. summary 1-1000 字符
 *   5. brandEntityId 必须指向存在的 BrandEntityProfile
 *   6. targetQueryIds 每项必须指向存在的 AIQueryBankItem，≤ 50
 *   7. structuredEvidence 每项 claim 1-400 字符，≤ 20
 *   8. lastUpdated 必须是合法 ISO 8601 时间
 *   9. geoScore ∈ [0, 100] 整数
 *  10. id 唯一性
 *  11. createdAt / updatedAt 由调用方提供
 *
 * 与 GEOContentAsset（v0.1）的关系：v0.1 挂在 GEOBrandEntity 下，自由文本
 * targetQueries；v2 挂在 BrandEntityProfile 下，强引用 targetQueryIds。
 * 两者并行，不互相替换。
 */

import {
  listContentLibraryAssets as _repoList,
  listContentLibraryAssetsSorted as _repoListSorted,
  listContentLibraryAssetsByBrand as _repoListByBrand,
  getContentLibraryAsset as _repoGet,
  insertContentLibraryAsset as _repoInsert,
  updateContentLibraryAssetInStore as _repoUpdate,
  deleteContentLibraryAssetFromStore as _repoDelete,
} from '@/lib/repos/geo';
import { getBrandEntityProfile } from './geoBrandService';
import { getAIQueryBankItem } from './aiQueryService';
import { CONTENT_ASSET_TYPES } from '@/types';
import type {
  ContentAsset,
  ContentAssetType,
  ContentAssetStructuredEvidence,
} from '@/types';

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const SUMMARY_MIN = 1;
const SUMMARY_MAX = 1000;
const CLAIM_MIN = 1;
const CLAIM_MAX = 400;
const EVIDENCE_MAX = 20;
const TARGET_QUERY_IDS_MAX = 50;
const GEO_SCORE_MIN = 0;
const GEO_SCORE_MAX = 100;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export class ContentAssetServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentAssetServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateTitle(v: string | undefined): string {
  if (typeof v !== 'string') {
    throw new ContentAssetServiceError('title is required');
  }
  const t = v.trim();
  if (t.length < TITLE_MIN) {
    throw new ContentAssetServiceError('title cannot be empty');
  }
  if (t.length > TITLE_MAX) {
    throw new ContentAssetServiceError(`title must be <= ${TITLE_MAX} characters`);
  }
  return t;
}

function validateUrl(v: string | undefined): string {
  if (typeof v !== 'string') {
    throw new ContentAssetServiceError('url is required');
  }
  const u = v.trim();
  if (!u) {
    throw new ContentAssetServiceError('url cannot be empty');
  }
  if (!URL_REGEX.test(u)) {
    throw new ContentAssetServiceError('url must be a valid http(s) URL');
  }
  return u;
}

function validateType(v: string | undefined): ContentAssetType {
  if (CONTENT_ASSET_TYPES.includes(v as ContentAssetType)) {
    return v as ContentAssetType;
  }
  throw new ContentAssetServiceError(
    `type must be one of: ${CONTENT_ASSET_TYPES.join(', ')}`,
  );
}

function validateSummary(v: string | undefined): string {
  if (typeof v !== 'string') {
    throw new ContentAssetServiceError('summary is required');
  }
  const s = v.trim();
  if (s.length < SUMMARY_MIN) {
    throw new ContentAssetServiceError('summary cannot be empty');
  }
  if (s.length > SUMMARY_MAX) {
    throw new ContentAssetServiceError(
      `summary must be <= ${SUMMARY_MAX} characters`,
    );
  }
  return s;
}

function validateLastUpdated(v: string | undefined): string {
  if (typeof v !== 'string') {
    throw new ContentAssetServiceError('lastUpdated is required');
  }
  const t = v.trim();
  if (!ISO_DATETIME_REGEX.test(t)) {
    throw new ContentAssetServiceError(
      'lastUpdated must be ISO 8601 datetime (e.g. 2026-06-25T12:00:00.000Z)',
    );
  }
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) {
    throw new ContentAssetServiceError('lastUpdated is not a valid date');
  }
  return t;
}

function validateGeoScore(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new ContentAssetServiceError('geoScore must be a number');
  }
  if (!Number.isInteger(v)) {
    throw new ContentAssetServiceError('geoScore must be an integer');
  }
  if (v < GEO_SCORE_MIN || v > GEO_SCORE_MAX) {
    throw new ContentAssetServiceError(
      `geoScore must be in [${GEO_SCORE_MIN}, ${GEO_SCORE_MAX}]`,
    );
  }
  return v;
}

function normalizeQueryIds(input: string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') {
      throw new ContentAssetServiceError('targetQueryIds[] must be string');
    }
    const t = raw.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length > TARGET_QUERY_IDS_MAX) {
      throw new ContentAssetServiceError(
        `targetQueryIds must be <= ${TARGET_QUERY_IDS_MAX} ids`,
      );
    }
  }
  return out;
}

function normalizeEvidence(
  input: ContentAssetStructuredEvidence[] | undefined,
): ContentAssetStructuredEvidence[] {
  if (!input) return [];
  const out: ContentAssetStructuredEvidence[] = [];
  for (const raw of input) {
    if (typeof raw !== 'object' || raw === null) {
      throw new ContentAssetServiceError('structuredEvidence items must be objects');
    }
    const claim = (raw as { claim?: unknown }).claim;
    if (typeof claim !== 'string') {
      throw new ContentAssetServiceError('structuredEvidence[].claim must be a string');
    }
    const c = claim.trim();
    if (c.length < CLAIM_MIN) {
      throw new ContentAssetServiceError('structuredEvidence[].claim cannot be empty');
    }
    if (c.length > CLAIM_MAX) {
      throw new ContentAssetServiceError(
        `structuredEvidence[].claim must be <= ${CLAIM_MAX} characters`,
      );
    }
    const source = (raw as { source?: unknown }).source;
    const quote = (raw as { quote?: unknown }).quote;
    const ev: ContentAssetStructuredEvidence = {
      claim: c,
      ...(typeof source === 'string' && source.trim()
        ? { source: source.trim() }
        : {}),
      ...(typeof quote === 'string' && quote.trim()
        ? { quote: quote.trim() }
        : {}),
    };
    out.push(ev);
    if (out.length > EVIDENCE_MAX) {
      throw new ContentAssetServiceError(
        `structuredEvidence must be <= ${EVIDENCE_MAX} items`,
      );
    }
  }
  return out;
}

async function validateBrandReference(brandEntityId: string): Promise<void> {
  const brand = await getBrandEntityProfile(brandEntityId);
  if (!brand) {
    throw new ContentAssetServiceError(
      `Brand profile not found: ${brandEntityId}`,
    );
  }
}

async function validateQueryReferences(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  for (const id of ids) {
    const q = await getAIQueryBankItem(id);
    if (!q) {
      throw new ContentAssetServiceError(
        `AI query bank item not found: ${id}`,
      );
    }
  }
}

/* ----------------- Read ----------------- */

export async function listContentAssets(): Promise<ContentAsset[]> {
  return _repoListSorted();
}

export async function getContentAsset(
  id: string,
): Promise<ContentAsset | undefined> {
  return _repoGet(id);
}

export async function listContentAssetsByBrand(
  brandEntityId: string,
): Promise<ContentAsset[]> {
  return _repoListByBrand(brandEntityId);
}

export async function listContentAssetsFiltered(filter: {
  brandEntityId?: string;
  type?: ContentAssetType;
  minGeoScore?: number;
}): Promise<ContentAsset[]> {
  const all = await _repoListSorted();
  return all
    .filter((a) =>
      filter.brandEntityId ? a.brandEntityId === filter.brandEntityId : true,
    )
    .filter((a) => (filter.type ? a.type === filter.type : true))
    .filter((a) =>
      typeof filter.minGeoScore === 'number'
        ? a.geoScore >= filter.minGeoScore
        : true,
    );
}

/* ----------------- Aggregates ----------------- */

export interface ContentAssetStats {
  totalAssets: number;
  byType: Record<ContentAssetType, number>;
  /** 0-49 / 50-74 / 75-100 三档 */
  byScoreBucket: { low: number; mid: number; high: number };
  withEvidence: number;
  withTargetQueries: number;
  averageGeoScore: number;
}

export async function computeContentAssetStats(
  items?: ContentAsset[],
): Promise<ContentAssetStats> {
  const all = items ?? (await _repoList());
  const byType = {} as Record<ContentAssetType, number>;
  for (const t of CONTENT_ASSET_TYPES) byType[t] = 0;
  let low = 0;
  let mid = 0;
  let high = 0;
  let withEvidence = 0;
  let withTargetQueries = 0;
  let scoreSum = 0;
  for (const a of all) {
    byType[a.type] = (byType[a.type] ?? 0) + 1;
    if (a.geoScore < 50) low += 1;
    else if (a.geoScore < 75) mid += 1;
    else high += 1;
    if (a.structuredEvidence.length > 0) withEvidence += 1;
    if (a.targetQueryIds.length > 0) withTargetQueries += 1;
    scoreSum += a.geoScore;
  }
  return {
    totalAssets: all.length,
    byType,
    byScoreBucket: { low, mid, high },
    withEvidence,
    withTargetQueries,
    averageGeoScore:
      all.length === 0 ? 0 : Math.round(scoreSum / all.length),
  };
}

/* ----------------- Write ----------------- */

export interface CreateContentAssetInput {
  id: string;
  brandEntityId: string;
  title: string;
  url: string;
  type: ContentAssetType;
  summary: string;
  targetQueryIds: string[];
  structuredEvidence: ContentAssetStructuredEvidence[];
  lastUpdated: string;
  geoScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateContentAssetInput {
  brandEntityId?: string;
  title?: string;
  url?: string;
  type?: ContentAssetType;
  summary?: string;
  targetQueryIds?: string[];
  structuredEvidence?: ContentAssetStructuredEvidence[];
  lastUpdated?: string;
  geoScore?: number;
  updatedAt: string;
}

export async function createContentAsset(
  input: CreateContentAssetInput,
): Promise<ContentAsset> {
  const brandEntityId = input.brandEntityId;
  await validateBrandReference(brandEntityId);
  const title = validateTitle(input.title);
  const url = validateUrl(input.url);
  const type = validateType(input.type);
  const summary = validateSummary(input.summary);
  const targetQueryIds = normalizeQueryIds(input.targetQueryIds);
  await validateQueryReferences(targetQueryIds);
  const structuredEvidence = normalizeEvidence(input.structuredEvidence);
  const lastUpdated = validateLastUpdated(input.lastUpdated);
  const geoScore = validateGeoScore(input.geoScore);

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new ContentAssetServiceError(
      `Content asset with id "${input.id}" already exists`,
    );
  }

  const created: ContentAsset = {
    id: input.id,
    brandEntityId,
    title,
    url,
    type,
    summary,
    targetQueryIds,
    structuredEvidence,
    lastUpdated,
    geoScore,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateContentAsset(
  id: string,
  patch: UpdateContentAssetInput,
): Promise<ContentAsset> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new ContentAssetServiceError(`Content asset not found: ${id}`);
  }

  let brandEntityId = existing.brandEntityId;
  if (
    patch.brandEntityId !== undefined &&
    patch.brandEntityId !== existing.brandEntityId
  ) {
    await validateBrandReference(patch.brandEntityId);
    brandEntityId = patch.brandEntityId;
  }
  const title = patch.title !== undefined ? validateTitle(patch.title) : existing.title;
  const url = patch.url !== undefined ? validateUrl(patch.url) : existing.url;
  const type = patch.type !== undefined ? validateType(patch.type) : existing.type;
  const summary = patch.summary !== undefined ? validateSummary(patch.summary) : existing.summary;
  const targetQueryIds =
    patch.targetQueryIds !== undefined
      ? normalizeQueryIds(patch.targetQueryIds)
      : existing.targetQueryIds;
  if (patch.targetQueryIds !== undefined) {
    await validateQueryReferences(targetQueryIds);
  }
  const structuredEvidence =
    patch.structuredEvidence !== undefined
      ? normalizeEvidence(patch.structuredEvidence)
      : existing.structuredEvidence;
  const lastUpdated =
    patch.lastUpdated !== undefined
      ? validateLastUpdated(patch.lastUpdated)
      : existing.lastUpdated;
  const geoScore =
    patch.geoScore !== undefined ? validateGeoScore(patch.geoScore) : existing.geoScore;

  const next: ContentAsset = {
    id: existing.id,
    brandEntityId,
    title,
    url,
    type,
    summary,
    targetQueryIds,
    structuredEvidence,
    lastUpdated,
    geoScore,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new ContentAssetServiceError(
      `failed to persist content asset update: ${id}`,
    );
  }
  return updated;
}

export async function deleteContentAsset(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new ContentAssetServiceError(`Content asset not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Markdown report ----------------- */

/**
 * 导出内容资产报告 Markdown。
 *
 * 数据流：service 不做字符串拼装（在 UI 层做更直接），这里只是给
 * UI 提供一份"已经过滤 / 规范化"的数据快照 + 链接到关联实体的便利。
 * 实际 markdown 文本在 components/geo/ContentAssetReport.tsx 中拼装。
 */
export interface ContentAssetReportContext {
  asset: ContentAsset;
  brand: { id: string; name: string; category: string } | undefined;
  targetQueries: Array<{ id: string; query: string; intent: string }>;
}

export async function buildContentAssetReportContext(
  id: string,
): Promise<ContentAssetReportContext | undefined> {
  const asset = await getContentAsset(id);
  if (!asset) return undefined;
  const brand = await getBrandEntityProfile(asset.brandEntityId);
  const targetQueries: Array<{ id: string; query: string; intent: string }> = [];
  for (const qid of asset.targetQueryIds) {
    const q = await getAIQueryBankItem(qid);
    if (q) {
      targetQueries.push({ id: q.id, query: q.query, intent: q.intent });
    }
  }
  return {
    asset,
    brand: brand
      ? { id: brand.id, name: brand.name, category: brand.category }
      : undefined,
    targetQueries,
  };
}

/* ============================================================
 * ContentAssetConnector — 外部内容源 connector 接口（预留）。
 *
 * 未来接入博客 / 官网 / Notion / CMS 时，新增
 *   lib/providers/<source>/contentAsset.ts
 * 实现此接口，service 通过 getContentAssetConnector() 拿实例。
 *
 * 当前不实现，仅作为扩展点占位，避免后续接入时大改 service。
 * ============================================================ */

export interface ContentAssetConnector {
  /** 标识 connector 名称（"wordpress" / "notion" / "ghost" / ...）。 */
  readonly name: string;
  /** health check：当前 connector 是否可用（API key 是否配）。 */
  health(): Promise<{ ok: boolean; detail?: string }>;
  /** 从外部源拉取资产草稿列表（service 决定怎么 merge 到本地 store）。 */
  fetchDrafts(input: { brandEntityId: string; since?: string }): Promise<
    Array<{
      externalId: string;
      title: string;
      url: string;
      summary: string;
      lastUpdated: string;
    }>
  >;
}

let _connectorInstance: ContentAssetConnector | undefined;

/** 注册一个 connector（通常在 app boot 时调一次）。MVP 不注册。 */
export function registerContentAssetConnector(
  c: ContentAssetConnector,
): void {
  _connectorInstance = c;
}

/** 取当前 connector（未注册时返回 undefined，service 走 mock 路径）。 */
export function getContentAssetConnector(): ContentAssetConnector | undefined {
  return _connectorInstance;
}
