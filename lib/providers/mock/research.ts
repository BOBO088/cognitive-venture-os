/**
 * Mock ResearchProvider — 确定性占位实现。
 */

import type {
  ResearchTopic,
  ResearchCard,
  SourceItem,
  GraphEntity,
  GraphRelation,
} from '@/types';
import type { ResearchProvider } from '../research';

const MOCK_NOW = '2026-06-25T00:00:00.000Z';

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function uuid(seed: string): string {
  const h = hash32(seed);
  const seg = (n: number, len: number) => (n >>> 0).toString(16).padStart(len, '0').slice(0, len);
  return `${seg(h, 8)}-${seg(h >> 8, 4)}-${seg(h >> 16, 4)}-${seg(h >> 24, 4)}-${seg(h, 12)}`;
}

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, Math.min(n, arr.length)));
}

export function createMockResearchProvider(): ResearchProvider {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async suggestTopics(seed: string, count = 3) {
      const n = Math.max(1, Math.min(10, count));
      const topics: ResearchTopic[] = [];
      for (let i = 0; i < n; i++) {
        const id = uuid(`topic:${seed}:${i}`);
        topics.push({
          id,
          title: `[mock] ${seed} — angle ${i + 1}`,
          question: `What does "${seed}" look like in segment ${i + 1}?`,
          scope: `Sub-topic ${i + 1} derived from seed "${seed}".`,
          status: 'active',
          sourceIds: [],
          cardIds: [],
          signalIds: [],
          createdAt: MOCK_NOW,
          updatedAt: MOCK_NOW,
        });
      }
      return topics;
    },

    async extractInsights(source: SourceItem, count = 2) {
      const n = Math.max(1, Math.min(5, count));
      const cards: ResearchCard[] = [];
      for (let i = 0; i < n; i++) {
        const id = uuid(`insight:${source.id}:${i}`);
        cards.push({
          id,
          topicId: source.topicId ?? 'unassigned',
          title: `[mock] Insight ${i + 1} from "${source.title}"`,
          summary: `Mock insight #${i + 1} distilled from the source. Real provider would surface evidence and confidence breakdown.`,
          score: 40 + ((hash32(source.id) >> i) % 60),
          tags: ['mock', source.type],
          sourceIds: [source.id],
          graphEntityIds: [],
          createdAt: MOCK_NOW,
          updatedAt: MOCK_NOW,
        });
      }
      return cards;
    },

    async findRelatedCards(card: ResearchCard, allCards: ResearchCard[], limit = 3) {
      // 简单"共享 tag 越多越相关"排序
      const tagSet = new Set(card.tags ?? []);
      const scored = allCards
        .filter((c) => c.id !== card.id)
        .map((c) => ({
          card: c,
          score: (c.tags ?? []).reduce((acc, t) => acc + (tagSet.has(t) ? 1 : 0), 0),
        }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);
      return pick(scored.map((s) => s.card), limit);
    },

    async expandGraph(entity: GraphEntity) {
      const kinds: GraphRelation['relationType'][] = ['similar_to', 'mentioned_in', 'influences', 'competes_with'];
      const out: GraphRelation[] = [];
      for (let i = 0; i < 2; i++) {
        const relationType = kinds[(hash32(entity.id) + i) % kinds.length];
        out.push({
          id: uuid(`rel:${entity.id}:${i}`),
          sourceEntityId: entity.id,
          targetEntityId: `mock-target-${i}`,
          relationType,
          strength: 50,
          evidence: `[mock] inferred from entity "${entity.name}"`,
          linkedResearchCardIds: [],
          createdAt: MOCK_NOW,
          updatedAt: MOCK_NOW,
        });
      }
      return out;
    },
  };
}
