/**
 * LLMProvider — 所有 AI 生成能力的唯一入口。
 *
 * 应用代码**禁止**直接 import 'openai' / 'anthropic' / 任何 LLM SDK；
 * 必须通过此接口走。切真实 SDK 时只换实现，调用方零改动。
 *
 * 8 个核心方法（业务侧主用）：
 *   1. summarizeSource          把 SourceItem 浓缩成 1 段摘要
 *   2. generateResearchCard     基于 topic + sourceIds 生成 ResearchCard
 *   3. scoreOpportunity         对 Opportunity 做多维评分
 *   4. generatePRD              基于 MVPProject 生成 PRD 草稿
 *   5. generateCodexTasks       基于 PRD 派生 6 步 Codex 任务
 *   6. generateGEOSuggestions   基于 brand + queries 生成 GEO 建议
 *   7. generateLessonLearned    从 LaunchResult 抽象 LessonLearned
 *   8. improvePromptVersion     对 PromptVersion / LoopVersion 生成改进建议
 *
 * 派发逻辑（getLLMProvider 在 index.ts）：
 *   - demo 模式                                   → mock 实现
 *   - staging/production + OPENAI_API_KEY 配齐   → OpenAI 实现（带 fallback 包装）
 *   - staging/production + OPENAI_API_KEY 缺失   → mock 实现（warn）
 *
 * cost log：
 *   - 所有 LLM 调用都通过 getCostLog() 暴露成本
 *   - 真实实现会跟踪 token 用量 + 单价计算 USD 成本
 *   - mock 实现返回空数组（没有真实 token 消耗）
 */

import type {
  ResearchTopic,
  ResearchCard,
  SourceItem,
  Opportunity,
  GEOBrandEntity,
  AIQuery,
  LaunchResult,
  LessonLearned,
  CodexTaskListInput,
  CodexTaskListDraft,
  PromptVersion,
  LoopVersion,
  BrandEntityProfile,
  AIQueryBankIntent,
  AIQueryBankPlatform,
} from '@/types';

/** 多维评分结果。 */
export interface OpportunityScore {
  market: number;            // 0..10
  feasibility: number;       // 0..10
  timing: number;            // 0..10
  differentiation: number;   // 0..10
  total: number;             // 0..10
  rationale: string;
}

/** 单次 LLM 调用的成本记录。real provider 会写、mock provider 不写。 */
export interface CostLogEntry {
  method: string;            // 'summarizeSource' / 'generatePRD' / ...
  model: string;             // 'gpt-4o-mini' / 'mock' 等
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;           // 估算
  durationMs: number;
  fallback: boolean;         // true 表示 OpenAI 失败、回落到 mock
  error?: string;            // 失败时的错误 message（fallback=true 时填）
  timestamp: string;         // ISO 8601
}

export interface LLMProvider {
  name: string;
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 1) 把一条 SourceItem 浓缩成一段摘要文本。 */
  summarizeSource(source: SourceItem): Promise<string>;

  /** 2) 基于 topic + sourceIds 生成一张 ResearchCard。 */
  generateResearchCard(
    topic: ResearchTopic,
    sourceIds: string[],
  ): Promise<ResearchCard>;

  /** 从一条 SourceItem 生成结构化卡片草稿（不含 id / 时间戳）。 */
  generateCardDraftFromSource(source: SourceItem): Promise<CardDraft>;

  /** 从 topic + 关联 sourceIds 生成结构化卡片草稿。 */
  generateCardDraftFromTopic(
    topic: ResearchTopic,
    sourceIds: string[],
  ): Promise<CardDraft>;

  /** 3) 多维评分 + 理由。 */
  scoreOpportunity(opportunity: Opportunity): Promise<OpportunityScore>;

  /** 6) 基于 brand 现状 + 监控中的 query，生成 GEO 优化建议。 */
  generateGEOSuggestions(
    brand: GEOBrandEntity,
    queries: AIQuery[],
  ): Promise<string[]>;

  /** 7) 从一次 LaunchResult 抽象出一条 LessonLearned。 */
  generateLessonLearned(launchResult: LaunchResult): Promise<LessonLearned>;

  /**
   * 基于一组 Signal + ResearchCard 生成 Opportunity 草稿。
   *
   * 输出不含 id / status / createdAt / updatedAt / relatedXxxIds ——
   * 这些由 service 补齐或由 UI 在提交时填。LLMProvider 只负责内容生成。
   */
  generateOpportunityDraft(input: {
    signalIds: string[];
    researchCardIds: string[];
  }): Promise<OpportunityDraft>;

  /** 4) 基于 MVPProject（+ 关联 Opportunity / launches）生成 PRD 草稿。 */
  generatePRD(input: PRDDraftInput): Promise<PRDDraft>;

  /** 5) 基于 PRD 9 个 section 派生一组 Codex 任务（6 大分类）。 */
  generateCodexTasks(input: CodexTaskListInput): Promise<CodexTaskListDraft>;

  /**
   * 基于一个 BrandEntityProfile + intent 派生一组 AI Query Bank 草稿。
   *
   * 输出不含 id / brandEntityId / linkedAssetIds / createdAt / updatedAt ——
   * 这些由 service 补齐。LLMProvider 只负责"问题内容生成"。
   */
  generateAIQueryBankDraft(input: {
    brand: BrandEntityProfile;
    intent: AIQueryBankIntent;
    platform: AIQueryBankPlatform;
    count: number;
  }): Promise<AIQueryBankDraft[]>;

  /** 8) 基于一个 prompt / loop 的当前状态生成改进建议。 */
  improvePromptVersion(
    target:
      | { kind: 'prompt'; prompt: PromptVersion }
      | { kind: 'loop'; loop: LoopVersion },
  ): Promise<ImprovementDraft>;

  /** 拿当前会话累计 cost log（不持久化，重启清空）。 */
  getCostLog(): CostLogEntry[];

  /** 清空 cost log（用于测试 / 周期归零）。 */
  clearCostLog(): void;
}

/**
 * CardDraft — 卡片草稿。
 *
 * 不含 id / topicId / sourceIds / createdAt / updatedAt / graphEntityIds / signalId
 * 这些由 service 补齐。LLMProvider 只负责"内容生成"。
 */
export interface CardDraft {
  title: string;
  summary: string;
  keyInsights: string[];
  evidence: string[];
  risks: string[];
  tags: string[];
  /** 重要性评分，0..100。 */
  score: number;
}

/**
 * OpportunityDraft — Opportunity 草稿。
 *
 * 与 CardDraft 思路一致：不含 id / status / createdAt / updatedAt / relatedXxxIds，
 * service / UI 在提交时补齐。
 */
export interface OpportunityDraft {
  title: string;
  description: string;
  targetUser: string;
  painPoint: string;
  solutionIdea: string;
}

/**
 * PRDDraftInput — 生成 PRD 草稿的输入。
 *
 * 含 MVPProject 快照 + 关联 Opportunity（可选） + 已有 launch 数量（可选，
 * 作为 trust signal 喂给 LLM）。LLMProvider 不需要再回查 service 层。
 */
export interface PRDDraftInput {
  mvpProject: {
    id: string;
    name: string;
    description: string;
    stage: string;
    startDate: string;
  };
  opportunity?: {
    id: string;
    title: string;
    targetUser: string;
    painPoint: string;
    solutionIdea: string;
    status: string;
  };
  /** 关联的 launch 数量（作为 trust signal 喂给 LLM）。 */
  launchCount?: number;
}

/**
 * PRDDraft — 9 个章节的内容草稿。
 *
 * 不含 id / mvpProjectId / version / generatedByMock / 时间戳 —— 这些由
 * service 在持久化时补齐。LLMProvider 只负责内容生成。
 *
 * 9 个 section 与 PRD type 完全对应。
 */
export interface PRDDraft {
  title: string;
  productPositioning: string;
  targetUsers: string;
  corePainPoints: string;
  mvpFeatureScope: string;
  pageStructure: string;
  dataModel: string;
  apiDesign: string;
  acceptanceCriteria: string;
  devPlan: string;
}

export interface ImprovementDraft {
  problem: string;
  suggestion: string;
}

/**
 * AIQueryBankDraft — AI Query Bank 条目草稿。
 *
 * 不含 id / brandEntityId / linkedAssetIds / createdAt / updatedAt ——
 * 这些由 service 补齐。LLMProvider 只负责"问题内容生成"。
 */
export interface AIQueryBankDraft {
  query: string;
  intent: AIQueryBankIntent;
  platform: AIQueryBankPlatform;
  /** 推荐优先级 0-100；service 落到 enum 时按阈值映射。 */
  priorityScore: number;
}
