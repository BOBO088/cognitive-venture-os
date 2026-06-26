/**
 * Opportunity 域：信号 → 机会 → 评估。
 *
 * 核心流向：外部世界的 Signal → 提炼为 Opportunity → 多轮 OpportunityEvaluation。
 * OpportunityEvaluation 是时间序列数据，可对比分数随时间变化。
 */

/**
 * SignalCategory — Signal 的分类。
 *
 * 11 个枚举值，对应外部市场信号的常见来源：
 *   - funding               融资事件
 *   - product_launch        产品发布
 *   - github_trend          GitHub 仓库 star / trending 异动
 *   - hiring_signal         招聘 / 团队扩张信号
 *   - customer_pain         客户痛点 / 抱怨 / 流失信号
 *   - regulation            监管 / 政策 / 法规
 *   - technology_breakthrough 技术突破 / 论文 / 模型发布
 *   - content_trend         内容平台趋势
 *   - geo_trend             AI 搜索 / GEO 行业趋势
 *   - ip_trend              专利 / IP 趋势
 *   - short_video_trend     短视频 / 内容形态趋势
 */
export type SignalCategory =
  | 'funding'
  | 'product_launch'
  | 'github_trend'
  | 'hiring_signal'
  | 'customer_pain'
  | 'regulation'
  | 'technology_breakthrough'
  | 'content_trend'
  | 'geo_trend'
  | 'ip_trend'
  | 'short_video_trend';

/** Signal 的可信度上下界（整数 0..100）。 */
export const SIGNAL_CONFIDENCE_MIN = 0;
export const SIGNAL_CONFIDENCE_MAX = 100;

/**
 * Signal — 一条市场信号。
 *
 * 描述外部世界的一个可观察事件或趋势。Signal 是 Opportunity 的输入源，
 * 是 GraphEntity / ResearchCard 的潜在触发器。关联通过 id 列表，不嵌套。
 *
 * 字段约束（service 层强制）：
 *   - title 1-200 字符
 *   - source 1-500 字符（来源标识，如 URL / 公司名 / "manual"）
 *   - description ≤ 4000 字符
 *   - evidence ≤ 2000 字符
 *   - confidence ∈ [0, 100] 整数
 *   - linkedEntityIds / linkedResearchCardIds 手动管理，去重 + 上限 50，
 *     引用必须存在于对应域
 */
export interface Signal {
  id: string;
  /** 简短标题（1-200 字符）。 */
  title: string;
  /** 信号来源标识（URL / 平台 / "manual" / connector name）。1-500 字符。 */
  source: string;
  category: SignalCategory;
  /** 现象描述。 */
  description: string;
  /** 支撑该信号的具体证据（链接、引用、片段）。 */
  evidence: string;
  /** 可信度评分，0..100 整数。 */
  confidence: number;
  /** 手动绑定：哪些 GraphEntity 与该信号相关。 */
  linkedEntityIds: string[];
  /** 手动绑定：哪些 ResearchCard 与该信号相关。 */
  linkedResearchCardIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Opportunity 的生命周期。
 *
 * 6 个状态：draft（草稿）→ evaluating（评估中）→ validated（假设已验证）
 * → mvp（在做 MVP）→ archived（归档）或 killed（放弃）。
 */
export type OpportunityStatus =
  | 'draft'
  | 'evaluating'
  | 'validated'
  | 'mvp'
  | 'archived'
  | 'killed';

/** 所有状态值（供 chip 过滤和枚举遍历）。 */
export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  'draft',
  'evaluating',
  'validated',
  'mvp',
  'archived',
  'killed',
];

/**
 * Opportunity — 一个商业机会。
 *
 * 核心流向：Signal + ResearchCard → Opportunity。
 * 字段约束（service 层强制）：
 *   - title 1-200 字符
 *   - description 1-2000 字符
 *   - painPoint 1-2000 字符
 *   - solutionIdea 1-2000 字符
 *   - targetUser 1-500 字符
 *   - relatedSignalIds / relatedResearchCardIds / relatedEntityIds
 *     各自去重 + 上限 50 + 引用必须存在（service 校验）
 *
 * 评估历史（OpportunityEvaluation）和 MVP 派生（mvpProjectIds）
 * 不在 Opportunity 上冗余存储：Evaluation 按 opportunityId 索引，
 * MVPProject 按 sourceOpportunityId 反查。
 */
export interface Opportunity {
  id: string;
  /** 简短标题。 */
  title: string;
  /** 综合描述。 */
  description: string;
  /** 目标用户描述。 */
  targetUser: string;
  /** 痛点陈述。 */
  painPoint: string;
  /** 解决方案想法（v0，可后续被 MVPProject 替代）。 */
  solutionIdea: string;
  status: OpportunityStatus;
  /** 触发该机会的 Signal.id 列表。手动管理。 */
  relatedSignalIds: string[];
  /** 支撑性 ResearchCard.id 列表。手动管理。 */
  relatedResearchCardIds: string[];
  /** 关联 GraphEntity.id 列表（公司 / 产品 / 人物等）。手动管理。 */
  relatedEntityIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 评分权重 — 9 个维度的加权系数。
 *
 * 必须在 lib/providers/evaluation.ts 和 lib/services/evaluationService.ts
 * 保持一致；service 层会重算 totalScore（不信任 provider）。
 */
export const SCORING_WEIGHTS = {
  marketSize: 0.15,
  painIntensity: 0.15,
  competition: 0.10,
  technicalFeasibility: 0.10,
  monetization: 0.15,
  speedToMarket: 0.10,
  founderFit: 0.05,
  geoPotential: 0.10,
  ipPotential: 0.10,
} as const;

export type ScoringDimension = keyof typeof SCORING_WEIGHTS;

/** 评分上下界（整数 0..100）。 */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

/**
 * 总分阈值：基于 totalScore 自动流转 Opportunity.status。
 *
 * totalScore >= PROMOTE_THRESHOLD → status = 'mvp'   （高分进 MVP Pipeline）
 * totalScore <  DEMOTE_THRESHOLD  → status = 'archived'（低分进归档）
 * 其它 → status 不变
 */
export const PROMOTE_THRESHOLD = 70;
export const DEMOTE_THRESHOLD = 40;

/**
 * OpportunityEvaluation — 对 Opportunity 的一次评估。
 *
 * 9 维评分（每个 0..100 整数）+ 加权 totalScore（0..100，可带 1 位小数）+
 * AI/规则生成的 explanation。同一个 opportunity 可有多次 evaluation，
 * 按 createdAt 倒序展示时间序列，ranking 用最新一次。
 *
 * competition 极性约定：100 = 几乎没有竞争（高分 / 利好），
 * 0 = 极度饱和（低分 / 利空）。painIntensity / marketSize 等是常规极性
 * （高 = 强 = 好）。
 */
export interface OpportunityEvaluation {
  id: string;
  opportunityId: string;
  /** 市场规模，0..100。越高 = 越大。 */
  marketSize: number;
  /** 痛点强度，0..100。越高 = 越痛。 */
  painIntensity: number;
  /**
   * 竞争度（极性反转），0..100。越高 = 竞争越少。
   * 80+ 表示蓝海；40 以下表示红海。
   */
  competition: number;
  /** 技术可行性，0..100。 */
  technicalFeasibility: number;
  /** 变现能力，0..100。 */
  monetization: number;
  /** 上市速度，0..100。 */
  speedToMarket: number;
  /** 团队契合度，0..100。 */
  founderFit: number;
  /** GEO 潜力，0..100。 */
  geoPotential: number;
  /** IP 潜力，0..100。 */
  ipPotential: number;
  /** 加权总分，0..100。service 写入时重算。 */
  totalScore: number;
  /** AI / 规则生成的解释（含依据与建议）。 */
  explanation: string;
  createdAt: string;
  updatedAt: string;
}
