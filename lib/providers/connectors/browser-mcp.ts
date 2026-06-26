/**
 * BrowserMCPConnector — 通过 Browser MCP 跑 AI 搜索答案（占位）。
 *
 * 用途：
 *   - 在 ChatGPT / Perplexity / Gemini / Google AI Overview / Claude 的网页版
 *     真实输入 query，拿回原样答案 + 引用 URL。
 *   - 这是 CitationMonitorConnector "真实接入" 的远期实现方式之一。
 *
 * 当前实现 = mock。接入真实 Browser MCP 时只换实现：
 *   - `@modelcontextprotocol/sdk` + 浏览器自动化 server（如 Playwright MCP）
 *   - 必须遵守 robots.txt / 各平台 ToS；本工程不绕过任何反爬机制。
 *
 * 注意：本接口不直接调 SDK。所有外部 IO 走 mock / real 实现，调用方零改动。
 */

import type { CitationPlatform } from '@/types';

export interface RunQueryInput {
  /** 要在 AI 平台上提问的自然语言问题。 */
  query: string;
  /** 跑哪个 AI 平台。 */
  platform: CitationPlatform;
  /** 可选：用户登录态（用于跨会话的稳定身份）。 */
  sessionHint?: string;
}

export interface RunQueryResult {
  platform: CitationPlatform;
  query: string;
  /** AI 返回的原样答案文本。 */
  rawAnswer: string;
  /** 答案里出现的 URL（按出现顺序）。 */
  citedUrls: string[];
  /** 抓取时间，ISO 8601。 */
  fetchedAt: string;
  /** 一次实际访问后能否拿到答案的标志（mock 永远 true）。 */
  ok: boolean;
  /** 当 ok=false 时，记录失败原因（rate-limited / login-required / 等）。 */
  failureReason?: string;
}

export interface BrowserMCPConnector {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /**
   * 在指定 AI 平台上跑一次 query，拿到原样答案。
   * 真实接入：Browser MCP navigate → input → click → wait → extract。
   */
  runQuery(input: RunQueryInput): Promise<RunQueryResult>;
}
