/**
 * CitationMonitorConnector — AI 搜索答案引用监控的外部接入。
 *
 * 把"在 AI 平台上跑一次 query、拿到答案、解析 brand 提及 / URL 引用 / 竞品"
 * 这件事收口到本接口。预留接入：
 *   - Browser MCP（模拟浏览器跑 ChatGPT / Perplexity 答案页）
 *   - 各平台 Search / Answer API（Perplexity API / OpenAI with web search 等）
 *   - Google Search Console（拿 SERP 引用片段做 ground truth）
 *
 * 当前为 mock 实现：基于 query 文本 + 平台 + brand 名 + 时间戳做 hash，派生
 * 确定性结果（mentioned / citedUrl / competitorMentions / answerSummary /
 * geoScore），让 UI 始终有数据且可重现。
 *
 * 设计：connector 只负责"跑一次"返回"原样结果"；service 层负责把结果
 * 拼装成 AICitationCheck 并写入仓储。这样：
 *   1. 不同平台可以独立实现（Browser MCP 跑 Perplexity、API 跑 ChatGPT）
 *   2. connector 失败不会影响其他平台
 *   3. service 端可以做时间戳 / freshness 标记
 */

import type { CitationPlatform } from '@/types';

export interface RunCitationCheckInput {
  /** AI 搜索 query 文本（自然语言问题）。 */
  queryText: string;
  /** 目标 brand 名（用于判断 mentioned / citedUrl 是否指向目标）。 */
  targetBrandName: string;
  /** 目标 brand 的官方 URL 列表（用于判定 citedUrl 是否 = 目标 URL）。 */
  targetBrandUrls: string[];
  /** 监控平台。 */
  platform: CitationPlatform;
  /** 检查时间（ISO 8601）。 */
  checkedAt: string;
}

/** 单次 connector 调用的原样结果。service 层把它包成 AICitationCheck。 */
export interface ConnectorCitationDraft {
  mentioned: boolean;
  /** 答案里出现的 URL（可能是目标 URL，也可能是竞品 / 第三方）。 */
  citedUrl?: string;
  /** 答案里出现的竞品 brand 名（按出现顺序）。 */
  competitorMentions: string[];
  /** AI 答案的摘要文本。 */
  answerSummary: string;
  /** 0-100 整数。 */
  geoScore: number;
}

export interface CitationMonitorConnector {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /**
   * 在指定平台上跑一次 query，返回原样结果。
   * 真实接入：Browser MCP 跑 Perplexity / Search API 跑 ChatGPT。
   */
  runCheck(input: RunCitationCheckInput): Promise<ConnectorCitationDraft>;
}
