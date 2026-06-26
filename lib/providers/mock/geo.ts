/**
 * Mock GEOProvider — 确定性占位实现。
 *
 * v0.1 方法（generateSuggestions / analyzeCheck / suggestQueries）保留。
 * v2 方法 analyzeContentAsset：基于 asset 的字段 + hash 派生确定性内容。
 *
 * 设计原则：
 *   1. 不依赖 @/mock-data（provider 与数据层解耦）
 *   2. 不调真实 AI / 网络
 *   3. 输出基于输入可重现（用 hash 字段做种子）
 *   4. 时间字段用字面量 ISO，禁止 new Date()
 */

import type {
  GEOBrandEntity,
  GEOContentAsset,
  AIQuery,
  CitationCheckResult,
} from '@/types';
import type {
  GEOProvider,
  CheckAnalysis,
  AnalyzeContentAssetInput,
  AnalyzeContentAssetDraft,
} from '../geo';
import {
  CONTENT_ASSET_TYPE_LABEL,
  GEO_AUDIT_DIMENSION_LABEL,
} from '@/types';

const MOCK_NOW = '2026-06-25T00:00:00.000Z';
const SCORING_MODEL_VERSION = 'mock-v1';

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
  const seg = (n: number, len: number) =>
    (n >>> 0).toString(16).padStart(len, '0').slice(0, len);
  return `${seg(h, 8)}-${seg(h >> 8, 4)}-${seg(h >> 16, 4)}-${seg(h >> 24, 4)}-${seg(h, 12)}`;
}

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, Math.min(n, arr.length)));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** 计算距今多少天（用 lastUpdated 字符串）。 */
function daysSince(iso: string): number {
  // mock now = 2026-06-25
  const t = new Date(iso).getTime();
  const now = new Date(MOCK_NOW).getTime();
  if (Number.isNaN(t)) return 9999;
  return Math.max(0, Math.round((now - t) / (24 * 3600 * 1000)));
}

export function createMockGEOProvider(): GEOProvider {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async generateSuggestions(brand: GEOBrandEntity, recentChecks: CitationCheckResult[]) {
      const absents = recentChecks.filter((c) => c.verdict === 'absent').length;
      const cites = recentChecks.filter((c) => c.verdict === 'cited').length;
      return [
        {
          title: `[mock] "${brand.canonicalName} — what it is and who it's for"`,
          format: 'blog_post',
          targetQueries: [`what is ${brand.brandName}`, `how does ${brand.brandName} work`],
        },
        {
          title: `[mock] ${brand.canonicalName} vs alternatives — comparison page`,
          format: 'comparison',
          targetQueries: [`${brand.brandName} alternatives`, `${brand.canonicalName} vs`],
        },
        {
          title: `[mock] FAQ covering ${absents} unanswered queries`,
          format: 'faq',
          targetQueries: pick(recentChecks.filter((c) => c.verdict === 'absent').map((c) => c.queryId), 3),
        },
        {
          title: `[mock] Case study — convert ${cites} citation(s) into social proof`,
          format: 'case_study',
          targetQueries: [`${brand.canonicalName} customers`, `${brand.brandName} review`],
        },
      ] satisfies Array<Pick<GEOContentAsset, 'title' | 'format' | 'targetQueries'>>;
    },

    async analyzeCheck(check: CitationCheckResult, query: AIQuery) {
      const issues: string[] = [];
      const recommendations: string[] = [];
      const qref = `"${query.text}"`;
      switch (check.verdict) {
        case 'absent':
          issues.push(`Brand absent from AI answer for ${qref}.`);
          recommendations.push(`Publish a target-specific page for ${qref} with structured data.`);
          break;
        case 'mentioned':
          issues.push(`Brand named for ${qref} but not cited with a specific asset.`);
          recommendations.push('Add a canonical reference asset and link it from at least 2 high-authority sources.');
          break;
        case 'cited':
          issues.push(`Brand cited for ${qref}; check if position is competitive.`);
          recommendations.push('Refresh cited asset to defend position and add 1 supporting asset.');
          break;
        case 'competitor_only':
          issues.push(`Competitors cited for ${qref}, brand absent.`);
          recommendations.push('Produce a side-by-side comparison page; pitch updates to cited sources.');
          break;
      }
      return { issues, recommendations } satisfies CheckAnalysis;
    },

    async suggestQueries(brand: GEOBrandEntity, existing: AIQuery[]) {
      const existingTexts = new Set(existing.map((q) => q.text));
      const candidates = [
        `what is ${brand.canonicalName}`,
        `${brand.brandName} alternatives`,
        `${brand.canonicalName} pricing`,
        `is ${brand.brandName} worth it`,
        `${brand.canonicalName} vs competitors`,
      ];
      return candidates
        .filter((c) => !existingTexts.has(c))
        .map((text, i): AIQuery => ({
          id: uuid(`q:${brand.id}:${i}`),
          text,
          provider: 'openai',
          brandId: brand.id,
          pillar: brand.pillars[i % Math.max(1, brand.pillars.length)] ?? 'core',
          intent: text.includes('pricing') ? 'commercial' : 'informational',
          schedule: 'weekly',
          citationCheckIds: [],
          createdAt: MOCK_NOW,
          updatedAt: MOCK_NOW,
        }));
    },

    /**
     * v2: Content Asset 审计。
     *
     * 7 维分派生规则（mock，确定性）：
     *   - clarity:            65 + hash%30 + 摘要长度奖励
     *   - entity_consistency: 60 + hash%30 + 关联 entity 数量奖励
     *   - evidence_density:   50 + min(structuredEvidence.length * 10, 40) + hash%10
     *   - citation_worthiness:60 + hash%30 + 关联 target query 奖励
     *   - freshness:          100 - min(daysSince(lastUpdated), 90)
     *   - topical_authority:  60 + hash%30 + 摘要长度奖励
     *   - query_alignment:    50 + min(targetQueries.length * 12, 40) + hash%10
     *
     * geoScore 不在 provider 里算，service 用 GEO_AUDIT_WEIGHTS 重算。
     */
    async analyzeContentAsset(
      input: AnalyzeContentAssetInput,
    ): Promise<AnalyzeContentAssetDraft> {
      const seedBase = `${input.asset.id}|${input.inputType}|${input.asset.url}`;
      const summaryBonus = Math.min(20, Math.floor(input.asset.summary.length / 60));
      const evidenceBonus = Math.min(40, input.asset.structuredEvidence.length * 10);
      const queryBonus = Math.min(40, input.targetQueries.length * 12);
      const entityBonus = Math.min(20, input.graphEntities.length * 4);
      const days = daysSince(input.asset.lastUpdated);
      const freshness = clamp(100 - days, 20, 100);

      const dims = {
        clarity: clamp(
          65 + (hash32(seedBase + '|clarity') % 30) + summaryBonus,
          0,
          100,
        ),
        entityConsistency: clamp(
          60 + (hash32(seedBase + '|entity') % 30) + entityBonus,
          0,
          100,
        ),
        evidenceDensity: clamp(
          50 + evidenceBonus + (hash32(seedBase + '|evidence') % 10),
          0,
          100,
        ),
        citationWorthiness: clamp(
          60 + (hash32(seedBase + '|cite') % 30) + queryBonus,
          0,
          100,
        ),
        freshness,
        topicalAuthority: clamp(
          60 + (hash32(seedBase + '|authority') % 30) + summaryBonus,
          0,
          100,
        ),
        queryAlignment: clamp(
          50 + queryBonus + (hash32(seedBase + '|query') % 10),
          0,
          100,
        ),
      };

      const dimsForDraft: AnalyzeContentAssetDraft['score'] = { ...dims, geoScore: 0 };
      const suggestions = buildSuggestions(input, dimsForDraft);
      const explanation = buildExplanation(input, dimsForDraft);

      return {
        // geoScore 是占位值；service 会用 GEO_AUDIT_WEIGHTS 重算覆盖。
        score: { ...dims, geoScore: 0 },
        suggestions,
        explanation,
        scoringModelVersion: SCORING_MODEL_VERSION,
      };
    },
  };
}

/* ============================================================
 * analyzeContentAsset 内部：建议生成 + 解释生成。
 * ============================================================ */

function buildSuggestions(
  input: AnalyzeContentAssetInput,
  dims: AnalyzeContentAssetDraft['score'],
): AnalyzeContentAssetDraft['suggestions'] {
  const { asset, brand, targetQueries } = input;

  // 1. Target queries: 从现有 bank items 取，再加几条派生。
  const targetQs = targetQueries.map((q) => q.query);
  const bankDerived = [
    `how to use ${brand.name}`,
    `${brand.name} ${CONTENT_ASSET_TYPE_LABEL[asset.type].toLowerCase()}`,
    `best ${CONTENT_ASSET_TYPE_LABEL[asset.type].toLowerCase()} for ${brand.category}`,
  ];
  // 去重 + 截到 5-10
  const targetSet = Array.from(
    new Set([...targetQs, ...bankDerived]),
  ).slice(0, 10);
  while (targetSet.length < 5) {
    targetSet.push(
      `${brand.name} ${input.inputType.replace(/_/g, ' ')} example`,
    );
  }

  // 2. Core entities: brand name + key claims 抽 3-5 个。
  const coreEntities: string[] = [
    brand.name,
    ...brand.keyClaims.slice(0, 4).map((c) => {
      // 取 claim 的名词短语（粗略：第一个逗号前 / 前 6 个词）
      const head = c.split(/[,.]/)[0] ?? c;
      return head.length > 40 ? `${head.slice(0, 37)}...` : head;
    }),
  ].slice(0, 6);

  // 3. Definable terms
  const definableTerms = [
    `${brand.name} is ${brand.description.split(/[.,]/)[0] ?? brand.description}.`,
    ...brand.proofPoints.slice(0, 2).map(
      (p) => `${brand.name} ${p.split(/[,.]/)[0] ?? p}.`,
    ),
  ].slice(0, 6);

  // 4. Evidence checklist（按 evidence_density 决定数量）
  const evCount = dims.evidenceDensity < 50 ? 6 : dims.evidenceDensity < 75 ? 4 : 3;
  const evidenceChecklist: string[] = [];
  for (let i = 0; i < evCount; i += 1) {
    evidenceChecklist.push(
      `Add data point #${i + 1} for "${brand.name}" (e.g. customer count, ROI, time-to-result, market share).`,
    );
  }

  // 5. Comparison table (2-6 rows)
  const comparisonTable = [
    {
      dimension: 'Coverage',
      thisSide: `${brand.name} (this asset)`,
      otherSide: 'top alternative',
      source: 'mock benchmark',
    },
    {
      dimension: 'Pricing',
      thisSide: 'see asset body',
      otherSide: 'see alternative',
    },
    {
      dimension: 'AI citation rate (last 30d)',
      thisSide: '— (instrument)',
      otherSide: '— (instrument)',
    },
  ];

  // 6. FAQ suggestions (3-8)
  const faqSuggestions: AnalyzeContentAssetDraft['suggestions']['faqSuggestions'] =
    [
      {
        question: `What is ${brand.name}?`,
        answer: brand.description.split(/[.,]/)[0] ?? brand.description,
      },
      {
        question: `How is ${brand.name} different from alternatives?`,
        answer: `${brand.name} differentiates on: ${brand.keyClaims.slice(0, 3).join('; ')}.`,
      },
    ];
  for (const q of targetQueries.slice(0, 4)) {
    faqSuggestions.push({
      question: q.query,
      answer: `Answer: ${brand.name} addresses this via ${brand.keyClaims[0] ?? 'its core offering'}.`,
      ...(q.id ? { relatedBankItemId: q.id } : {}),
    });
  }

  // 7. Structured suggestions
  const structuredSuggestions: string[] = [
    'Add a hero definition box (schema.org DefinedTerm).',
    'Add a comparison table widget for the top alternative.',
    'Embed an FAQ block with FAQPage JSON-LD schema.',
  ];
  if (dims.freshness < 60) {
    structuredSuggestions.push(
      'Refresh the "Last updated" timestamp and add a new data point.',
    );
  }
  if (dims.evidenceDensity < 60) {
    structuredSuggestions.push(
      'Add 3+ inline data citations with source links.',
    );
  }

  // 9. Optimized outline
  const optimizedOutline: AnalyzeContentAssetDraft['suggestions']['optimizedOutline'] =
    [
      {
        heading: 'TL;DR / Hero definition',
        purpose: `Answer the #1 query in 30 words and capture AI snippet.`,
        targetQueries: [targetSet[0] ?? `what is ${brand.name}`],
        notes: 'Embed schema.org DefinedTerm; keep ≤ 60 words.',
      },
      {
        heading: 'What this is / Why now',
        purpose: 'Set context and frame the problem.',
        targetQueries: targetSet.slice(0, 2),
        notes: '2-3 short paragraphs, 1 stat, 1 chart optional.',
      },
      {
        heading: 'How it works / Step-by-step',
        purpose: 'Give the reader a concrete next step.',
        targetQueries: targetSet.slice(1, 4),
        notes: 'Numbered list; one screenshot per step.',
      },
      {
        heading: 'Comparison / Alternatives',
        purpose: 'Address comparison intent.',
        targetQueries: targetSet.filter((q) =>
          /vs|alternative|competitor/i.test(q),
        ),
        notes: 'Use the comparison table from suggestions.',
      },
      {
        heading: 'FAQ',
        purpose: 'Capture long-tail queries.',
        targetQueries: targetSet,
        notes: 'Use the FAQ suggestions; add FAQPage schema.',
      },
    ];

  return {
    targetQueries: targetSet,
    coreEntities,
    definableTerms,
    evidenceChecklist,
    comparisonTable,
    faqSuggestions,
    structuredSuggestions,
    optimizedOutline,
  };
}

function buildExplanation(
  input: AnalyzeContentAssetInput,
  dims: AnalyzeContentAssetDraft['score'],
): string {
  type DimKey = Exclude<keyof typeof dims, 'geoScore'>;
  const entries = Object.entries(dims)
    .filter(([k]) => k !== 'geoScore')
    .sort(([, a], [, b]) => b - a) as Array<[DimKey, number]>;
  const top = entries[0];
  const bottom = entries[entries.length - 1];
  if (!top || !bottom) {
    return `Mock audit for ${input.asset.title}.`;
  }
  return (
    `Mock audit for "${input.asset.title}" (${CONTENT_ASSET_TYPE_LABEL[input.asset.type]}, ` +
    `input=${input.inputType}). ` +
    `Strongest dimension: ${dimLabel(top[0])} (${top[1]}). ` +
    `Weakest: ${dimLabel(bottom[0])} (${bottom[1]}). ` +
    `Top-priority fix: address ${dimLabel(bottom[0])} first; ` +
    `this typically moves the overall GEO score 5-10 points.`
  );
}

function dimLabel(k: Exclude<keyof AnalyzeContentAssetDraft['score'], 'geoScore'>): string {
  switch (k) {
    case 'clarity': return GEO_AUDIT_DIMENSION_LABEL.clarity;
    case 'entityConsistency': return GEO_AUDIT_DIMENSION_LABEL.entity_consistency;
    case 'evidenceDensity': return GEO_AUDIT_DIMENSION_LABEL.evidence_density;
    case 'citationWorthiness': return GEO_AUDIT_DIMENSION_LABEL.citation_worthiness;
    case 'freshness': return GEO_AUDIT_DIMENSION_LABEL.freshness;
    case 'topicalAuthority': return GEO_AUDIT_DIMENSION_LABEL.topical_authority;
    case 'queryAlignment': return GEO_AUDIT_DIMENSION_LABEL.query_alignment;
  }
}
