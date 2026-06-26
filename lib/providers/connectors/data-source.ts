/**
 * DataSourceConnector — 外部数据源统一接入。
 *
 * 任何"从网上 / 从第三方服务拉数据"的代码都必须通过本接口。
 * 禁止在 RSC / API route / 组件里直接调 fetch / axios 拉外部源。
 * 切真实 SDK（NewsAPI、RSS aggregator、付费信源）时只换实现，调用方零改动。
 */

import type { ResearchTopic, Signal, SourceItem } from '@/types';

/** 规范化后的数据形态：与 `mock-data` 中的同构。 */
export interface NormalizedBundle<T> {
  items: T[];
  /** 原始数据的指纹，用于去重 / 缓存命中判断。 */
  fingerprint: string;
  /** 抓取时间，ISO 8601（mock 实现用字面量）。 */
  fetchedAt: string;
}

export interface DataSourceConnector {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 拉取一个研究主题下的市场信号列表。 */
  fetchSignals(topic: ResearchTopic): Promise<Signal[]>;

  /** 拉取一个研究主题下的资料源。 */
  fetchSources(topic: ResearchTopic): Promise<SourceItem[]>;

  /** 把任意原始 payload 归一化到领域类型 T。 */
  normalizeData<T>(raw: unknown): Promise<NormalizedBundle<T>>;
}
