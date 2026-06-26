/**
 * CitationMonitorService — AI 引用监控业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ aiQueryService（校验 queryId 引用）
 *                            ↘ geoBrandService（拿 brand 上下文）
 *                            ↘ CitationMonitorConnector.runCheck（mock 跑一次）
 *
 * 业务规则：
 *   1. queryId 必须指向存在的 AIQueryBankItem（service 校验）
 *   2. platform ∈ CITATION_PLATFORMS（5 个）
 *   3. checkedAt 必须是合法 ISO 8601
 *   4. citedUrl 可选；存在时必须是合法 http(s) URL，≤ 500 字符
 *   5. competitorMentions 每项 1-100 字符，≤ 20 项
 *   6. answerSummary 1-2000 字符
 *   7. geoScore ∈ [0, 100] 整数
 *   8. id 唯一性，格式 `cite_<timestamp36>-<rand8>`
 *   9. createdAt / updatedAt 由调用方提供
 *
 * 写入策略：append-only。一次 check 是历史快照，不做 update / delete。
 */

import {
  listAICitationChecks as _repoList,
  listAICitationChecksSorted as _repoListSorted,
  listAICitationChecksByQuery as _repoListByQuery,
  listAICitationChecksByPlatform as _repoListByPlatform,
  getAICitationCheck as _repoGet,
  insertAICitationCheck as _repoInsert,
} from '@/lib/repos/geo';
import { getAIQueryBankItem } from './aiQueryService';
import { getBrandEntityProfile } from './geoBrandService';
import { getCitationMonitorConnector } from '@/lib/providers';
import {
  CITATION_PLATFORMS,
} from '@/types';
import type {
  AICitationCheck,
  CitationPlatform,
  AIQueryBankItem,
  BrandEntityProfile,
  ContentAsset,
} from '@/types';

const ANSWER_SUMMARY_MAX = 2000;
const CITED_URL_MAX = 500;
const COMPETITOR_MAX = 20;
const COMPETITOR_LEN_MAX = 100;
const GEO_SCORE_MIN = 0;
const GEO_SCORE_MAX = 100;

export class CitationMonitorServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CitationMonitorServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validatePlatform(v: string | undefined): CitationPlatform {
  if (CITATION_PLATFORMS.includes(v as CitationPlatform)) {
    return v as CitationPlatform;
  }
  throw new CitationMonitorServiceError(
    `platform must be one of: ${CITATION_PLATFORMS.join(', ')}`,
  );
}

function validateGeoScore(v: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
    throw new CitationMonitorServiceError(
      'geoScore must be an integer',
    );
  }
  if (v < GEO_SCORE_MIN || v > GEO_SCORE_MAX) {
    throw new CitationMonitorServiceError(
      `geoScore must be in [${GEO_SCORE_MIN}, ${GEO_SCORE_MAX}]`,
    );
  }
  return v;
}

function validateAnswerSummary(v: string | undefined): string {
  if (typeof v !== 'string') {
    throw new CitationMonitorServiceError('answerSummary is required');
  }
  const t = v.trim();
  if (t.length < 1) {
    throw new CitationMonitorServiceError('answerSummary cannot be empty');
  }
  if (t.length > ANSWER_SUMMARY_MAX) {
    throw new CitationMonitorServiceError(
      `answerSummary must be <= ${ANSWER_SUMMARY_MAX} characters`,
    );
  }
  return t;
}

function validateCitedUrl(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') {
    throw new CitationMonitorServiceError('citedUrl must be a string');
  }
  const t = v.trim();
  if (!t) return undefined;
  if (t.length > CITED_URL_MAX) {
    throw new CitationMonitorServiceError(
      `citedUrl must be <= ${CITED_URL_MAX} characters`,
    );
  }
  if (!/^https?:\/\//i.test(t)) {
    throw new CitationMonitorServiceError(
      'citedUrl must start with http:// or https://',
    );
  }
  return t;
}

function validateCompetitorMentions(
  v: string[] | undefined,
): string[] {
  if (!v) return [];
  if (v.length > COMPETITOR_MAX) {
    throw new CitationMonitorServiceError(
      `competitorMentions must have <= ${COMPETITOR_MAX} items`,
    );
  }
  return v.map((s, i) => {
    if (typeof s !== 'string') {
      throw new CitationMonitorServiceError(
        `competitorMentions[${i}] must be a string`,
      );
    }
    const t = s.trim();
    if (!t) {
      throw new CitationMonitorServiceError(
        `competitorMentions[${i}] cannot be empty`,
      );
    }
    if (t.length > COMPETITOR_LEN_MAX) {
      throw new CitationMonitorServiceError(
        `competitorMentions[${i}] must be <= ${COMPETITOR_LEN_MAX} characters`,
      );
    }
    return t;
  });
}

function validateCheckedAt(v: string | undefined): string {
  if (typeof v !== 'string') {
    throw new CitationMonitorServiceError('checkedAt is required');
  }
  const t = v.trim();
  if (!t) {
    throw new CitationMonitorServiceError('checkedAt cannot be empty');
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    throw new CitationMonitorServiceError(
      'checkedAt must be a valid ISO 8601 date',
    );
  }
  return t;
}

/* ----------------- Read ----------------- */

export async function listAICitationChecks(): Promise<AICitationCheck[]> {
  return _repoListSorted();
}

export async function getAICitationCheck(
  id: string,
): Promise<AICitationCheck | undefined> {
  return _repoGet(id);
}

export async function listAICitationChecksByQuery(
  queryId: string,
): Promise<AICitationCheck[]> {
  return _repoListByQuery(queryId);
}

export async function listAICitationChecksByPlatform(
  platform: string,
): Promise<AICitationCheck[]> {
  return _repoListByPlatform(platform);
}

export async function listAICitationChecksByBrand(
  brandEntityId: string,
): Promise<AICitationCheck[]> {
  // 通过 queryId 间接过滤：query.brandEntityId === brandEntityId
  // 本函数在 mock 场景下走简化路径：返回全部，由调用方按 query 列表过滤。
  // 注：保留 brandEntityId 参数以保持接口完整；未来引入真实 DB 后再实装过滤。
  void brandEntityId;
  const all = await _repoList();
  return all
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
}

/* ----------------- Aggregates ----------------- */

export interface CitationStats {
  totalChecks: number;
  mentionRate: number;          // 0-1
  citationRate: number;         // 0-1 (citedUrl 命中目标 URL 之一)
  averageGeoScore: number;      // 0-100
  byPlatform: Record<CitationPlatform, number>;
}

export async function computeCitationStats(
  targetBrandUrls: string[] = [],
): Promise<CitationStats> {
  const all = await _repoList();
  let mentioned = 0;
  let citedTarget = 0;
  let scoreSum = 0;
  const byPlatform = {} as Record<CitationPlatform, number>;
  for (const p of CITATION_PLATFORMS) byPlatform[p] = 0;
  for (const c of all) {
    if (c.mentioned) mentioned += 1;
    if (c.citedUrl && targetBrandUrls.includes(c.citedUrl)) citedTarget += 1;
    scoreSum += c.geoScore;
    byPlatform[c.platform] = (byPlatform[c.platform] ?? 0) + 1;
  }
  const total = all.length;
  return {
    totalChecks: total,
    mentionRate: total === 0 ? 0 : mentioned / total,
    citationRate: total === 0 ? 0 : citedTarget / total,
    averageGeoScore:
      total === 0 ? 0 : Math.round((scoreSum / total) * 10) / 10,
    byPlatform,
  };
}

/* ----------------- Trend ----------------- */

export interface TrendPoint {
  /** 日期 `YYYY-MM-DD`。 */
  date: string;
  mentionRate: number;
  citationRate: number;
  averageGeoScore: number;
  count: number;
}

/** 聚合每日趋势：按 checkedAt 日期分组。 */
export async function computeTrend(
  filter: { queryId?: string; platform?: CitationPlatform; targetBrandUrls?: string[] } = {},
): Promise<TrendPoint[]> {
  let all = await _repoList();
  if (filter.queryId) {
    all = all.filter((c) => c.queryId === filter.queryId);
  }
  if (filter.platform) {
    all = all.filter((c) => c.platform === filter.platform);
  }
  const targetUrls = filter.targetBrandUrls ?? [];
  // 按 date 分组
  const groups = new Map<string, AICitationCheck[]>();
  for (const c of all) {
    const d = c.checkedAt.slice(0, 10);
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d)!.push(c);
  }
  const points: TrendPoint[] = [];
  for (const [date, items] of groups) {
    const mentionCount = items.filter((c) => c.mentioned).length;
    const citationCount = items.filter(
      (c) => c.citedUrl && targetUrls.includes(c.citedUrl),
    ).length;
    const scoreSum = items.reduce((acc, c) => acc + c.geoScore, 0);
    points.push({
      date,
      mentionRate: items.length === 0 ? 0 : mentionCount / items.length,
      citationRate: items.length === 0 ? 0 : citationCount / items.length,
      averageGeoScore:
        items.length === 0 ? 0 : Math.round((scoreSum / items.length) * 10) / 10,
      count: items.length,
    });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

/* ----------------- Write ----------------- */

export interface RunCitationCheckInput {
  queryId: string;
  platform: CitationPlatform;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
  /** 覆盖项：直接传入已校验的 check 内容（不调 connector）。测试用。 */
  override?: {
    mentioned: boolean;
    citedUrl?: string;
    competitorMentions: string[];
    answerSummary: string;
    geoScore: number;
  };
}

export async function runCitationCheck(
  input: RunCitationCheckInput,
): Promise<AICitationCheck> {
  const platform = validatePlatform(input.platform);
  const checkedAt = validateCheckedAt(input.checkedAt);
  const query = await getAIQueryBankItem(input.queryId);
  if (!query) {
    throw new CitationMonitorServiceError(
      `AIQueryBankItem not found: ${input.queryId}`,
    );
  }
  const brand = await getBrandEntityProfile(query.brandEntityId);
  const targetBrandName = brand?.name ?? 'Brand';
  const targetBrandUrls = brand?.officialLinks ?? [];

  // 调 connector（除非 override）
  let mentioned: boolean;
  let citedUrl: string | undefined;
  let competitorMentions: string[];
  let answerSummary: string;
  let geoScore: number;
  if (input.override) {
    mentioned = input.override.mentioned;
    citedUrl = validateCitedUrl(input.override.citedUrl);
    competitorMentions = validateCompetitorMentions(
      input.override.competitorMentions,
    );
    answerSummary = validateAnswerSummary(input.override.answerSummary);
    geoScore = validateGeoScore(input.override.geoScore);
  } else {
    const connector = await getCitationMonitorConnector();
    const draft = await connector.runCheck({
      queryText: query.query,
      targetBrandName,
      targetBrandUrls,
      platform,
      checkedAt,
    });
    mentioned = draft.mentioned;
    citedUrl = validateCitedUrl(draft.citedUrl);
    competitorMentions = validateCompetitorMentions(draft.competitorMentions);
    answerSummary = validateAnswerSummary(draft.answerSummary);
    geoScore = validateGeoScore(draft.geoScore);
  }

  // id
  const id = `cite_${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const created: AICitationCheck = {
    id,
    queryId: query.id,
    platform,
    checkedAt,
    mentioned,
    competitorMentions,
    answerSummary,
    geoScore,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    ...(citedUrl !== undefined ? { citedUrl } : {}),
  };
  return _repoInsert(created);
}

/* ----------------- Manual entry (parallel to runCitationCheck) ----------------- */

/**
 * recordCitationCheck — 人工录入一次 AI 引用检查。
 *
 * 与 `runCitationCheck` 的区别：
 *   - runCitationCheck：通过 CitationMonitorConnector 拿结果（mock 派生 / 未来真实爬）
 *   - recordCitationCheck：调用方直接把答案 / 提及 / 引用 URL / 竞品 / 分数 录进来
 *
 * 用途：ChatGPT / Perplexity / Gemini / Google AI Overview / Claude 当前没有
 * 官方 API，本服务先用人工录入把"AI 答案里有没有提到我们"沉淀成可追踪数据，
 * 之后用 Search Console + Browser MCP 自动检测做 ground truth 对照。
 *
 * 字段校验与 runCitationCheck 完全一致（复用 validateXxx helpers），保持
 * 两条写路径写入的 AICitationCheck 同形。
 */
export interface RecordCitationCheckInput {
  queryId: string;
  platform: CitationPlatform;
  checkedAt: string;
  mentioned: boolean;
  /** 可选。存在时按 http(s) URL 校验。 */
  citedUrl?: string;
  /** 竞品名列表。≤ 20。 */
  competitorMentions: string[];
  /** AI 答案摘要，1-2000 字符。 */
  answerSummary: string;
  /** GEO 健康分 0-100 整数。 */
  geoScore: number;
  createdAt: string;
  updatedAt: string;
}

export async function recordCitationCheck(
  input: RecordCitationCheckInput,
): Promise<AICitationCheck> {
  if (typeof input.queryId !== 'string' || input.queryId.length === 0) {
    throw new CitationMonitorServiceError('queryId is required');
  }
  const query = await getAIQueryBankItem(input.queryId);
  if (!query) {
    throw new CitationMonitorServiceError(
      `AIQueryBankItem not found: ${input.queryId}`,
    );
  }
  const platform = validatePlatform(input.platform);
  const checkedAt = validateCheckedAt(input.checkedAt);
  const citedUrl = validateCitedUrl(input.citedUrl);
  const competitorMentions = validateCompetitorMentions(
    input.competitorMentions,
  );
  const answerSummary = validateAnswerSummary(input.answerSummary);
  const geoScore = validateGeoScore(input.geoScore);

  const id = `cite_${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const created: AICitationCheck = {
    id,
    queryId: query.id,
    platform,
    checkedAt,
    mentioned: Boolean(input.mentioned),
    competitorMentions,
    answerSummary,
    geoScore,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    ...(citedUrl !== undefined ? { citedUrl } : {}),
  };
  return _repoInsert(created);
}

/* ----------------- Report context ----------------- */

export interface CitationCheckReportContext {
  check: AICitationCheck;
  query: { id: string; query: string; platform: string; intent: string } | undefined;
  brand: { id: string; name: string; category: string } | undefined;
  targetBrandUrls: string[];
  citedUrlIsTarget: boolean;
}

export async function buildCitationReportContext(
  checkId: string,
): Promise<CitationCheckReportContext | undefined> {
  const check = await getAICitationCheck(checkId);
  if (!check) return undefined;
  const query = await getAIQueryBankItem(check.queryId);
  const brand = query
    ? await getBrandEntityProfile(query.brandEntityId)
    : undefined;
  const targetBrandUrls = brand?.officialLinks ?? [];
  return {
    check,
    query: query
      ? {
          id: query.id,
          query: query.query,
          platform: query.platform,
          intent: query.intent,
        }
      : undefined,
    brand: brand
      ? { id: brand.id, name: brand.name, category: brand.category }
      : undefined,
    targetBrandUrls,
    citedUrlIsTarget: check.citedUrl
      ? targetBrandUrls.includes(check.citedUrl)
      : false,
  };
}

/* ----------------- Weekly report ----------------- */

export interface WeeklyReport {
  /** 起 ISO 日期。 */
  startDate: string;
  /** 止 ISO 日期。 */
  endDate: string;
  totalChecks: number;
  mentionRate: number;
  citationRate: number;
  averageGeoScore: number;
  /** 按平台拆分的 stats。 */
  byPlatform: Record<
    CitationPlatform,
    { count: number; mentionRate: number; averageGeoScore: number }
  >;
  /** 按 query 拆分的 stats。 */
  byQuery: Array<{
    queryId: string;
    queryText: string;
    count: number;
    mentionRate: number;
    averageGeoScore: number;
  }>;
  /** 趋势点（按日）。 */
  trend: TrendPoint[];
  /** 命中目标的 citedUrl 列表。 */
  topCitedUrls: Array<{ url: string; count: number }>;
  /** 竞品出现频次。 */
  topCompetitors: Array<{ name: string; count: number }>;
}

export interface BuildWeeklyReportInput {
  startDate: string;
  endDate: string;
  brandEntityId?: string;
  targetBrandUrls?: string[];
}

export async function generateWeeklyReport(
  input: BuildWeeklyReportInput,
): Promise<WeeklyReport> {
  if (typeof input.startDate !== 'string' || !input.startDate) {
    throw new CitationMonitorServiceError('startDate is required');
  }
  if (typeof input.endDate !== 'string' || !input.endDate) {
    throw new CitationMonitorServiceError('endDate is required');
  }
  if (new Date(input.startDate).getTime() > new Date(input.endDate).getTime()) {
    throw new CitationMonitorServiceError(
      'startDate must be <= endDate',
    );
  }
  // 拿 brand 的 queryId 集合（如果给了 brandEntityId）
  let queryIdSet: Set<string> | undefined;
  let targetBrandUrls = input.targetBrandUrls ?? [];
  if (input.brandEntityId) {
    const { listAIQueryBankItemsByBrand } = await import(
      './aiQueryService'
    );
    const items = await listAIQueryBankItemsByBrand(input.brandEntityId);
    queryIdSet = new Set(items.map((i) => i.id));
    if (targetBrandUrls.length === 0) {
      const { getBrandEntityProfile } = await import('./geoBrandService');
      const brand = await getBrandEntityProfile(input.brandEntityId);
      targetBrandUrls = brand?.officialLinks ?? [];
    }
  }

  const all = await _repoList();
  const filtered = all.filter((c) => {
    if (c.checkedAt < input.startDate) return false;
    if (c.checkedAt > `${input.endDate}T23:59:59.999Z`) return false;
    if (queryIdSet && !queryIdSet.has(c.queryId)) return false;
    return true;
  });

  // total
  const total = filtered.length;
  const mentionCount = filtered.filter((c) => c.mentioned).length;
  const citationCount = filtered.filter(
    (c) => c.citedUrl && targetBrandUrls.includes(c.citedUrl),
  ).length;
  const scoreSum = filtered.reduce((acc, c) => acc + c.geoScore, 0);

  // by platform
  const byPlatform = {} as Record<
    CitationPlatform,
    { count: number; mentionRate: number; averageGeoScore: number }
  >;
  for (const p of CITATION_PLATFORMS) {
    const items = filtered.filter((c) => c.platform === p);
    const m = items.filter((c) => c.mentioned).length;
    const ss = items.reduce((acc, c) => acc + c.geoScore, 0);
    byPlatform[p] = {
      count: items.length,
      mentionRate: items.length === 0 ? 0 : m / items.length,
      averageGeoScore:
        items.length === 0 ? 0 : Math.round((ss / items.length) * 10) / 10,
    };
  }

  // by query
  const byQueryMap = new Map<string, AICitationCheck[]>();
  for (const c of filtered) {
    if (!byQueryMap.has(c.queryId)) byQueryMap.set(c.queryId, []);
    byQueryMap.get(c.queryId)!.push(c);
  }
  const byQuery: WeeklyReport['byQuery'] = [];
  const { getAIQueryBankItem } = await import('./aiQueryService');
  for (const [qid, items] of byQueryMap) {
    const m = items.filter((c) => c.mentioned).length;
    const ss = items.reduce((acc, c) => acc + c.geoScore, 0);
    const q = await getAIQueryBankItem(qid);
    byQuery.push({
      queryId: qid,
      queryText: q?.query ?? '(unknown)',
      count: items.length,
      mentionRate: items.length === 0 ? 0 : m / items.length,
      averageGeoScore:
        items.length === 0 ? 0 : Math.round((ss / items.length) * 10) / 10,
    });
  }
  byQuery.sort((a, b) => b.count - a.count);

  // trend
  const trend = await computeTrend({ targetBrandUrls });
  const trendInRange = trend.filter(
    (p) => p.date >= input.startDate.slice(0, 10) && p.date <= input.endDate.slice(0, 10),
  );

  // top cited urls
  const urlCount = new Map<string, number>();
  for (const c of filtered) {
    if (c.citedUrl) {
      urlCount.set(c.citedUrl, (urlCount.get(c.citedUrl) ?? 0) + 1);
    }
  }
  const topCitedUrls = Array.from(urlCount.entries())
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // top competitors
  const compCount = new Map<string, number>();
  for (const c of filtered) {
    for (const name of c.competitorMentions) {
      compCount.set(name, (compCount.get(name) ?? 0) + 1);
    }
  }
  const topCompetitors = Array.from(compCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    startDate: input.startDate.slice(0, 10),
    endDate: input.endDate.slice(0, 10),
    totalChecks: total,
    mentionRate: total === 0 ? 0 : mentionCount / total,
    citationRate: total === 0 ? 0 : citationCount / total,
    averageGeoScore: total === 0 ? 0 : Math.round((scoreSum / total) * 10) / 10,
    byPlatform,
    byQuery,
    trend: trendInRange,
    topCitedUrls,
    topCompetitors,
  };
}

/* ----------------- 7 GEO metrics (operational) ----------------- */

/**
 * GeoMetrics — 7 个 GEO 健康指标（0-1 / days / count）。
 *
 * 详细公式 / 阈值 / 行动建议见 /GEO_METRICS.md。
 *
 * | 指标                    | 单位      | 含义                            |
 * |-------------------------|-----------|----------------------------------|
 * | brandMentionRate        | 0-1       | 答案里提到目标 brand 的比例     |
 * | citationRate            | 0-1       | 引用 URL 命中 brand 官方链接的比例 |
 * | competitorMentionRate   | 0-1       | 答案里出现竞品的比例            |
 * | answerInclusionRate     | 0-1       | 答案里含 brand canonicalName/alias 的比例 |
 * | queryCoverage           | 0-1       | active bank items 中有 ≥1 次 check 的比例 |
 * | contentFreshnessDays    | days      | 关联内容资产平均 updatedAt 距今  |
 * | entityConsistency       | 0-1       | 答案里出现 brand canonicalName（而非 alias）的比例 |
 */
export interface GeoMetrics {
  totalChecks: number;
  /** 与 `mentionRate` 同值；保留两个名字以便逐步迁移。 */
  brandMentionRate: number;
  /** 与 `mentionRate` 同值（向后兼容）。 */
  mentionRate: number;
  /** 引用 brand 官方链接的比例。 */
  citationRate: number;
  /** 答案里出现竞品的比例。 */
  competitorMentionRate: number;
  /** 答案文本包含 brand canonicalName 或任何 alias 的比例。 */
  answerInclusionRate: number;
  /** active bank items 中有 ≥1 次 check 的比例。 */
  queryCoverage: number;
  /** 关联内容资产平均更新时间距 referenceDate 的天数。值越小越新鲜。 */
  contentFreshnessDays: number;
  /** 答案里出现 brand canonicalName（精确匹配，非 alias）的比例。 */
  entityConsistency: number;
}

export interface ComputeGeoMetricsInput {
  checks: AICitationCheck[];
  bankItems: AIQueryBankItem[];
  brand: BrandEntityProfile;
  contentAssets: ContentAsset[];
  /** 计算 contentFreshness 用的"今天"。ISO date (YYYY-MM-DD)。 */
  referenceDate: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function computeGeoMetrics(
  input: ComputeGeoMetricsInput,
): Promise<GeoMetrics> {
  const checks = Array.isArray(input.checks) ? input.checks : [];
  const bankItems = Array.isArray(input.bankItems) ? input.bankItems : [];
  const contentAssets = Array.isArray(input.contentAssets)
    ? input.contentAssets
    : [];
  const refTime = new Date(input.referenceDate).getTime();
  if (Number.isNaN(refTime)) {
    throw new CitationMonitorServiceError('referenceDate must be ISO date');
  }

  // 目标 brand 上下文。
  // 注：v2 BrandEntityProfile 没有 aliases / canonicalName 拆分；
  //     `name` 同时承担 canonical 角色。v0.1 GEOBrandEntity 才有
  //     canonicalName + aliases。后续 v3 brand 可拆出 aliases 再升级。
  const targetUrls = new Set(input.brand.officialLinks ?? []);
  const canonical = (input.brand.name ?? '').toLowerCase();
  const aliases: string[] = []; // v2 brand: 无 aliases 字段

  // 仅过滤该 brand 的 bank items（active 状态作为分母）
  const brandBankItems = bankItems.filter(
    (q) => q.brandEntityId === input.brand.id,
  );
  const activeBankItems = brandBankItems.filter((q) => q.status === 'active');
  const activeBankIdSet = new Set(activeBankItems.map((q) => q.id));

  // 取与该 brand 关联的 citation check（check.queryId ∈ activeBankIdSet）
  const brandChecks = checks.filter((c) => activeBankIdSet.has(c.queryId));

  const total = brandChecks.length;
  let mentionedCount = 0;
  let citationCount = 0;
  let competitorCount = 0;
  let inclusionCount = 0;
  let canonicalCount = 0;
  for (const c of brandChecks) {
    if (c.mentioned) mentionedCount += 1;
    if (c.citedUrl && targetUrls.has(c.citedUrl)) citationCount += 1;
    if (Array.isArray(c.competitorMentions) && c.competitorMentions.length > 0) {
      competitorCount += 1;
    }
    const lower = (c.answerSummary ?? '').toLowerCase();
    if (canonical && lower.includes(canonical)) {
      inclusionCount += 1;
      canonicalCount += 1;
    } else if (aliases.length > 0) {
      for (const a of aliases) {
        if (a && lower.includes(a)) {
          inclusionCount += 1;
          break;
        }
      }
    }
  }

  // queryCoverage = 该 brand active bank items 中有 ≥1 次 check 的比例
  const coveredIds = new Set(brandChecks.map((c) => c.queryId));
  let coveredCount = 0;
  for (const q of activeBankItems) {
    if (coveredIds.has(q.id)) coveredCount += 1;
  }
  const queryCoverage =
    activeBankItems.length === 0 ? 0 : coveredCount / activeBankItems.length;

  // contentFreshnessDays = 关联内容资产 updatedAt 距 referenceDate 的平均天数
  //   - 优先取被 answerSummary 引用过的（citedUrl in officialLinks）
  //   - 若没有，检查所有 brand.contentAssets
  //   - 若仍空，回退到所有 contentAssets（avoid 返回 NaN）
  const brandAssetIds = new Set(
    contentAssets
      .filter((a) => a.brandEntityId === input.brand.id)
      .map((a) => a.id),
  );
  let relevantAssets = contentAssets.filter((a) => brandAssetIds.has(a.id));
  if (relevantAssets.length === 0 && contentAssets.length > 0) {
    relevantAssets = contentAssets;
  }
  let freshnessSum = 0;
  for (const a of relevantAssets) {
    const t = new Date(a.updatedAt).getTime();
    if (Number.isNaN(t)) continue;
    const days = Math.max(0, (refTime - t) / DAY_MS);
    freshnessSum += days;
  }
  const contentFreshnessDays =
    relevantAssets.length === 0
      ? 0
      : Math.round((freshnessSum / relevantAssets.length) * 10) / 10;

  const safe = (n: number, d: number): number => (d === 0 ? 0 : n / d);

  return {
    totalChecks: total,
    mentionRate: safe(mentionedCount, total),
    brandMentionRate: safe(mentionedCount, total),
    citationRate: safe(citationCount, total),
    competitorMentionRate: safe(competitorCount, total),
    answerInclusionRate: safe(inclusionCount, total),
    queryCoverage,
    contentFreshnessDays,
    entityConsistency: safe(canonicalCount, total),
  };
}
