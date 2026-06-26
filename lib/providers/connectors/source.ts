/**
 * SourceConnector — 资料元数据抽取。
 *
 * 未来可承载 4 种实现：
 *   - RSS feed reader：fetchRssFeed → SourceDraft[]
 *   - Browser MCP / Playwright：fetchFromUrl（带 JS 渲染的网页）
 *   - 通用网页抓取：fetchFromUrl（轻量 HTTP 抓取）
 *   - 文件上传解析：fetchFromUpload（PDF / docx / md → 提取 metadata）
 *
 * MVP 阶段 service 不强制使用 connector；connector 是"快捷创建"路径
 * （粘贴 URL → 预填 title / summary / type → 人工确认后入库）。
 */

import type { SourceType } from '@/types';

/** connector 抽取出的元数据草稿，待人工补全后入库。 */
export interface SourceDraft {
  title: string;
  url?: string;
  type: SourceType;
  summary?: string;
  author?: string;
  publishedAt?: string;
  /** 抽取出的 tags 候选（不强制采用）。 */
  suggestedTags?: string[];
  /** 抽取出的可信度猜测（0..100），仅作参考。 */
  suggestedCredibilityScore?: number;
}

export interface SourceConnector {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 从 URL 拉取 metadata（网页 / 文章 / 论文页）。 */
  fetchFromUrl(url: string): Promise<SourceDraft | null>;

  /** 解析上传文件（PDF / docx / md），抽取 metadata。 */
  fetchFromUpload(file: { name: string; content: string }): Promise<SourceDraft | null>;

  /** 拉取 RSS / Atom feed 内的条目列表。 */
  fetchRssFeed(feedUrl: string): Promise<SourceDraft[]>;
}
