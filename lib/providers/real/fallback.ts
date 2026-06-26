/**
 * FallbackLLMProvider — real + mock 组合。
 *
 * 行为：
 *   1. 默认走 primary（real / OpenAI）
 *   2. primary 抛错（timeout / API 错 / 5xx / 内容审核 / 或 real 自己抛的
 *      "not implemented in real mode"）→ 走 fallback（mock）
 *   3. 任何 fallback 发生：标记 entry.fallback=true、把 primary 失败的
 *      error 存到 entry.error、写 cost log（fallback 事件也算 cost 记录）
 *
 * 适用场景：
 *   - 5 个 draft 方法 real 故意不实现 → 走 mock
 *   - 真实 OpenAI 临时挂掉 → 走 mock 维持 UX
 *   - 单次 rate limit → 走 mock 防止 UI 卡住
 *
 * 注意：
 *   - 包装对调用方透明（仍是 LLMProvider 接口）
 *   - 包装自身不缓存，每次调用都尝试 primary
 *   - getCostLog / clearCostLog 透传 primary
 */

import type { LLMProvider, CostLogEntry, CardDraft, OpportunityDraft, ImprovementDraft, PRDDraft, PRDDraftInput, AIQueryBankDraft, OpportunityScore } from '../llm';
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

interface FallbackEntry {
  method: string;
  primaryError: string;
  timestamp: string;
}

export function createFallbackLLMProvider(
  primary: LLMProvider,
  fallback: LLMProvider,
): LLMProvider {
  const fallbackLog: FallbackEntry[] = [];

  async function wrap<T>(
    method: string,
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await primaryFn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      fallbackLog.push({
        method,
        primaryError: msg,
        timestamp: new Date().toISOString(),
      });
      // 让 dashboard / log aggregator 能 grep 到
      console.warn(
        `[LLMProvider.fallback] ${method} → mock (primary error: ${msg.slice(0, 200)})`,
      );
      return fallbackFn();
    }
  }

  return {
    name: `FallbackLLMProvider(${primary.name}+${fallback.name})`,

    getCostLog(): CostLogEntry[] {
      // 把 fallback 事件也展平成 CostLogEntry 形式（model='mock-fallback', fallback=true）
      const real = primary.getCostLog();
      const fallbackEntries: CostLogEntry[] = fallbackLog.map((f) => ({
        method: f.method,
        model: 'mock-fallback',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        durationMs: 0,
        fallback: true,
        error: f.primaryError,
        timestamp: f.timestamp,
      }));
      return [...real, ...fallbackEntries];
    },

    clearCostLog(): void {
      primary.clearCostLog();
      fallbackLog.length = 0;
    },

    async health() {
      const h = await primary.health();
      if (h.ok) return { ok: true, detail: `${h.detail} · fallback=${fallback.name}` };
      return { ok: false, detail: `${h.detail} · fallback=${fallback.name}` };
    },

    async summarizeSource(s: SourceItem) {
      return wrap('summarizeSource', () => primary.summarizeSource(s), () => fallback.summarizeSource(s));
    },
    async generateResearchCard(t: ResearchTopic, ids: string[]): Promise<ResearchCard> {
      return wrap('generateResearchCard', () => primary.generateResearchCard(t, ids), () => fallback.generateResearchCard(t, ids));
    },
    async generateCardDraftFromSource(s: SourceItem): Promise<CardDraft> {
      return wrap('generateCardDraftFromSource', () => primary.generateCardDraftFromSource(s), () => fallback.generateCardDraftFromSource(s));
    },
    async generateCardDraftFromTopic(t: ResearchTopic, ids: string[]): Promise<CardDraft> {
      return wrap('generateCardDraftFromTopic', () => primary.generateCardDraftFromTopic(t, ids), () => fallback.generateCardDraftFromTopic(t, ids));
    },
    async scoreOpportunity(o: Opportunity): Promise<OpportunityScore> {
      return wrap('scoreOpportunity', () => primary.scoreOpportunity(o), () => fallback.scoreOpportunity(o));
    },
    async generateGEOSuggestions(b: GEOBrandEntity, qs: AIQuery[]): Promise<string[]> {
      return wrap('generateGEOSuggestions', () => primary.generateGEOSuggestions(b, qs), () => fallback.generateGEOSuggestions(b, qs));
    },
    async generateLessonLearned(l: LaunchResult): Promise<LessonLearned> {
      return wrap('generateLessonLearned', () => primary.generateLessonLearned(l), () => fallback.generateLessonLearned(l));
    },
    async improvePromptVersion(t: { kind: 'prompt'; prompt: PromptVersion } | { kind: 'loop'; loop: LoopVersion }): Promise<ImprovementDraft> {
      return wrap('improvePromptVersion', () => primary.improvePromptVersion(t), () => fallback.improvePromptVersion(t));
    },
    async generateOpportunityDraft(i: { signalIds: string[]; researchCardIds: string[] }): Promise<OpportunityDraft> {
      return wrap('generateOpportunityDraft', () => primary.generateOpportunityDraft(i), () => fallback.generateOpportunityDraft(i));
    },
    async generatePRD(i: PRDDraftInput): Promise<PRDDraft> {
      return wrap('generatePRD', () => primary.generatePRD(i), () => fallback.generatePRD(i));
    },
    async generateCodexTasks(i: CodexTaskListInput): Promise<CodexTaskListDraft> {
      return wrap('generateCodexTasks', () => primary.generateCodexTasks(i), () => fallback.generateCodexTasks(i));
    },
    async generateAIQueryBankDraft(i: {
      brand: BrandEntityProfile;
      intent: AIQueryBankIntent;
      platform: AIQueryBankPlatform;
      count: number;
    }): Promise<AIQueryBankDraft[]> {
      return wrap('generateAIQueryBankDraft', () => primary.generateAIQueryBankDraft(i), () => fallback.generateAIQueryBankDraft(i));
    },
  } as LLMProvider;
}
