/**
 * Real LLMProvider — OpenAI 实现。
 *
 * 仅在 APP_MODE ∈ {staging, production} 且 OPENAI_API_KEY 配齐时被加载
 * （dispatch 在 index.ts 工厂里）。demo 模式永远走 mock。
 *
 * 8 个核心方法：summarizeSource / generateResearchCard / scoreOpportunity /
 * generatePRD / generateCodexTasks / generateGEOSuggestions / generateLessonLearned /
 * improvePromptVersion。每个方法走通用 `callOpenAI()` helper：
 *
 *   - AbortController 30s 超时（fast fail）
 *   - try/catch 捕获所有 error（network / rate limit / 内容审核）
 *   - 写 cost log（token × model 单价 → USD）
 *   - JSON-mode 解析失败 → throw（让 fallback 兜底）
 *
 * 5 个 draft 方法（generateCardDraftFromSource/Topic、generateOpportunityDraft、
 * generateAIQueryBankDraft）抛 'not implemented in real mode' —— 由
 * FallbackLLMProvider 捕获，调用 mock 拿值。**这是有意的**，避免给用户
 * 假装实现了 8 个核心方法之外的"高级 draft"。
 *
 * 不直接被 UI / service import。Factory 在 lib/providers/index.ts 包装 fallback 后暴露。
 */

import OpenAI from 'openai';
import { getServerEnv } from '@/lib/env';
import type {
  LLMProvider,
  CostLogEntry,
  OpportunityScore,
  CardDraft,
  OpportunityDraft,
  PRDDraft,
  PRDDraftInput,
  ImprovementDraft,
  AIQueryBankDraft,
} from '../llm';
import type {
  ResearchTopic,
  ResearchCard,
  SourceItem,
  Opportunity,
  GEOBrandEntity,
  AIQuery,
  LaunchResult,
  LessonLearned,
  PromptVersion,
  LoopVersion,
  BrandEntityProfile,
  AIQueryBankIntent,
  AIQueryBankPlatform,
  CodexTaskCategory,
  TaskPhase,
  TaskPriority,
  CodexTaskListDraft,
  CodexTaskListInput,
} from '@/types';

// ---------- 模型与价格（USD / 1M tokens，2025-Q4 公开价） ----------

interface ModelPrice {
  promptPer1M: number;
  completionPer1M: number;
}

const MODEL_PRICES: Record<string, ModelPrice> = {
  'gpt-4o-mini': { promptPer1M: 0.15, completionPer1M: 0.6 },
  'gpt-4o': { promptPer1M: 2.5, completionPer1M: 10 },
};

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 30_000;

const NOT_IMPLEMENTED_IN_REAL = (m: string): Error =>
  new Error(`LLMProvider.${m}: not implemented in real mode (use mock fallback or extend real impl)`);

// ---------- Provider 实现 ----------

export function createOpenAILLMProvider(): LLMProvider {
  const env = getServerEnv();
  const client = new OpenAI({ apiKey: env.openai.apiKey });
  const costLog: CostLogEntry[] = [];

  /**
   * 通用 OpenAI 调用：
   *   - JSON 模式（response_format: { type: 'json_object' }）
   *   - 30s 超时
   *   - 自动记录 cost log
   *   - 失败抛带方法名上下文的 Error
   */
  async function callOpenAI<T>(args: {
    method: string;
    system: string;
    user: string;
    model?: string;
    timeoutMs?: number;
  }): Promise<{ value: T; entry: CostLogEntry }> {
    const model = args.model ?? DEFAULT_MODEL;
    const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    let entry: CostLogEntry = {
      method: args.method,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      durationMs: 0,
      fallback: false,
      timestamp: new Date(startedAt).toISOString(),
    };

    try {
      const completion = await client.chat.completions.create(
        {
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: args.system },
            { role: 'user', content: args.user },
          ],
        },
        { signal: controller.signal },
      );

      clearTimeout(timer);
      const usage = completion.usage;
      const pt = usage?.prompt_tokens ?? 0;
      const ct = usage?.completion_tokens ?? 0;
      const price = MODEL_PRICES[model] ?? MODEL_PRICES[DEFAULT_MODEL]!;
      const cost = (pt * price.promptPer1M + ct * price.completionPer1M) / 1_000_000;

      entry = {
        ...entry,
        promptTokens: pt,
        completionTokens: ct,
        totalTokens: pt + ct,
        costUsd: Number(cost.toFixed(6)),
        durationMs: Date.now() - startedAt,
      };
      costLog.push(entry);

      const raw = completion.choices[0]?.message?.content ?? '{}';
      try {
        return { value: JSON.parse(raw) as T, entry };
      } catch (e) {
        throw new Error(`LLMProvider.${args.method}: failed to parse JSON: ${(e as Error).message}; raw=${raw.slice(0, 200)}`);
      }
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      entry = {
        ...entry,
        durationMs: Date.now() - startedAt,
        error: msg,
      };
      costLog.push(entry);
      throw new Error(`LLMProvider.${args.method} [${model}]: ${msg}`);
    }
  }

  // ---------- 8 个核心方法 ----------

  async function summarizeSource(source: SourceItem): Promise<string> {
    const { value } = await callOpenAI<{ summary: string }>({
      method: 'summarizeSource',
      system:
        'You summarize research sources into 2-3 sentences. ' +
        'Preserve key claims, names, and numbers. Do not invent. ' +
        'Output JSON: {"summary": "..."}',
      user:
        `Title: ${source.title}\n` +
        `Type: ${source.type}\n` +
        (source.url ? `URL: ${source.url}\n` : '') +
        (source.summary ? `Existing summary: ${source.summary}\n` : '') +
        (source.notes ? `Notes: ${source.notes}\n` : '') +
        `Credibility: ${source.credibilityScore ?? 'unknown'}/100`,
    });
    return value.summary;
  }

  async function generateResearchCard(
    topic: ResearchTopic,
    sourceIds: string[],
  ): Promise<ResearchCard> {
    const { value } = await callOpenAI<{
      title: string;
      summary: string;
      keyInsights: string[];
      evidence: string[];
      risks: string[];
      tags: string[];
      score: number;
    }>({
      method: 'generateResearchCard',
      system:
        'You extract a single research card from a topic + linked sources. ' +
        'Be specific and cite-worthy. Output JSON: ' +
        '{"title","summary","keyInsights":[3-5],"evidence":[2-4],"risks":[0-2],"tags":[2-5],"score":0-100}',
      user:
        `Topic: ${topic.title}\n` +
        `Description: ${topic.description ?? ''}\n` +
        `Source IDs: ${sourceIds.join(', ') || '(none provided)'}\n` +
        `Tags hint: ${(topic.tags ?? []).join(', ')}`,
    });
    const now = new Date().toISOString();
    return {
      id: `card_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
      topicId: topic.id,
      sourceIds,
      title: value.title,
      summary: value.summary,
      keyInsights: value.keyInsights,
      evidence: value.evidence,
      risks: value.risks,
      tags: value.tags,
      score: Math.max(0, Math.min(100, Math.round(value.score))),
      graphEntityIds: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  async function scoreOpportunity(opportunity: Opportunity): Promise<OpportunityScore> {
    const { value } = await callOpenAI<{
      market: number;
      feasibility: number;
      timing: number;
      differentiation: number;
      rationale: string;
    }>({
      method: 'scoreOpportunity',
      system:
        'You score early-stage opportunities on 4 dimensions, each 0-10 (1 decimal). ' +
        'Provide a 1-2 sentence rationale that names the top driver and the biggest risk. ' +
        'Output JSON: {"market","feasibility","timing","differentiation","rationale"}',
      user:
        `Title: ${opportunity.title}\n` +
        `Description: ${opportunity.description}\n` +
        `Target user: ${opportunity.targetUser}\n` +
        `Pain point: ${opportunity.painPoint}\n` +
        `Solution idea: ${opportunity.solutionIdea}\n` +
        `Status: ${opportunity.status}`,
    });
    const clip = (n: number) => Math.max(0, Math.min(10, Math.round(n * 10) / 10));
    const m = clip(value.market);
    const f = clip(value.feasibility);
    const t = clip(value.timing);
    const d = clip(value.differentiation);
    return {
      market: m,
      feasibility: f,
      timing: t,
      differentiation: d,
      total: Math.round(((m + f + t + d) / 4) * 10) / 10,
      rationale: value.rationale,
    };
  }

  async function generatePRD(input: PRDDraftInput): Promise<PRDDraft> {
    const { value } = await callOpenAI<PRDDraft>({
      method: 'generatePRD',
      system:
        'You are a product manager writing a tight MVP PRD. 9 sections, each 3-8 sentences / lines, ' +
        'concrete and shippable. Output JSON with keys: ' +
        'title, productPositioning, targetUsers, corePainPoints, mvpFeatureScope, ' +
        'pageStructure, dataModel, apiDesign, acceptanceCriteria, devPlan.',
      user:
        `MVP: ${input.mvpProject.name}\n` +
        `Stage: ${input.mvpProject.stage}\n` +
        `Start: ${input.mvpProject.startDate}\n` +
        `Description: ${input.mvpProject.description}\n` +
        (input.opportunity
          ? `Opportunity: ${input.opportunity.title}\n  Target: ${input.opportunity.targetUser}\n  Pain: ${input.opportunity.painPoint}\n  Solution: ${input.opportunity.solutionIdea}\n  Status: ${input.opportunity.status}\n`
          : '') +
        `Previous launches: ${input.launchCount ?? 0}`,
    });
    return value;
  }

  async function generateCodexTasks(input: CodexTaskListInput): Promise<CodexTaskListDraft> {
    const { value } = await callOpenAI<{
      summary: string;
      tasks: Array<{
        category: CodexTaskCategory;
        title: string;
        description: string;
        codexCommand: string;
        changedFiles: string[];
        phase: TaskPhase;
        priority: TaskPriority;
      }>;
    }>({
      method: 'generateCodexTasks',
      system:
        'You translate a PRD into exactly 6 Codex tasks, one per category: ' +
        'architecture, data_model, page, api, test, deploy. ' +
        'Each task.title ≤ 80 chars; description ≤ 400 chars; codexCommand is a single-line shell command ' +
        'that can be copy-pasted into a Codex agent; changedFiles lists relative paths. ' +
        'Output JSON: {"summary", "tasks": [{category,title,description,codexCommand,changedFiles,phase,priority}]}',
      user:
        `MVP: ${input.mvpProject.name}\n` +
        `Stage: ${input.mvpProject.stage}\n` +
        `PRD v${input.prd.version} — feature scope: ${input.prd.mvpFeatureScope}\n` +
        `Page structure: ${input.prd.pageStructure}\n` +
        `Data model: ${input.prd.dataModel}\n` +
        `API design: ${input.prd.apiDesign}\n` +
        `Acceptance criteria: ${input.prd.acceptanceCriteria}\n` +
        `Dev plan: ${input.prd.devPlan}`,
    });
    return {
      summary: value.summary,
      tasks: value.tasks.map((t) => ({
        category: t.category,
        title: t.title,
        description: t.description,
        codexCommand: t.codexCommand,
        changedFiles: t.changedFiles,
        phase: t.phase,
        priority: t.priority,
      })),
    };
  }

  async function generateGEOSuggestions(
    brand: GEOBrandEntity,
    queries: AIQuery[],
  ): Promise<string[]> {
    const { value } = await callOpenAI<{ suggestions: string[] }>({
      method: 'generateGEOSuggestions',
      system:
        'You are a GEO (Generative Engine Optimization) consultant. ' +
        'Given a brand profile and the AI queries the brand wants to rank for, ' +
        'produce 4-6 actionable suggestions ordered by impact. ' +
        'Each suggestion is 1-2 sentences, concrete (e.g., "publish a /vs/<competitor> page"). ' +
        'Output JSON: {"suggestions": ["..."]}.',
      user:
        `Brand: ${brand.canonicalName}\n` +
        `Description: ${brand.description}\n` +
        `Pillars: ${(brand.pillars ?? []).join(', ') || '(none)'}\n` +
        `Aliases: ${(brand.aliases ?? []).join(', ') || '(none)'}\n` +
        `Tracked queries (${queries.length}):\n` +
        queries.slice(0, 10).map((q) => `  - [${q.intent}/${q.provider}] ${q.text}`).join('\n'),
    });
    return value.suggestions;
  }

  async function generateLessonLearned(launchResult: LaunchResult): Promise<LessonLearned> {
    const { value } = await callOpenAI<{
      whatWorked: string;
      whatFailed: string;
      why: string;
      customerInsight: string;
      marketInsight: string;
      productInsight: string;
      geoInsight: string;
      nextAction: string;
      scoreModelSuggestion: string;
    }>({
      method: 'generateLessonLearned',
      system:
        'You write a structured post-launch retrospective. Each field 1-3 sentences, ' +
        'concrete and falsifiable. Output JSON with keys: whatWorked, whatFailed, why, ' +
        'customerInsight, marketInsight, productInsight, geoInsight, nextAction, scoreModelSuggestion.',
      user:
        `Launch: ${launchResult.id}\n` +
        `Date: ${launchResult.launchDate}\n` +
        `Status: ${launchResult.resultStatus}\n` +
        `Users: ${launchResult.users}, Signups: ${launchResult.signups}, Revenue: ${launchResult.revenue}\n` +
        `Traffic: ${launchResult.traffic}, Conversion: ${launchResult.conversionRate}, Retention: ${launchResult.retentionRate}\n` +
        `Feedback summary: ${launchResult.feedbackSummary}`,
    });
    const now = new Date().toISOString();
    return {
      id: `lesson_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
      projectId: launchResult.mvpProjectId,
      launchResultId: launchResult.id,
      whatWorked: value.whatWorked,
      whatFailed: value.whatFailed,
      why: value.why,
      customerInsight: value.customerInsight,
      marketInsight: value.marketInsight,
      productInsight: value.productInsight,
      geoInsight: value.geoInsight,
      nextAction: value.nextAction,
      scoreModelSuggestion: value.scoreModelSuggestion,
      createdAt: now,
      updatedAt: now,
    };
  }

  async function improvePromptVersion(
    target:
      | { kind: 'prompt'; prompt: PromptVersion }
      | { kind: 'loop'; loop: LoopVersion },
  ): Promise<ImprovementDraft> {
    const subject = target.kind === 'prompt' ? target.prompt : target.loop;
    const label = target.kind;
    const version = subject.version;
    const content =
      target.kind === 'prompt' ? target.prompt.content : target.loop.steps.join('\n');

    const { value } = await callOpenAI<{ problem: string; suggestion: string }>({
      method: 'improvePromptVersion',
      system:
        'You critique a ' + label + ' v' + version + ' and suggest a concrete, testable improvement. ' +
        'Each field 1-3 sentences. Output JSON: {"problem", "suggestion"}.',
      user:
        `Type: ${label}\n` +
        `Name: ${subject.name}\n` +
        `Used for: ${'usedFor' in subject ? subject.usedFor : '(loop)'}\n` +
        `Current score (self-reported): ${subject.score ?? 'n/a'}\n` +
        `Content:\n${content.slice(0, 2000)}`,
    });
    return { problem: value.problem, suggestion: value.suggestion };
  }

  // ---------- 5 个 draft 方法：real 不实现，fallback 兜底 ----------

  return {
    name: 'OpenAILLMProvider',

    getCostLog() {
      // 返回拷贝，避免外部 push
      return costLog.map((e) => ({ ...e }));
    },

    clearCostLog() {
      costLog.length = 0;
    },

    async health() {
      const env = getServerEnv();
      return {
        ok: Boolean(env.openai.apiKey),
        detail: env.openai.apiKey
          ? `openai configured, model=${DEFAULT_MODEL}, prices=${Object.keys(MODEL_PRICES).join('/')}`
          : 'OPENAI_API_KEY missing — call getLLMProvider() will fall back to mock',
      };
    },

    async summarizeSource(s) { return summarizeSource(s); },
    async generateResearchCard(t, ids) { return generateResearchCard(t, ids); },
    async scoreOpportunity(o) { return scoreOpportunity(o); },
    async generatePRD(i) { return generatePRD(i); },
    async generateCodexTasks(i) { return generateCodexTasks(i); },
    async generateGEOSuggestions(b, qs) { return generateGEOSuggestions(b, qs); },
    async generateLessonLearned(l) { return generateLessonLearned(l); },
    async improvePromptVersion(t) { return improvePromptVersion(t); },

    // 5 个 draft 方法：real 抛错，fallback 兜底
    generateCardDraftFromSource(_s: SourceItem): Promise<CardDraft> {
      throw NOT_IMPLEMENTED_IN_REAL('generateCardDraftFromSource');
    },
    generateCardDraftFromTopic(_t: ResearchTopic, _ids: string[]): Promise<CardDraft> {
      throw NOT_IMPLEMENTED_IN_REAL('generateCardDraftFromTopic');
    },
    generateOpportunityDraft(_i: { signalIds: string[]; researchCardIds: string[] }): Promise<OpportunityDraft> {
      throw NOT_IMPLEMENTED_IN_REAL('generateOpportunityDraft');
    },
    generateAIQueryBankDraft(_i: {
      brand: BrandEntityProfile;
      intent: AIQueryBankIntent;
      platform: AIQueryBankPlatform;
      count: number;
    }): Promise<AIQueryBankDraft[]> {
      throw NOT_IMPLEMENTED_IN_REAL('generateAIQueryBankDraft');
    },
  };
}
