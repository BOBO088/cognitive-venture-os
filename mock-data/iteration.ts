/**
 * Iteration 域 mock 数据（v1，2026-06-26）。
 *
 * 故事：
 *   - GEO Pulse PRD generator：v1 → v3，第三次重写时 score 80（最初 v1 = 52）。
 *   - GEO suggestions：v1 → v2，加了"先看 competitors"前导后从 65 升到 78。
 *   - Weekly review loop：v1 → v2，加"lesson review"步骤后从 60 升到 75。
 *   - 配套 5 条 ImprovementLog，展示典型的"问题 → 建议 → 应用结果"轨迹。
 *
 * 5 个 prompts 覆盖 4 个 type；3 个 loops 覆盖 3 个不同的 name；5 个 improvements
 * 跨 prompt / loop / score_model 三种 targetType。
 */

import type {
  PromptVersion,
  LoopVersion,
  ImprovementLog,
} from '@/types';

export const mockPromptVersions: PromptVersion[] = [
  // 1. GEO Pulse PRD generator v1 — 早期版本，score 低
  {
    id: 'prompt_geo_pulse_prd_v1',
    name: 'GEO Pulse PRD generator',
    type: 'prd_draft',
    content: `You are a product manager. Given an MVP project and its source opportunity, write a PRD with 9 sections: productPositioning, targetUsers, corePainPoints, mvpFeatureScope, pageStructure, dataModel, apiDesign, acceptanceCriteria, devPlan.`,
    version: 1,
    usedFor: 'mvp_geo_pulse_paid（生成 v1 时的 PRD）',
    score: 52,
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-12T10:00:00.000Z',
  },
  // 2. GEO Pulse PRD generator v2 — 加入了 previous launch context，score 升
  {
    id: 'prompt_geo_pulse_prd_v2',
    name: 'GEO Pulse PRD generator',
    type: 'prd_draft',
    content: `You are a senior product manager specialized in B2B SaaS. Given:
1. An MVP project (name, description, stage, startDate)
2. Its source opportunity (target user, pain point, solution idea, status)
3. All prior launches for this MVP (date, status, users, signups, conv, ret, revenue, feedback)

Write a PRD with 9 sections. Reference prior launch metrics when describing validation needs. Be specific: cite user pain point verbatim from opportunity.`,
    version: 2,
    usedFor: 'mvp_geo_pulse_paid（v2 引入前序 launch context）',
    score: 71,
    createdAt: '2026-05-25T10:00:00.000Z',
    updatedAt: '2026-05-26T10:00:00.000Z',
  },
  // 3. GEO Pulse PRD generator v3 — 加入了 GEO 上下文
  {
    id: 'prompt_geo_pulse_prd_v3',
    name: 'GEO Pulse PRD generator',
    type: 'prd_draft',
    content: `You are a senior product manager specialized in B2B GEO SaaS. Given:
1. An MVP project (name, description, stage, startDate)
2. Its source opportunity
3. All prior launches with metrics + feedback
4. The MVP's GEO brand entity (canonical name, description, pillars, aliases) and 3 sample AI queries (text, intent)

Write a PRD with 9 sections. In mvpFeatureScope, propose features that improve AI citation rate (not just traffic). In acceptanceCriteria, include "first-week citation rate uplift" as a metric. Reference prior launch feedback verbatim.`,
    version: 3,
    usedFor: 'mvp_citeboost（v3 引入 GEO 上下文）',
    score: 80,
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  // 4. GEO suggestions v1
  {
    id: 'prompt_geo_suggestions_v1',
    name: 'GEO Pulse suggestion engine',
    type: 'geo_suggestion',
    content: `Given a GEO brand entity and 3 AI queries, return 3-5 actionable suggestions to improve AI citation rate. Each suggestion should be 1-2 sentences and reference a specific asset or schema change.`,
    version: 1,
    usedFor: 'brand_cvo（v1：基础建议）',
    score: 65,
    createdAt: '2026-05-05T10:00:00.000Z',
    updatedAt: '2026-05-08T10:00:00.000Z',
  },
  // 5. GEO suggestions v2 — 加入了 competitor 上下文
  {
    id: 'prompt_geo_suggestions_v2',
    name: 'GEO Pulse suggestion engine',
    type: 'geo_suggestion',
    content: `Given a GEO brand entity, 3 AI queries, and 3 competitor citation results (verdict + excerpt + position), return 3-5 suggestions. For each suggestion, identify which competitor's content is currently winning the cited position and what the brand should do to displace it. Each suggestion 1-2 sentences.`,
    version: 2,
    usedFor: 'brand_cvo（v2：加 competitor 上下文）',
    score: 78,
    createdAt: '2026-06-08T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  // 6. Opportunity score prompt
  {
    id: 'prompt_opp_score_v1',
    name: 'Opportunity scoring rubric',
    type: 'opportunity_score',
    content: `Score the following opportunity on 4 dimensions (0-10 each): market, feasibility, timing, differentiation. Total = average. Provide a 1-paragraph rationale.`,
    version: 1,
    usedFor: '通用（被 opportunityScoreV1 评估器使用）',
    score: 60,
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-04-12T10:00:00.000Z',
  },
];

export const mockLoopVersions: LoopVersion[] = [
  // 1. Weekly review v1 — 缺 lesson review
  {
    id: 'loop_weekly_review_v1',
    name: 'Weekly review loop',
    steps: [
      'Scan launches from past 7 days',
      'Update MVPProject stages',
      'Write top 3 lessons into LessonLearned',
    ],
    stopCondition: 'All launches have a corresponding stage update + lesson entry.',
    evaluationCriteria: 'Loop complete when 100% of launches have lessons; quality is human-rated.',
    version: 1,
    score: 60,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-03T10:00:00.000Z',
  },
  // 2. Weekly review v2 — 加 lesson review
  {
    id: 'loop_weekly_review_v2',
    name: 'Weekly review loop',
    steps: [
      'Scan launches from past 7 days',
      'Update MVPProject stages',
      'Write top 3 lessons into LessonLearned',
      'Score new prompts/loops from this week',
      'Decide next-week OKR alignment',
    ],
    stopCondition: 'All launches reviewed + at least 1 new score logged + 1 OKR decision made.',
    evaluationCriteria: 'Loop complete when 4 of 5 steps done; quality is human-rated.',
    version: 2,
    score: 75,
    createdAt: '2026-06-05T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  // 3. Research → MVP loop
  {
    id: 'loop_research_to_mvp_v1',
    name: 'Research-to-MVP loop',
    steps: [
      'Pick 3 candidate opportunities from research',
      'Run multi-dim scoring on each',
      'Pick top 1 with totalScore >= 70',
      'Generate MVPProject + initial PRD',
      'Plan next 7-day Codex task list',
    ],
    stopCondition: 'Either: top 1 picked with score >= 70, OR all 3 candidates scored < 50.',
    evaluationCriteria: 'Loop complete when a decision is made; quality measured by 4-week survival of the chosen MVP.',
    version: 1,
    score: 70,
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-18T10:00:00.000Z',
  },
];

export const mockImprovementLogs: ImprovementLog[] = [
  // 1. 对 prompt_geo_pulse_prd_v1 的改进 — 已应用 → v2
  {
    id: 'improve_prd_v1_to_v2',
    targetType: 'prompt',
    targetId: 'prompt_geo_pulse_prd_v1',
    problem: 'v1 生成的 PRD 没有引用前序 launch 的具体指标，导致 acceptanceCriteria 太空泛、不可验证。',
    suggestion: '在 prompt 中加入 "All prior launches for this MVP" 字段，要求 LLM 引用 conv/retention 等具体数字写 acceptanceCriteria。',
    result: '已应用 → v2 score 从 52 升到 71。acceptanceCriteria 现在每条都有可量化阈值。',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-26T10:00:00.000Z',
  },
  // 2. 对 prompt_geo_pulse_prd_v2 的改进 — 已应用 → v3
  {
    id: 'improve_prd_v2_to_v3',
    targetType: 'prompt',
    targetId: 'prompt_geo_pulse_prd_v2',
    problem: 'v2 生成的 PRD 没有 GEO 视角的 feature；客户在 demo 时反馈"你们懂 GEO 但 PRD 不像 GEO 产品"。',
    suggestion: '加入 GEO brand entity + sample queries 作为 prompt context；在 mvpFeatureScope 中要求"提升 AI 引用率"功能。',
    result: '已应用 → v3 score 升到 80。CiteBoost PRD v1 引用了 3 个 GEO feature suggestion。',
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  // 3. 对 prompt_geo_suggestions_v1 的改进 — 已应用 → v2
  {
    id: 'improve_geo_sugg_v1_to_v2',
    targetType: 'prompt',
    targetId: 'prompt_geo_suggestions_v1',
    problem: 'v1 生成的建议过于通用（如"加 structured data"），没有具体到"哪个竞品在抢位"。客户觉得"看完不知道该改哪里"。',
    suggestion: '加入 competitor citation result 作为 context；要求每条建议明确"竞品 X 占了位次 N，建议 Y 抢回"。',
    result: '已应用 → v2 score 65 → 78。建议具体度提升 3x（人工评估）。',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  // 4. 对 loop_weekly_review_v1 的改进 — 已应用 → v2
  {
    id: 'improve_loop_weekly_v1_to_v2',
    targetType: 'loop',
    targetId: 'loop_weekly_review_v1',
    problem: 'v1 循环只做"复盘 + 写 lesson"，但不评估新写的 lesson 是否要反馈到 prompt / loop。LessonLearned 沉积但不进化。',
    suggestion: '加第 4 步 "Score new prompts/loops from this week"，强制每周评估 1 个新引入的 prompt/loop 质量。',
    result: '已应用 → v2 score 60 → 75。本月新增 2 条 ImprovementLog 来源于此循环。',
    createdAt: '2026-05-30T10:00:00.000Z',
    updatedAt: '2026-06-05T10:00:00.000Z',
  },
  // 5. 对 opportunity_score_v1 的改进（指向评分模型本身，未应用）
  {
    id: 'improve_opp_score_model',
    targetType: 'score_model',
    targetId: 'opportunity_score_model',
    problem: 'OpportunityEvaluation 9 维度（marketSize 15% / painIntensity 15% / ...）是基于 2025 经验设定；2026 年 GEO 相关 opportunity 占比从 10% 升到 35%，但 geoPotential 仍只 10%。',
    suggestion: '把 geoPotential 从 10% 提到 15%，相应从 monetization 或 speed_to_market 各减 2.5%。',
    result: 'TBD — 计划在 Q3 评分模型 review 时一并调整 3 个权重。',
    createdAt: '2026-06-22T10:00:00.000Z',
    updatedAt: '2026-06-22T10:00:00.000Z',
  },
];
