/**
 * Mock EvaluationProvider — 确定性占位实现。
 *
 * 设计原则：
 *   1. 不依赖 @/mock-data（provider 与数据层解耦）
 *   2. 不调真实 AI / 网络
 *   3. 输出基于输入可重现（用 hash 字段做种子）
 *   4. 时间字段用字面量 ISO，禁止 new Date()
 *
 * 行为：
 *   - score() 用 SCORING_WEIGHTS 算 totalScore（与 service 重算一致，保证幂等）
 *   - explanation 用规则模板：取 top-1 高分维度 + 1 个最低分维度生成自然语言
 *     解释，再拼一个由 hash 派生的"建议"行（确定性）。
 */

import {
  computeWeightedTotal,
  type EvaluationProvider,
  type EvaluationResult,
  type EvaluationScoreInput,
} from '../evaluation';
import { SCORING_WEIGHTS, type ScoringDimension } from '@/types';

/** 简易 hash：把任意 string 映射到 32-bit 整数，用于生成稳定 id / 评分。 */
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 把 9 个维度按分数降序排，返回维度数组。 */
function rankDims(input: EvaluationScoreInput): Array<[ScoringDimension, number]> {
  const dims: Array<[ScoringDimension, number]> = [
    ['marketSize', input.marketSize],
    ['painIntensity', input.painIntensity],
    ['competition', input.competition],
    ['technicalFeasibility', input.technicalFeasibility],
    ['monetization', input.monetization],
    ['speedToMarket', input.speedToMarket],
    ['founderFit', input.founderFit],
    ['geoPotential', input.geoPotential],
    ['ipPotential', input.ipPotential],
  ];
  return dims.sort((a, b) => b[1] - a[1]);
}

const DIM_LABEL: Record<ScoringDimension, string> = {
  marketSize: 'Market size',
  painIntensity: 'Pain intensity',
  competition: 'Competition gap', // 高分 = 竞争少
  technicalFeasibility: 'Technical feasibility',
  monetization: 'Monetization',
  speedToMarket: 'Speed to market',
  founderFit: 'Founder fit',
  geoPotential: 'GEO potential',
  ipPotential: 'IP potential',
};

const ADVICE_TEMPLATES: ReadonlyArray<string> = [
  'Lean into the top driver; design the MVP to either compensate for the weakest signal or turn it into a feature.',
  'Schedule a 1-week experiment to address the weakest signal before scaling. Use the top driver in positioning.',
  'Lead the marketing story with the top driver. Write a public thesis on why the weakest signal still works.',
];

function buildExplanation(
  total: number,
  top: ScoringDimension,
  low: ScoringDimension,
  adviceSeed: number,
): string {
  const topPct = (SCORING_WEIGHTS[top] * 100).toFixed(0);
  const lowPct = (SCORING_WEIGHTS[low] * 100).toFixed(0);
  const advice = ADVICE_TEMPLATES[adviceSeed % ADVICE_TEMPLATES.length]!;
  return (
    `Top driver: ${DIM_LABEL[top]} (${topPct}% weight). ` +
    `Weakest signal: ${DIM_LABEL[low]} (${lowPct}% weight). ` +
    `Weighted total = ${total.toFixed(1)} / 100. ${advice}`
  );
}

export function createMockEvaluationProvider(): EvaluationProvider {
  return {
    name: 'mock-evaluation',

    async health() {
      return { ok: true, detail: 'mock' };
    },

    async score(input: EvaluationScoreInput): Promise<EvaluationResult> {
      const totalScore = computeWeightedTotal({
        marketSize: input.marketSize,
        painIntensity: input.painIntensity,
        competition: input.competition,
        technicalFeasibility: input.technicalFeasibility,
        monetization: input.monetization,
        speedToMarket: input.speedToMarket,
        founderFit: input.founderFit,
        geoPotential: input.geoPotential,
        ipPotential: input.ipPotential,
      });

      const ranked = rankDims(input);
      const top = ranked[0]![0];
      const low = ranked[ranked.length - 1]![0];

      const seed = hash32(`eval:${input.opportunityId}:${totalScore.toFixed(1)}`);
      const explanation = buildExplanation(totalScore, top, low, seed);

      return { totalScore, explanation };
    },
  };
}
