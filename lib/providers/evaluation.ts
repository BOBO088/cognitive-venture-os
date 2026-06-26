/**
 * EvaluationProvider — Opportunity 多维评分的唯一入口。
 *
 * 应用代码**禁止**直接调用外部 AI / 数学库算分；必须通过此接口走。
 * 切真实 LLM-based 评分模型时只换实现，调用方零改动。
 *
 * 9 个评分维度（0..100 整数）见 SCORING_WEIGHTS（types/opportunity.ts）：
 *   marketSize / painIntensity / competition / technicalFeasibility /
 *   monetization / speedToMarket / founderFit / geoPotential / ipPotential
 *
 * 注：competition 极性反转 —— 100 = 竞争少（有利），0 = 红海。
 *
 * 总分加权算法由本 provider **建议**，但 service 层始终按 SCORING_WEIGHTS
 * 重算，不信任 provider 返回的 totalScore。
 */

import { SCORING_WEIGHTS, type ScoringDimension } from '@/types';

/** Provider 输入：9 个维度分数（service 已校验为 0..100 整数）。 */
export interface EvaluationScoreInput {
  opportunityId: string;
  marketSize: number;
  painIntensity: number;
  competition: number;
  technicalFeasibility: number;
  monetization: number;
  speedToMarket: number;
  founderFit: number;
  geoPotential: number;
  ipPotential: number;
}

/** Provider 输出：总分（0..100，1 位小数）+ AI / 规则解释文本。 */
export interface EvaluationResult {
  /** 0..100 浮点（建议 1 位小数）。service 层会用 SCORING_WEIGHTS 重算覆盖。 */
  totalScore: number;
  /** 解释：高分 / 低分维度、建议、风险。1-2000 字符。 */
  explanation: string;
}

export interface EvaluationProvider {
  name: string;
  health(): Promise<{ ok: boolean; detail?: string }>;

  /**
   * 基于 9 维评分 + opportunityId 生成总分 + 解释。
   * service 层调用后**总是**会用 SCORING_WEIGHTS 重新计算 totalScore，
   * provider 返回的 totalScore 仅供参考。
   */
  score(input: EvaluationScoreInput): Promise<EvaluationResult>;
}

export type { ScoringDimension };
export { SCORING_WEIGHTS };

/**
 * 标准加权求和：service 层用于重算 totalScore。
 * 暴露为纯函数便于 unit test 与 mock 复用。
 */
export function computeWeightedTotal(scores: Record<ScoringDimension, number>): number {
  let total = 0;
  for (const dim of Object.keys(SCORING_WEIGHTS) as ScoringDimension[]) {
    const w = SCORING_WEIGHTS[dim];
    const s = scores[dim];
    total += w * s;
  }
  return Math.round(total * 10) / 10;
}
