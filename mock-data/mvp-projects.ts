/**
 * MVP 域 mock 数据（v3 字段口径，2026-06-25）。
 *
 * 6 个 MVPProject，覆盖全部 7 个 stage（含 killed）。
 * LaunchResult / LessonLearned 沿用 v1 数据（LLMProvider 仍消费）。
 */

import type { MVPProject, LaunchResult } from '@/types';

/* ---------- MVPProject ---------- */

export const mockMVPProjects: MVPProject[] = [
  // 1. idea — NarrativeForge，brand kit 派生
  {
    id: 'mvp_narrative_forge',
    opportunityId: 'opp_brand_narrative_kit',
    name: 'NarrativeForge',
    description: 'AI 引导式品牌叙事工具包：用户填 5 个问题，输出品牌定位 + 1 篇 hero 稿 + 5 篇 social 文案。',
    stage: 'idea',
    owner: 'founder_1',
    startDate: '2026-06-05',
    revenue: 0,
    cost: 0,
    lessons: '需先验证 ICP 是否真愿意为 brand narrative 工具付费；候选从 agency 转 in-house brand team。',
    createdAt: '2026-06-05T10:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  // 2. research — AI Search SEO 调研
  {
    id: 'mvp_ai_seo_research',
    opportunityId: 'opp_ai_search_seo',
    name: 'AI Search SEO Audit',
    description: '给目标站做 1 份 AI 搜索可见度审计：监测 30 个 query 在 4 个引擎里的出现频次 + 引用源。',
    stage: 'research',
    owner: 'founder_1',
    startDate: '2026-06-10',
    revenue: 0,
    cost: 200,
    lessons: '调研 8 个 SEO agency，结论：现有工具都只覆盖 Google，AI 搜索盲区是真实痛点。',
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },
  // 3. validation — GEO Pulse 验证中
  {
    id: 'mvp_geo_pulse',
    opportunityId: 'opp_geo_monitor',
    name: 'GEO Pulse',
    description: 'AI 答案引擎品牌可见度监控 SaaS。Dashboard + 7 个 AI 引擎的 brand mention 频率跟踪。',
    stage: 'validation',
    owner: 'founder_1',
    startDate: '2026-05-20',
    revenue: 0,
    cost: 1500,
    lessons: '12/20 试用品牌表示愿意付 $500/月。Onboarding 仍是最大流失点：数据源接入 4 步缩到 2 步后激活率 +18%。',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-06-22T14:30:00.000Z',
  },
  // 4. mvp — CiteBoost 在做 MVP
  {
    id: 'mvp_citeboost',
    opportunityId: 'opp_citation_optimizer',
    name: 'CiteBoost',
    description: 'AARW 内容改写 + 引用优化服务：上传文章 → 自动生成 AI-搜索友好的改写版 + 引用建议。',
    stage: 'mvp',
    owner: 'founder_1',
    startDate: '2026-05-01',
    revenue: 0,
    cost: 4200,
    lessons: '客户流程太长（上传 → 解析 → 改写 → 审核），需要把交付从 1 周压到 2 天。',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },
  // 5. launched — Signal Radar 已上线
  {
    id: 'mvp_signal_radar',
    opportunityId: 'opp_geo_monitor',
    name: 'Signal Radar',
    description: '内部用 dashboard：聚合研究、信号、上线指标。一站式把 weekly review 自动化。',
    stage: 'launched',
    owner: 'founder_1',
    startDate: '2026-04-01',
    launchDate: '2026-05-01',
    revenue: 0,
    cost: 6800,
    lessons: 'V1 onboarding 太重，激活率 38%。V2 加预设模板后激活率升到 75%，后续要持续扩模板库。',
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  // 6. revenue — GEO Pulse 收入期（与 validation 同 opp，平行试错）
  {
    id: 'mvp_geo_pulse_paid',
    opportunityId: 'opp_geo_monitor',
    name: 'GEO Pulse (Paid Tier)',
    description: 'GEO Pulse 收费版：监控引擎从 7 个扩到 12 个 + 周报 + 竞品对比。',
    stage: 'revenue',
    owner: 'founder_1',
    startDate: '2026-06-01',
    launchDate: '2026-06-22',
    revenue: 6000,
    cost: 3200,
    lessons: '12 个付费客户 × $500/月，年化 ARR run-rate $72K。Churn 监测要尽快建：6 月起按月跟踪。',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-22T14:00:00.000Z',
  },
  // 7. killed — AARW Academy 已终止
  {
    id: 'mvp_aarw_academy',
    opportunityId: 'opp_aarw_consulting',
    name: 'AARW Academy',
    description: 'AARW 方法论在线课程：12 章视频 + 模板包。',
    stage: 'killed',
    owner: 'founder_1',
    startDate: '2026-04-10',
    launchDate: '2026-05-20',
    revenue: 299,
    cost: 4500,
    lessons: '4 周内只卖出 1 份课程（$299），转化率 0.4% 远低于 2% 阈值。课程不是当前最佳载体，决定做 1:1 consulting + 内容引流。',
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-05-30T12:00:00.000Z',
  },
];

/* ---------- LaunchResult ---------- */

export const mockLaunchResults: LaunchResult[] = [
  // Signal Radar：v1 信息密度高 / onboarding 模糊
  {
    id: 'result_signal_radar_v1',
    mvpProjectId: 'mvp_signal_radar',
    launchDate: '2026-05-01',
    users: 420,
    signups: 8,
    revenue: 0,
    traffic: 1820,
    conversionRate: 1.9,
    retentionRate: 12,
    feedbackSummary: '界面信息密度高，但 onboarding 模糊，3 个用户卡在数据源接入。',
    resultStatus: 'neutral',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  // Signal Radar：v2 加了预设模板
  {
    id: 'result_signal_radar_v2',
    mvpProjectId: 'mvp_signal_radar',
    launchDate: '2026-06-10',
    users: 1240,
    signups: 24,
    revenue: 0,
    traffic: 5640,
    conversionRate: 1.9,
    retentionRate: 38,
    feedbackSummary: '加了预设模板后 onboarding 时间从 15 分钟降到 4 分钟；14 个周活。',
    resultStatus: 'success',
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  // GEO Pulse Paid：12 个试用品牌 100% 付费意愿
  {
    id: 'result_geo_pulse_paid_v1',
    mvpProjectId: 'mvp_geo_pulse_paid',
    launchDate: '2026-06-22',
    users: 1100,
    signups: 35,
    revenue: 6000,
    traffic: 9200,
    conversionRate: 3.2,
    retentionRate: 55,
    feedbackSummary: '12 个试用品牌中 12 个愿意付 $500/月。年化 ARR run-rate = $72K。',
    resultStatus: 'success',
    createdAt: '2026-06-22T14:00:00.000Z',
    updatedAt: '2026-06-22T14:00:00.000Z',
  },
  // AARW Academy：kill decision
  {
    id: 'result_aarw_kill',
    mvpProjectId: 'mvp_aarw_academy',
    launchDate: '2026-05-20',
    users: 980,
    signups: 4,
    revenue: 299,
    traffic: 3100,
    conversionRate: 0.4,
    retentionRate: 8,
    feedbackSummary: '4 周内只卖出 1 份课程（$299），转化率 0.4%，远低于 2% 阈值。',
    resultStatus: 'failed',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-30T12:00:00.000Z',
  },
  // CiteBoost 内部 beta
  {
    id: 'result_citeboost_beta',
    mvpProjectId: 'mvp_citeboost',
    launchDate: '2026-06-15',
    users: 60,
    signups: 5,
    revenue: 0,
    traffic: 240,
    conversionRate: 8.3,
    retentionRate: 40,
    feedbackSummary: '内部 5 个客户试用，AARW 改写对老内容有 15% 引用率提升，但流程太重。',
    resultStatus: 'neutral',
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
];
