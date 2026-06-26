/**
 * GEOProvider — GEO (Generative Engine Optimization) 专用 AI。
 *
 * 关注"品牌在 AI 答案里被怎么引用 + 内容资产本身怎么改"，区别于通用 LLM。
 *
 * 两组方法：
 *   - v0.1（品牌层）：generateSuggestions / analyzeCheck / suggestQueries
 *     关注"品牌在 AI 答案里被怎么引用"，输入是 `GEOBrandEntity` + `CitationCheckResult`。
 *   - v2（资产层）：analyzeContentAsset
 *     关注"单条 ContentAsset 本身在 GEO 维度上怎么改"，输入是
 *     `ContentAsset` + `BrandEntityProfile` + `AIQueryBankItem` + `GraphEntity`。
 *
 * 切真实 LLM-based GEO provider 时只换实现，调用方零改动。
 */

import type {
  GEOBrandEntity,
  GEOContentAsset,
  AIQuery,
  CitationCheckResult,
  ContentAsset,
  BrandEntityProfile,
  AIQueryBankItem,
  GraphEntity,
  OptimizerInputType,
  GEOAuditScore,
  GEOAuditSuggestions,
} from '@/types';

/** 单次检查的分析结果。 */
export interface CheckAnalysis {
  issues: string[];           // 发现的问题
  recommendations: string[];  // 改进建议
}

/** analyzeContentAsset 输入：ContentAsset + 关联实体的快照。 */
export interface AnalyzeContentAssetInput {
  asset: ContentAsset;
  brand: BrandEntityProfile;
  /** 这条资产当前绑定的 AI Query Bank items。 */
  targetQueries: AIQueryBankItem[];
  /** 当前与 brand 关联的图谱实体（仅参考，不强制关联）。 */
  graphEntities: GraphEntity[];
  /** Optimizer 输入类型（用户在 form 里选）。 */
  inputType: OptimizerInputType;
}

/** analyzeContentAsset 输出草稿：7 维分 + 9 项建议 + 解释。 */
export interface AnalyzeContentAssetDraft {
  /** 7 维分（0-100 整数）。service 用 GEO_AUDIT_WEIGHTS 重算 geoScore。 */
  score: GEOAuditScore;
  suggestions: GEOAuditSuggestions;
  /** 1-1000 字符自然语言解释。 */
  explanation: string;
  /** 评分模型版本。 */
  scoringModelVersion: string;
}

export interface GEOProvider {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 基于品牌现状 + 最近检查结果，生成内容创意（资产草案）。 */
  generateSuggestions(
    brand: GEOBrandEntity,
    recentChecks: CitationCheckResult[],
  ): Promise<Array<Pick<GEOContentAsset, 'title' | 'format' | 'targetQueries'>>>;

  /** 解释一次检查为什么是这个 verdict。 */
  analyzeCheck(
    check: CitationCheckResult,
    query: AIQuery,
  ): Promise<CheckAnalysis>;

  /** 基于品牌已有 query，建议新监控问题。 */
  suggestQueries(
    brand: GEOBrandEntity,
    existing: AIQuery[],
  ): Promise<AIQuery[]>;

  /**
   * 分析一条 ContentAsset，给出 7 维分 + 9 项优化建议。
   *
   * service 层会用 GEO_AUDIT_WEIGHTS 重算 score.geoScore（不信任 provider）。
   */
  analyzeContentAsset(
    input: AnalyzeContentAssetInput,
  ): Promise<AnalyzeContentAssetDraft>;
}
