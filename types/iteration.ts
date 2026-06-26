/**
 * Iteration 域：PromptVersion + LoopVersion + ImprovementLog。
 *
 * 让提示词、循环工程、评分模型都可被版本化、被对比、被改进。
 *
 * 与 LLMProvider 的关系：
 *   PromptVersion.type 枚举值对应 LLMProvider 的方法：
 *     - 'summarize_source'      ↔ summarizeSource
 *     - 'research_card'         ↔ generateResearchCard / generateCardDraftFrom*
 *     - 'opportunity_score'     ↔ scoreOpportunity
 *     - 'geo_suggestion'        ↔ generateGEOSuggestions
 *     - 'lesson_generate'       ↔ generateLessons
 *     - 'opportunity_draft'     ↔ generateOpportunityDraft
 *     - 'prd_draft'             ↔ generatePRDDraft
 *     - 'codex_task_list'       ↔ generateCodexTaskList
 *     - 'other'                 ↔ 自由备注
 *
 *   LoopVersion.steps 是一个有顺序的步骤列表，描述"循环工程"的一个版本
 *   （如：研究 → 评分 → 立项 → 上线 → 复盘 → 评分），stopCondition 决定
 *   何时终止循环，evaluationCriteria 决定如何判断每轮输出质量。
 *
 *   ImprovementLog 是对前两者的改进建议：problem + suggestion + result。
 *   targetType 决定 suggestion 指向哪个对象。
 *
 * 数据流：
 *   Prompt / Loop 修改
 *     → 写 ImprovementLog（problem / suggestion）
 *     → 用户采纳 → 创建新版本 (v+1)
 *     → 人工评分 → score 字段
 *     → 跨版本对比 → score trend
 */

/* ============================================================
 * PromptVersion
 * ============================================================ */

/** Prompt 关联到的 LLMProvider 能力。 */
export type PromptType =
  | 'summarize_source'
  | 'research_card'
  | 'opportunity_score'
  | 'geo_suggestion'
  | 'lesson_generate'
  | 'opportunity_draft'
  | 'prd_draft'
  | 'codex_task_list'
  | 'other';

export const PROMPT_TYPES: PromptType[] = [
  'summarize_source',
  'research_card',
  'opportunity_score',
  'geo_suggestion',
  'lesson_generate',
  'opportunity_draft',
  'prd_draft',
  'codex_task_list',
  'other',
];

export const PROMPT_TYPE_LABEL: Record<PromptType, string> = {
  summarize_source: 'Summarize source',
  research_card: 'Research card',
  opportunity_score: 'Opportunity score',
  geo_suggestion: 'GEO suggestion',
  lesson_generate: 'Lesson generate',
  opportunity_draft: 'Opportunity draft',
  prd_draft: 'PRD draft',
  codex_task_list: 'Codex task list',
  other: 'Other',
};

/**
 * PromptVersion — 提示词的一个版本。
 *
 * 一个 (type, name) 组合下可以有多个 version 串成一条迭代历史。
 * 例如 ('prd_draft', 'GEO Pulse PRD generator') v1 → v2 → v3。
 *
 * 字段约束（service 层强制）：
 *   - name 1-200 字符
 *   - type ∈ PROMPT_TYPES
 *   - content 1-50000 字符（足够放 1-2 篇长 prompt 模板）
 *   - usedFor 1-1000 字符（具体使用场景：哪个 opportunity / 哪个 mvp / 哪个 brand）
 *   - score ∈ [0, 100]，可空（未评分）
 *   - version 由 service 在同一 (type, name) 内自动递增
 *   - id 唯一性
 *   - createdAt / updatedAt 由调用方提供
 */
export interface PromptVersion {
  id: string;
  name: string;
  type: PromptType;
  /** 提示词全文。1-50000 字符。 */
  content: string;
  /** 在 (type, name) 内的版本号，从 1 开始。service 自动管理。 */
  version: number;
  /** 具体使用场景：哪个 opportunity / 哪个 mvp / 哪个 brand 等。1-1000 字符。 */
  usedFor: string;
  /** 人工评分 0-100；可空（未评分）。 */
  score: number | null;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
 * LoopVersion
 * ============================================================ */

/**
 * LoopVersion — 循环工程的一个版本。
 *
 * 描述一个由若干步骤组成的循环（research → score → mvp → launch → retro →
 * score → ...），stopCondition 决定循环何时终止，evaluationCriteria 决定
 * 每轮如何评判。
 *
 * 字段约束（service 层强制）：
 *   - name 1-200 字符
 *   - steps 至少 1 个，每步 1-200 字符
 *   - stopCondition 1-2000 字符
 *   - evaluationCriteria 1-2000 字符
 *   - score ∈ [0, 100]，可空
 *   - version 由 service 自动管理
 *   - id 唯一性
 */
export interface LoopVersion {
  id: string;
  name: string;
  /** 步骤列表（按顺序）。至少 1 个。 */
  steps: string[];
  /** 循环终止条件。1-2000 字符。 */
  stopCondition: string;
  /** 每轮评估标准。1-2000 字符。 */
  evaluationCriteria: string;
  /** 版本号。service 自动管理。 */
  version: number;
  /** 人工评分 0-100；可空。 */
  score: number | null;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
 * ImprovementLog
 * ============================================================ */

/** 改进建议指向的目标类型。 */
export type ImprovementTargetType =
  | 'prompt'
  | 'loop'
  | 'score_model'
  | 'other';

export const IMPROVEMENT_TARGET_TYPES: ImprovementTargetType[] = [
  'prompt',
  'loop',
  'score_model',
  'other',
];

export const IMPROVEMENT_TARGET_TYPE_LABEL: Record<ImprovementTargetType, string> = {
  prompt: 'Prompt',
  loop: 'Loop',
  score_model: 'Score model',
  other: 'Other',
};

/**
 * ImprovementLog — 一条改进建议。
 *
 * 字段约束（service 层强制）：
 *   - targetType ∈ IMPROVEMENT_TARGET_TYPES
 *   - targetId：prompt/loop 类型必须指向存在的实体；score_model/other 用 sentinel
 *   - problem 1-4000 字符
 *   - suggestion 1-4000 字符
 *   - result 0-4000 字符（可空：建议尚未应用）
 *   - id 唯一性
 *   - createdAt / updatedAt 由调用方提供
 */
export interface ImprovementLog {
  id: string;
  targetType: ImprovementTargetType;
  targetId: string;
  /** 当前问题（症状 / 数据 / 痛点）。1-4000 字符。 */
  problem: string;
  /** 建议的改进（具体可执行的修改）。1-4000 字符。 */
  suggestion: string;
  /** 改进应用结果（可空：尚未应用）。0-4000 字符。 */
  result: string;
  createdAt: string;
  updatedAt: string;
}
