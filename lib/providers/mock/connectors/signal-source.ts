/**
 * Mock SignalSourceConnector — 占位实现。
 *
 * 内部从 mock-data/opportunities.ts 读取 mockSignals，按 filter 过滤后返回。
 * 真实数据源（GitHub / RSS / News / MCP）切到时只改 create*Factory，
 * 业务层（signalService / UI）零改动。
 */

import { mockSignals } from '@/mock-data/opportunities';
import type { Signal, SignalCategory } from '@/types';
import type {
  SignalSourceConnector,
  SignalFetchFilter,
  SignalSourceHealth,
} from '../../connectors/signal-source';

const VALID_CATEGORIES: readonly SignalCategory[] = [
  'funding',
  'product_launch',
  'github_trend',
  'hiring_signal',
  'customer_pain',
  'regulation',
  'technology_breakthrough',
  'content_trend',
  'geo_trend',
  'ip_trend',
  'short_video_trend',
];

function isValidCategory(s: unknown): s is SignalCategory {
  return typeof s === 'string' && (VALID_CATEGORIES as readonly string[]).includes(s);
}

function isSignal(x: unknown): x is Signal {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o['id'] === 'string' &&
    typeof o['title'] === 'string' &&
    typeof o['source'] === 'string' &&
    isValidCategory(o['category']) &&
    typeof o['confidence'] === 'number'
  );
}

export function createMockSignalSourceConnector(): SignalSourceConnector {
  return {
    name: 'mock',

    async health(): Promise<SignalSourceHealth> {
      return { ok: true, provider: 'mock', detail: `${mockSignals.length} signals in store` };
    },

    async fetchSignals(filter?: SignalFetchFilter): Promise<Signal[]> {
      let out = mockSignals.slice();
      if (filter?.category) {
        out = out.filter((s) => s.category === filter.category);
      }
      if (filter?.minConfidence !== undefined) {
        out = out.filter((s) => s.confidence >= (filter.minConfidence ?? 0));
      }
      if (filter?.since) {
        const since = filter.since;
        out = out.filter((s) => s.createdAt >= since);
      }
      if (filter?.limit !== undefined && filter.limit >= 0) {
        out = out.slice(0, filter.limit);
      }
      // 默认按 createdAt desc
      out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return out;
    },

    async normalizeData(raw: unknown): Promise<Signal[]> {
      if (Array.isArray(raw)) {
        return raw.filter(isSignal);
      }
      if (raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)) {
        return ((raw as { items: unknown[] }).items).filter(isSignal);
      }
      if (isSignal(raw)) {
        return [raw];
      }
      return [];
    },
  };
}
