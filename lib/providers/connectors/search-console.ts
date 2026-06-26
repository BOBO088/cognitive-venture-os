/**
 * SearchConsoleConnector — Google Search Console 数据接入（占位）。
 *
 * 用途：
 *   - 拉取目标站点在 Google 搜索上的点击 / 展示 / CTR / 平均位次，
 *     作为"品牌是否被 AI 答案引用"的 ground truth 之一。
 *   - 拉取 URL Inspection 结果（某条 URL 是否被 Google 编入索引）。
 *
 * 当前实现 = mock。接入真实 Google Search Console API 时只换实现：
 *   - OAuth 2.0 flow → `searchanalytics.query` + `urlInspection.index.inspect`
 *   - 凭据从 `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` / `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` 读
 *
 * 注意：本接口不直接调 HTTP / SDK。所有外部 IO 走 mock / real 实现，
 * 调用方零改动。
 */

export interface FetchSearchAnalyticsInput {
  /** 站点 URL（"https://example.com/" 或 "sc-domain:example.com"）。 */
  siteUrl: string;
  /** 起日期，ISO 8601 (`YYYY-MM-DD`)。 */
  startDate: string;
  /** 止日期，ISO 8601 (`YYYY-MM-DD`)。 */
  endDate: string;
  /** 可选：按 query / page / country / device 维度拆。 */
  dimensions?: Array<'query' | 'page' | 'country' | 'device'>;
  /** 可选：限制返回行数（默认 1000）。 */
  rowLimit?: number;
}

/** 单条 search analytics 数据。 */
export interface SearchAnalyticsRow {
  /** 触发该结果的搜索词（如果 dimensions 含 'query'）。 */
  query?: string;
  /** 被点击 / 展示的页面 URL（如果 dimensions 含 'page'）。 */
  page?: string;
  /** 国家（如果 dimensions 含 'country'）。 */
  country?: string;
  /** 设备（如果 dimensions 含 'device'）。 */
  device?: string;
  /** 点击数。 */
  clicks: number;
  /** 展示数。 */
  impressions: number;
  /** 点击率 (0-1)。 */
  ctr: number;
  /** 平均位次。 */
  position: number;
}

export interface FetchSearchAnalyticsResult {
  siteUrl: string;
  startDate: string;
  endDate: string;
  rows: SearchAnalyticsRow[];
  fetchedAt: string;
}

export interface FetchUrlInspectionInput {
  /** 要检查的 URL。 */
  inspectionUrl: string;
  /** 该 URL 所属的 siteUrl（同 FetchSearchAnalyticsInput.siteUrl）。 */
  siteUrl: string;
}

export interface FetchUrlInspectionResult {
  inspectionUrl: string;
  siteUrl: string;
  /** 是否在 Google 索引里。 */
  indexStatus: 'indexed' | 'not_indexed' | 'unknown';
  /** 移动可用性是否通过。 */
  mobileUsable: boolean;
  /** 最近一次 Google 爬取时间，ISO 8601（可能为 undefined）。 */
  lastCrawledAt?: string;
  fetchedAt: string;
}

export interface SearchConsoleConnector {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 拉一段时间内某站点的搜索表现。 */
  fetchSearchAnalytics(
    input: FetchSearchAnalyticsInput,
  ): Promise<FetchSearchAnalyticsResult>;

  /** 检查某 URL 是否被 Google 索引。 */
  fetchUrlInspection(
    input: FetchUrlInspectionInput,
  ): Promise<FetchUrlInspectionResult>;
}
