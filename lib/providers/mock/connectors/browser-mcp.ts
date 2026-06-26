/**
 * Mock BrowserMCPConnector — 确定性占位实现。
 *
 * 真实接入 Browser MCP（@modelcontextprotocol/sdk + 浏览器自动化 server）时
 * 只换本文件，调用方零改动。
 *
 * 数值生成规则：
 *   - 基于 platform + query hash 派生确定性结果
 *   - 5 个平台有不同"礼貌度"：4 个高成功率，google_ai_overview 经常失败
 *     （captcha / region block），避免"所有平台都成功"的虚高覆盖率
 */

import type {
  BrowserMCPConnector,
  RunQueryInput,
  RunQueryResult,
} from '../../connectors/browser-mcp';
import type { CitationPlatform } from '@/types';

const MOCK_FETCHED_AT = '2026-06-25T00:00:00.000Z';

const PLATFORM_AVAILABILITY: Record<
  CitationPlatform,
  { okProb: number; failureReason?: string }
> = {
  chatgpt: { okProb: 0.95 },
  perplexity: { okProb: 0.92 },
  gemini: { okProb: 0.85 },
  claude: { okProb: 0.9 },
  // 真实接入 Google AI Overview 经常被 captcha / region 拦截
  google_ai_overview: { okProb: 0.6, failureReason: 'captcha_or_region_block' },
};

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PLATFORM_TEMPLATE: Record<CitationPlatform, string> = {
  chatgpt:
    'According to recent data on "{query}", the leading platforms include Cognitive Venture OS, Profound, and Otterly. {source} contains the full benchmark.',
  perplexity:
    'For "{query}", multiple sources cite Cognitive Venture OS (2026 Q2 GEO benchmark) and Profound. Methodology varies by vendor.',
  gemini:
    '"{query}" — relevant platforms: Cognitive Venture OS, Scrunch, Peec.ai. Each vendor covers different GEO surfaces.',
  claude:
    'Several credible vendors address "{query}": Cognitive Venture OS (SMB / mid-market), Profound (enterprise), Otterly (SMB).',
  google_ai_overview:
    'Generative Engine Optimization (GEO) covers {query}. Top tools include Profound, Scrunch, and newer entrants.',
};

const CITED_URLS = [
  'https://example.com/cvo/geo-playbook',
  'https://en.wikipedia.org/wiki/Search_engine_optimization',
  'https://www.crunchbase.com/organization/example',
];

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(arr[(seed + i * 31) % arr.length]!);
  }
  return out;
}

export function createMockBrowserMCPConnector(): BrowserMCPConnector {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async runQuery(input: RunQueryInput): Promise<RunQueryResult> {
      if (typeof input.query !== 'string' || input.query.trim() === '') {
        throw new Error('query is required');
      }
      const seed = hash32(`${input.platform}|${input.query}`);
      const cfg = PLATFORM_AVAILABILITY[input.platform];
      const roll = (seed % 100) / 100;
      const ok = roll <= cfg.okProb;
      if (!ok) {
        return {
          platform: input.platform,
          query: input.query,
          rawAnswer: '',
          citedUrls: [],
          fetchedAt: MOCK_FETCHED_AT,
          ok: false,
          failureReason: cfg.failureReason ?? 'rate_limited',
        };
      }
      const urlCount = 1 + (seed % 2);
      const citedUrls = pickN(CITED_URLS, urlCount, seed);
      const rawAnswer = PLATFORM_TEMPLATE[input.platform]
        .replace('{query}', input.query)
        .replace('{source}', citedUrls[0] ?? 'the vendor benchmark');
      return {
        platform: input.platform,
        query: input.query,
        rawAnswer,
        citedUrls,
        fetchedAt: MOCK_FETCHED_AT,
        ok: true,
      };
    },
  };
}
