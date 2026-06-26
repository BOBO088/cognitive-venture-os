/**
 * SignalSourceConnector — 外部信号源统一接入。
 *
 * 任何「从 GitHub / RSS / 新闻 / MCP / 第三方 API 拉 Signal 数据」的代码
 * 必须通过本接口。禁止在 RSC / API route / 组件里直接调外部 API。
 *
 * 未来切真实数据源时，新增一个 services/signals/<provider>/index.ts
 * （或在本目录的子目录里）实现本接口；调用方零改动。
 *
 * 当前 MVP：所有 provider 共用一个 mock 实现（lib/providers/mock/connectors/signal-source.ts），
 * 真实数据从 mock-data/opportunities.ts 的 mockSignals 读出。
 */

import type { Signal, SignalCategory } from '@/types';

/** 拉取过滤条件。 */
export interface SignalFetchFilter {
  /** 按 category 过滤。 */
  category?: SignalCategory;
  /** 拉取 confidence >= 此值。 */
  minConfidence?: number;
  /** 自该时间之后（ISO 8601）。 */
  since?: string;
  /** 最多返回多少条。 */
  limit?: number;
}

/** Connector 健康状态。 */
export interface SignalSourceHealth {
  ok: boolean;
  /** provider 名（"github" / "rss" / "news" / "mcp" / "mock"）。 */
  provider: string;
  detail?: string;
}

export interface SignalSourceConnector {
  /** provider 名。 */
  readonly name: string;

  /** 健康检查。 */
  health(): Promise<SignalSourceHealth>;

  /**
   * 拉取一批 Signal。
   * mock 实现从 mock-data 读取；真实实现对接 GitHub Trending API /
   * RSS aggregator / News API / MCP servers。
   */
  fetchSignals(filter?: SignalFetchFilter): Promise<Signal[]>;

  /**
   * 把任意原始 payload 归一化到 Signal[]。
   * 不同 provider 返回结构不同，本方法负责统一。
   */
  normalizeData(raw: unknown): Promise<Signal[]>;
}
