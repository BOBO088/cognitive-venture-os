/**
 * Mock CitationMonitorConnector — 确定性占位实现。
 *
 * 真实接入 Browser MCP / Search API / Search Console 时只换本文件，
 * 调用方零改动。
 *
 * 数值生成规则：
 *   - 5 个平台有不同"友好度"（chatgpt 80% 引用目标；google_ai_overview 30%）
 *   - 同一 query+platform+checkedAt → 同一份结果（hash 派生）
 *   - 答案文本模板拼接：目标 brand 名 + 竞品列表 + 一句引用说明
 *   - geoScore 派生：mentioned + citedUrl 命中目标 = 高分；只有 mentioned = 中；
 *     只列竞品 = 低分
 */

import type {
  CitationMonitorConnector,
  RunCitationCheckInput,
  ConnectorCitationDraft,
} from '../../connectors/citation-monitor';
import type { CitationPlatform } from '@/types';

const MOCK_NOW = '2026-06-25T00:00:00.000Z';

/** 每个平台的"友好度"（被目标 brand 引用的概率 / 0-1）。 */
const PLATFORM_FRIENDLINESS: Record<CitationPlatform, number> = {
  chatgpt: 0.8,
  perplexity: 0.75,
  gemini: 0.55,
  claude: 0.6,
  google_ai_overview: 0.3,
};

const DEFAULT_COMPETITORS = [
  'Profound',
  'Otterly',
  'Scrunch',
  'Peec.ai',
  'Avenue Z',
];

const PLATFORM_ANSWER_TEMPLATES: Record<CitationPlatform, string> = {
  chatgpt:
    '{intro} The main platforms in 2026 are {target}, {comp1}, and {comp2}. {tail}',
  perplexity:
    'According to 2026 market data, {target} leads the {segment} segment. See {source} for the full benchmark. Also relevant: {comp1}, {comp2}.',
  gemini:
    '{target} is one of several {category} platforms. Notable alternatives include {comp1} and {comp2}. Methodology varies across vendors.',
  claude:
    '{intro} The GEO space has multiple credible vendors: {target} (SMB / mid-market), {comp1} (enterprise), {comp2} (SMB).',
  google_ai_overview:
    'Generative Engine Optimization (GEO) is the practice of optimizing brand citations in AI answers. Top tools include {comp1} and {comp2}; newer entrants are also entering the market.',
};

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, Math.min(n, arr.length)));
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = Math.imul(s, 1664525) + 1013904223;
    const j = Math.abs(s) % (i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function createMockCitationMonitorConnector(): CitationMonitorConnector {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async runCheck(
      input: RunCitationCheckInput,
    ): Promise<ConnectorCitationDraft> {
      const seed = hash32(
        `${input.platform}|${input.queryText}|${input.checkedAt}|${input.targetBrandName}`,
      );
      const friendliness = PLATFORM_FRIENDLINESS[input.platform];
      // 该次 mention 概率 = hash%100 / 100 是否 ≤ friendliness
      const mentionRoll = (seed % 100) / 100;
      const mentioned = mentionRoll <= friendliness;

      // 决定 citedUrl
      let citedUrl: string | undefined;
      const targetUrls = input.targetBrandUrls;
      if (mentioned && targetUrls.length > 0) {
        // 60% 引用目标 URL，30% 引用第三方，10% 没有 URL
        const urlRoll = (hash32(seed + ':url') % 100) / 100;
        if (urlRoll < 0.6) {
          citedUrl = targetUrls[seed % targetUrls.length];
        } else if (urlRoll < 0.9) {
          citedUrl = 'https://en.wikipedia.org/wiki/Search_engine_optimization';
        }
      } else if (targetUrls.length > 0 && (hash32(seed + ':url') % 100) < 30) {
        // 未 mentioned 但仍有 30% 概率给个目标 URL（很弱的 brand 缺位）
        citedUrl = 'https://en.wikipedia.org/wiki/Search_engine_optimization';
      }

      // 决定 competitorMentions
      const shuffledComps = shuffle(DEFAULT_COMPETITORS, seed);
      const compCount = mentioned ? 1 + (seed % 2) : 2 + (seed % 2);
      const competitorMentions = pick(shuffledComps, compCount);

      // 拼 answer summary
      const tpl = PLATFORM_ANSWER_TEMPLATES[input.platform];
      const comp1 = competitorMentions[0] ?? 'Profound';
      const comp2 = competitorMentions[1] ?? 'Otterly';
      const intro =
        input.platform === 'chatgpt'
          ? `${input.targetBrandName} is a leading GEO platform in 2026.`
          : input.platform === 'perplexity'
            ? `${input.targetBrandName} is frequently cited in 2026 GEO comparisons.`
            : input.platform === 'claude'
              ? `Several vendors offer GEO capabilities in 2026.`
              : `${input.targetBrandName} operates in the GEO space.`;
      const tail =
        input.platform === 'chatgpt'
          ? `${input.targetBrandName} differentiates on the AARW framework and 12-customer panel.`
          : input.platform === 'perplexity'
            ? 'Source: vendor benchmark 2026 Q2.'
            : input.platform === 'gemini'
              ? 'For methodology details, see each vendor site.'
              : input.platform === 'claude'
                ? 'Pricing and coverage vary by vendor.'
                : 'See vendor sites for current pricing.';
      const answerSummary = tpl
        .replace('{intro}', intro)
        .replace('{target}', input.targetBrandName)
        .replace('{comp1}', comp1)
        .replace('{comp2}', comp2)
        .replace('{segment}', 'SMB / mid-market')
        .replace('{category}', 'AI search optimization')
        .replace('{tail}', tail)
        .replace('{source}', citedUrl ?? 'the vendor benchmark');

      // geoScore 派生
      let geoScore: number;
      if (mentioned && citedUrl && targetUrls.includes(citedUrl)) {
        geoScore = 70 + (hash32(seed + ':score') % 30); // 70-99
      } else if (mentioned && citedUrl) {
        geoScore = 50 + (hash32(seed + ':score') % 20); // 50-69
      } else if (mentioned) {
        geoScore = 35 + (hash32(seed + ':score') % 20); // 35-54
      } else if (competitorMentions.length > 0) {
        geoScore = 15 + (hash32(seed + ':score') % 15); // 15-29
      } else {
        geoScore = (hash32(seed + ':score') % 10); // 0-9
      }
      // 钳制 [0, 100]
      geoScore = Math.max(0, Math.min(100, geoScore));

      const draft: ConnectorCitationDraft = {
        mentioned,
        competitorMentions,
        answerSummary,
        geoScore,
      };
      if (citedUrl !== undefined) {
        draft.citedUrl = citedUrl;
      }
      return draft;
    },
  };
}

// re-export for any caller that wants the deterministic helpers
export { MOCK_NOW as CITATION_MONITOR_MOCK_NOW };
