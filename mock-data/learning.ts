/**
 * Learning 域 mock 数据（v2 字段口径，2026-06-26）。
 *
 * 8 条 LessonLearned。结构已从"知识条目"升级为"复盘报告"——
 * 每条 lesson 都填齐 9 个洞察字段：whatWorked / whatFailed / why / 4 axes /
 * nextAction / scoreModelSuggestion。来源横跨：MVP launch、opportunity
 * 评估、GEO 观察、kill decision。
 *
 * 故意不放在 mvp-projects.ts：lesson 的来源不只是 MVP launch。
 */

import type { LessonLearned } from '@/types';

export const mockLessons: LessonLearned[] = [
  {
    id: 'lesson_geo_lag',
    projectId: 'mvp_geo_pulse',
    launchResultId: 'result_geo_pulse_paid_v1',
    whatWorked:
      'AARW 改写版上线后 6-8 周内引用率从 0% 上升到 12-18%。客户对"我们能持续监测"的产品价值认可度高。',
    whatFailed:
      '前 2 周内看不到任何位次变化，sales 团队误以为产品无效，在 2 个客户面前过度承诺。',
    why:
      'AI 搜索引擎对权威站点 + 结构化数据的抓取-索引-引用周期 ≈ 6-8 周；和传统 SEO 的"内容发布后几天见效"心智模型不同。',
    customerInsight:
      '客户原话："我们先观察 1-2 个月再决定续费。"客户默认把 GEO 视为长周期投入，不是单次交易。',
    marketInsight:
      '3 个月内没有竞品跑通"自动 AARW 改写 + 引用监测"端到端；现有 SaaS 要么只监测不优化，要么只优化不监测。',
    productInsight:
      'Dashboard 缺"等待期提示"（"引用率通常 6-8 周才稳定"），导致用户在前 2 周不断来回查；建议加一个"引用率成熟度"指标。',
    geoInsight:
      'AI 答案里的品牌引用集中在 3 类源：维基类权威页、深度长文（3000+ 字）、FAQ schema 覆盖页。新闻稿 / 列表页几乎不被引用。',
    nextAction:
      '产品：在 dashboard 顶部加"引用率成熟度"信号条（基于发布后周数动态计算）。运营：sales 培训加入 GEO 周期预期。本周 owner = founder_1。',
    scoreModelSuggestion:
      'OpportunityEvaluation 的 timing 维度可加入"GEO 周期对齐"子项（权重 +5%）：识别需要 8+ 周才能见效的机会时，time-to-revenue 阈值要更宽松。',
    createdAt: '2026-06-05T10:00:00.000Z',
    updatedAt: '2026-06-22T14:00:00.000Z',
  },
  {
    id: 'lesson_brand_clarity',
    projectId: 'mvp_geo_pulse',
    whatWorked:
      '补全 canonicalName + 1 段 canonical description 后，ChatGPT 的归类从"AI productivity tool"修正到"GEO monitoring SaaS"，引用语境贴合度显著改善。',
    whatFailed:
      'CVO 早期没意识到 canonicalName 缺失，等发现问题时已经在 5 个 AI 答案里"定型"了错误的品牌归类。',
    why:
      'AI 答案引擎在没有显式描述时会用最大公约数归类（"产品 + 行业"），导致新品牌被塞进错误赛道。',
    customerInsight:
      '客户在被错误归类时不会主动告知；他们以为这就是自己的定位，直到 sales call 里被指出才意识到问题。',
    marketInsight:
      '12 家竞品中只有 3 家在主页写了明确的 canonical 描述；这是普遍盲区，构成短期差异化机会。',
    productInsight:
      'Onboarding 应把"canonical 描述填写"作为首日必做项，并给一个 AI 改写建议。当前是可选字段。',
    geoInsight:
      '结构化数据（Organization schema + sameAs links）对 AI 引用归类的修正效果，比传统 SEO 强 3-5x。',
    nextAction:
      '产品：把 canonicalName 升为 onboarding 必填；加 Organization schema 自动生成。本周 owner = founder_1。运营：写一篇"Why canonicalName matters for AI search"博客。',
    scoreModelSuggestion:
      'GEO 维度的评分可加入"结构化数据覆盖度"子项：扫客户主页 / schema.org / Wikipedia 条目是否齐全，缺一项 -10 分。',
    createdAt: '2026-05-30T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'lesson_paid_acquisition_geo',
    projectId: 'mvp_signal_radar',
    launchResultId: 'result_signal_radar_v2',
    whatWorked:
      '对照实验设计很干净（付费组 vs 自然组各 200 用户，3 个月观察），结论可靠。',
    whatFailed:
      '客户在听完"付费不能提升 AI 引用"后流失了 1/3；sales 缺乏替代叙事。',
    why:
      'AI 答案引擎的引用源偏向权威站点 + 结构化数据；付费广告不进入答案生成的检索路径。',
    customerInsight:
      '客户预期"我出钱 = 出现在 AI 答案里"，和 SEO 时代"我出钱 = Google 第一页"的心智相同。',
    marketInsight:
      'LinkedIn / Google Ads 对 AI 答案的影响接近 0；短期不存在"付费 GEO 推广"市场。',
    productInsight:
      '应在 dashboard 里显示"权威源引用占比"和"付费 / 自然流量贡献"两个指标，让客户看到自己缺的不是流量而是权威。',
    geoInsight:
      'AI 引用的信源结构 ≈ 30% 维基 / 行业百科，40% 长文权威站（substack / 行业博客），20% 官方文档，10% 其他。',
    nextAction:
      '产品：加权威源引用占比 widget。销售：改用"权威源建设 ROI"叙事。本周 owner = founder_1。',
    scoreModelSuggestion:
      'OpportunityEvaluation 的 go_to_market 维度要惩罚"靠付费广告"的机会：在打分时把 paid acquisition dependency 单独扣分。',
    createdAt: '2026-06-12T10:00:00.000Z',
    updatedAt: '2026-06-12T10:00:00.000Z',
  },
  {
    id: 'lesson_citation_decay',
    projectId: 'mvp_geo_pulse',
    whatWorked:
      '续费提醒机制（"你的白皮书引用率掉了 18%，建议刷新"）让 6 月续费率提升到 92%。',
    whatFailed:
      '5 月发布时没设计"内容保鲜"工作流；客户都是自己手动刷新。',
    why:
      'AI 答案引擎会优先引用近期发布 + 高频更新的内容；静态页面在 8-12 周后位次会被新内容顶掉。',
    customerInsight:
      '客户最怕的不是首次没被引用，而是"我好不容易上来的位次被顶下去"；需要持续陪伴感。',
    marketInsight:
      '竞品普遍卖"一次性 AI 优化"，没人做订阅制的"持续保鲜"；这是清晰的产品定位。',
    productInsight:
      '内容保鲜工具（监测 → 提醒 → 一键刷新）应成为独立 SKU，不只是 dashboard 里的一个 widget。',
    geoInsight:
      '内容刷新触发"再引用"的最短间隔是 2-3 周；超过 8 周不更新，几乎肯定掉位次。',
    nextAction:
      '产品：本季度加 Content Refresher 模块（独立 SKU，$99/月起）。运营：把这条 lesson 写进 onboarding 邮件。本周 owner = founder_1。',
    scoreModelSuggestion:
      'GEO 维度的 decay 风险评估：所有静态内容资产都需要打分时考虑"刷新成本"，权重 5%。',
    createdAt: '2026-06-23T10:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
  },
  {
    id: 'lesson_query_intent',
    projectId: 'mvp_geo_pulse_paid',
    whatWorked:
      '把 60 个监控 query 按商业意图分层后，把监控配额 70% 集中在 commercial intent query，转化率从 0.4% 升到 2.1%。',
    whatFailed:
      'informational query 占了 40% 监控配额但只贡献 12% 试用，浪费明显。',
    why:
      '商业意图 query 的引用位次直接关联付费决策；信息 query 的引用更多是品牌曝光，不直接产生 pipeline。',
    customerInsight:
      '客户在 demo 时最常问"我能监控到我客户的客户在 AI 答案里被怎么推荐"；这个需求本质是 competitive intent monitoring。',
    marketInsight:
      'AI 答案引擎的商业意图 query 月环比增长 35%（vs 信息意图 8%）；结构性转向"决策辅助"赛道。',
    productInsight:
      'Query Library 模板应按 intent 分组：commercial / comparative / informational / navigational 四类，每类配不同 alert 阈值。',
    geoInsight:
      '商业意图 query 在 AI 答案里通常带"top X tools" / "best for Y" / "alternatives to Z" 句式；这些句式的引用权重最高。',
    nextAction:
      '产品：Query Library 模板按 intent 分组重做。本季度新功能。运营：把这条 lesson 写到 GEO Pulse 客户群。本周 owner = founder_1。',
    scoreModelSuggestion:
      'OpportunityEvaluation 的 market_size 维度可引入"intent mix"修正：监控 query 中 commercial intent 占比 > 50% 时，市场容量估值 ×1.5。',
    createdAt: '2026-06-20T11:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },
  {
    id: 'lesson_mvp_under_spec',
    projectId: 'mvp_citeboost',
    whatWorked:
      'v0.2 加了一键 AARW 改写试用后，付费转化从 0% 升到 8%。',
    whatFailed:
      'v0.1 只做"看引用"不做"改引用"，客户反馈"我们看到问题不知道怎么改"，激活率只有 12%。',
    why:
      '客户买工具的目的是"解决问题"不是"看见问题"；只监测不优化的产品定位是错的。',
    customerInsight:
      '客户原话："我能看到问题了，然后呢？"。他们需要"看见-改进-验证"闭环。',
    marketInsight:
      '12 家竞品中 9 家只监测不优化；只有 3 家做"监测+优化"端到端；这是 9 vs 3 的稀缺优势。',
    productInsight:
      'MVP 范围要砍功能但留 end-to-end；"看 + 改" 比"看得很深"更有商业价值。',
    geoInsight:
      '改写版内容在 AI 答案里的引用率比原文高 12-15%，说明"为 AI 重写"是一个独立的优化方向。',
    nextAction:
      '产品：v0.3 路线图围绕"批量改写 + A/B 测试"展开。运营：把这条 lesson 写进 PRD 模板（"MVP 必须是端到端"）。本周 owner = founder_1。',
    scoreModelSuggestion:
      'OpportunityEvaluation 的 founder_fit 维度要惩罚"只做半边解决方案"的机会：监测 / 优化 / 验证至少要 2 段才给 7+ 分。',
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'lesson_killed_aarw',
    projectId: 'mvp_aarw_academy',
    launchResultId: 'result_aarw_kill',
    whatWorked:
      '课程内容制作 4 周内完成；视频清晰度 + 模板完整度被购买者高度评价。',
    whatFailed:
      '4 周内只卖出 1 份课程（$299），转化率 0.4% 远低于 2% 阈值，决定 kill 整个产品线。',
    why:
      '课程类业务 LTV 太低（$299 × 几乎 0 复购），pre-seed 阶段单位获客成本无法摊薄。',
    customerInsight:
      '课程购买者决策周期长（> 2 周），与 pre-seed 阶段需要的快速反馈节奏不匹配。',
    marketInsight:
      '内容付费赛道已有太多玩家（Y combinator / Reforge / Lenny\'s），新入场者无差异化。',
    productInsight:
      'AARW 方法论更适合 1:1 consulting（$1.5K/单）或订阅制 newsletter（$50/月），不是课程。',
    geoInsight:
      '课程产品页在 AI 答案里被推荐的机会很低（"top AI courses" 类 query 主要推成熟平台）。',
    nextAction:
      '立即：停售课程页面。1 个月内：把 AARW 内容改造成 newsletter + 1:1 consulting 双轨。',
    scoreModelSuggestion:
      'OpportunityEvaluation 的 monetization 维度：ARPU < $500 且复购率 < 20% 的内容付费类机会直接 0 分（rule-out）。',
    createdAt: '2026-05-30T12:00:00.000Z',
    updatedAt: '2026-05-30T12:00:00.000Z',
  },
  {
    id: 'lesson_iteration_speed',
    projectId: 'mvp_signal_radar',
    launchResultId: 'result_signal_radar_v2',
    whatWorked:
      '把 sprint 周期从 6 周压到 2 周后，3 个版本迭代让 onboarding 时间从 15 分钟降到 4 分钟，激活率从 38% 升到 75%。',
    whatFailed:
      'v1 用了 6 周，2 周内就有 3 个客户流失；反馈-迭代循环太慢。',
    why:
      '内部工具的核心用户痛点变化快（数据源 / 合规要求），必须用小步快跑的方式跟上。',
    customerInsight:
      '客户在 onboarding 阶段最常问"你们的预设模板是什么"，说明"zero config"远不如"good default"。',
    marketInsight:
      '同价位竞品（Notion / Linear）都在 2 周发版；6 周的节奏在 2026 年已是劣势。',
    productInsight:
      '预设模板库比任何"配置 UI"都重要；产品开发应优先扩 templates 而不是加新功能。',
    geoInsight:
      '内部工具的 GEO 价值低（不在 AI 答案里被推荐），但产品页要在 SEO 上抓"工具评测"query。',
    nextAction:
      '产品：本季度 templates 库从 5 扩到 20。运营：把这条 lesson 写进团队周会节奏。',
    scoreModelSuggestion:
      'OpportunityEvaluation 的 speed_to_market 维度：内部工具 / 流程类项目，2 周以下迭代 = 10 分，6 周 = 4 分，> 6 周 = 0 分。',
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
];
