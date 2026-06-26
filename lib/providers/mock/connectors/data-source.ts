/**
 * Mock DataSourceConnector — 确定性占位实现。
 *
 * 不读 mock-data；嵌入最小化的"信源"硬编码以保证可独立运行。
 */

import type { ResearchTopic, Signal, SourceItem } from '@/types';
import type {
  DataSourceConnector,
  NormalizedBundle,
} from '../../connectors/data-source';

const MOCK_NOW = '2026-06-25T00:00:00.000Z';

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 基于 topic id 派生一组稳定 signals。 */
function makeSignals(topic: ResearchTopic): Signal[] {
  return [0, 1, 2].map((i) => {
    const h = hash32(`${topic.id}:${i}`);
    return {
      id: `mock-signal-${topic.id}-${i}`,
      title: `[mock signal] ${topic.title} — observation ${i + 1}`,
      source: `mock-connector:topic:${topic.id}`,
      category: (['funding', 'product_launch', 'hiring_signal', 'regulation'] as const)[i] ?? 'geo_trend',
      confidence: 50 + (h % 50),
      description: `Auto-generated mock signal #${i + 1} for topic "${topic.title}".`,
      evidence: `mock evidence batch ${i + 1} (hash=${h.toString(16)})`,
      linkedEntityIds: [],
      linkedResearchCardIds: [],
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    } satisfies Signal;
  });
}

function makeSources(topic: ResearchTopic): SourceItem[] {
  return [0, 1].map((i) => {
    return {
      id: `mock-source-${topic.id}-${i}`,
      title: `[mock source] ${topic.title} reference ${i + 1}`,
      url: `https://example.com/mock/${topic.id}/${i}`,
      type: i === 0 ? 'article' : 'report',
      author: 'Mock Author',
      publishedAt: '2026-06-10T00:00:00.000Z',
      summary: `Excerpt for mock source #${i + 1} of topic "${topic.title}".`,
      credibilityScore: i === 0 ? 80 : 50,
      tags: ['mock'],
      topicId: topic.id,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    } satisfies SourceItem;
  });
}

export function createMockDataSourceConnector(): DataSourceConnector {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async fetchSignals(topic: ResearchTopic) {
      return makeSignals(topic);
    },

    async fetchSources(topic: ResearchTopic) {
      return makeSources(topic);
    },

    async normalizeData<T>(raw: unknown) {
      const items: T[] = Array.isArray(raw) ? (raw as T[]) : raw == null ? [] : [raw as T];
      const fingerprint = `mock-fp-${items.length}-${hash32(JSON.stringify(items).slice(0, 64))}`;
      return { items, fingerprint, fetchedAt: MOCK_NOW } as NormalizedBundle<T>;
    },
  };
}
