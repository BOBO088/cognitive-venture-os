/**
 * Knowledge Graph 域 mock 数据。
 *
 * 故事线：团队围绕 GEO 生态建立知识图谱。
 *   18 个实体，覆盖 12 个 GraphEntityKind。
 *   16 条有向边，覆盖 12 个 GraphRelationKind 中的 10 个
 *   （belongs_to / contradicts / mentioned_in / influences / alternative_to / similar_to
 *    / growing_in / supports / invested_by / built_by / uses / competes_with）。
 *
 * 约定：
 *   - entity.tags / entity.linkedResearchCardIds 由 service 在 read 时规范化 / 派生
 *   - relation.linkedResearchCardIds 由 UI bind/unbind 手动管理（mock 数据初始化为 []）
 *   - relation.strength 是 0..100 整数
 *   - 关系边方向：sourceEntityId → targetEntityId
 *     语义解读："sourceEntityId 关系于 targetEntityId"
 *     例：A invested_by B = A 被 B 投资（A 是被投方）
 *         A built_by B = A 由 B 构建（A 是产物）
 */

import type { GraphEntity, GraphRelation } from '@/types';

/* ---------- GraphEntity ---------- */

export const mockGraphEntities: GraphEntity[] = [
  // ----- company (5) -----
  {
    id: 'entity_perplexity',
    name: 'Perplexity',
    kind: 'company',
    aliases: ['Perplexity AI', 'perplexity.ai'],
    description: 'AI 答案引擎，结合实时网页检索与 LLM。',
    metadata: { country: 'US', founded: '2022', stage: 'series-c' },
    tags: ['ai-search', 'answer-engine', 'us'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'entity_openai',
    name: 'OpenAI',
    kind: 'company',
    aliases: ['OpenAI, Inc.', 'openai.com'],
    description: 'ChatGPT 与 GPT 系列模型母公司，2024 年起推 SearchGPT。',
    metadata: { country: 'US', founded: '2015', stage: 'private' },
    tags: ['llm', 'chatgpt', 'us'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },
  {
    id: 'entity_anthropic',
    name: 'Anthropic',
    kind: 'company',
    aliases: ['Anthropic PBC'],
    description: 'Claude 模型母公司，开源了 MCP 协议。',
    metadata: { country: 'US', founded: '2021', stage: 'series-d' },
    tags: ['llm', 'claude', 'us', 'mcp'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-06-10T16:00:00.000Z',
  },
  {
    id: 'entity_google',
    name: 'Google',
    kind: 'company',
    aliases: ['Alphabet', 'google.com'],
    description: '传统搜索引擎，2024 年起推 Gemini + AI Overviews。',
    metadata: { country: 'US', founded: '1998', stage: 'public' },
    tags: ['search', 'gemini', 'us'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },
  {
    id: 'entity_cognitive_venture_os',
    name: 'Cognitive Venture OS',
    kind: 'company',
    aliases: ['CVO', 'cvo.ai'],
    description: 'AI-native 创业操作系统（GEO + 机会管理 + MVP 跟踪）。',
    metadata: { country: 'CN', founded: '2026', stage: 'pre-seed' },
    tags: ['cvo', 'geo', 'cn'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },

  // ----- product (2) -----
  {
    id: 'entity_product_searchgpt',
    name: 'SearchGPT',
    kind: 'product',
    aliases: ['SearchGPT prototype'],
    description: 'OpenAI 2024 年推出的 AI 搜索原型，主打引用源可追溯。',
    metadata: { vendor: 'OpenAI', launched: '2024-07' },
    tags: ['ai-search', 'openai', 'prototype'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-06-22T14:00:00.000Z',
  },
  {
    id: 'entity_product_claude',
    name: 'Claude',
    kind: 'product',
    aliases: ['Claude 3', 'Claude 3.5', 'Claude Sonnet'],
    description: 'Anthropic 的对话模型产品线，主打长上下文与工具调用。',
    metadata: { vendor: 'Anthropic' },
    tags: ['llm', 'anthropic', 'long-context'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },

  // ----- person (1) -----
  {
    id: 'entity_krishna',
    name: 'Krishna',
    kind: 'person',
    aliases: ['K. Krishna', 'Sreeram Krishna'],
    description: 'Princeton 研究员，GEO 论文一作。',
    metadata: { affiliation: 'Princeton' },
    tags: ['researcher', 'princeton', 'geo'],
    linkedResearchCardIds: [],
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  },

  // ----- technology (2) -----
  {
    id: 'entity_llms_txt',
    name: 'llms.txt',
    kind: 'technology',
    aliases: ['llms.txt standard'],
    description: '为 LLM 优化的网站摘要文件，2024 年由 Answer.AI 提出。',
    metadata: { proposed: '2024', status: 'emerging' },
    tags: ['standard', 'geo', 'llms-txt'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-20T09:00:00.000Z',
    updatedAt: '2026-04-20T09:00:00.000Z',
  },
  {
    id: 'entity_mcp',
    name: 'Model Context Protocol',
    kind: 'technology',
    aliases: ['MCP'],
    description: 'Anthropic 开源的 LLM ↔ 工具/数据源标准协议。',
    metadata: { open_source: 'true', version: '0.5' },
    tags: ['protocol', 'mcp', 'anthropic'],
    linkedResearchCardIds: [],
    createdAt: '2024-11-26T09:00:00.000Z',
    updatedAt: '2024-11-26T09:00:00.000Z',
  },

  // ----- market (2) -----
  {
    id: 'entity_market_geo_saas_2026',
    name: 'GEO SaaS Market 2026',
    kind: 'market',
    aliases: ['GEO 工具市场'],
    description: '2026 年 Generative Engine Optimization SaaS 市场规模。',
    metadata: { region: 'global', year: '2026' },
    tags: ['tam', 'geo', 'saas', '2026'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-08T09:00:00.000Z',
    updatedAt: '2026-06-22T14:30:00.000Z',
  },
  {
    id: 'entity_market_ai_search_global',
    name: 'AI Search Global',
    kind: 'market',
    aliases: ['AI 搜索市场'],
    description: '全球 AI 搜索 / 答案引擎市场，包括 ChatGPT / Perplexity / Gemini。',
    metadata: { region: 'global' },
    tags: ['tam', 'ai-search', 'global'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },

  // ----- trend (2) -----
  {
    id: 'entity_trend_citation_economy',
    name: 'Citation Economy',
    kind: 'trend',
    aliases: ['引用经济'],
    description: '从 SEO 排名经济转向"被 AI 引用"经济的范式转移。',
    metadata: { emerged: '2024' },
    tags: ['trend', 'geo', 'paradigm-shift'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'entity_trend_zero_click_search',
    name: 'Zero-Click Search',
    kind: 'trend',
    aliases: ['零点击搜索'],
    description: '用户在搜索结果页直接获得答案，无需点击外部链接的趋势。',
    metadata: { emerged: '2020' },
    tags: ['trend', 'search', 'ux'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },

  // ----- investor (2) -----
  {
    id: 'entity_investor_sequoia',
    name: 'Sequoia Capital',
    kind: 'investor',
    aliases: ['Sequoia'],
    description: '硅谷老牌 VC，AI 赛道重仓投资。',
    metadata: { country: 'US', hq: 'Menlo Park' },
    tags: ['vc', 'us', 'ai-investor'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-10T09:00:00.000Z',
    updatedAt: '2026-04-10T09:00:00.000Z',
  },
  {
    id: 'entity_investor_a16z',
    name: 'Andreessen Horowitz',
    kind: 'investor',
    aliases: ['a16z'],
    description: '硅谷头部 VC，AI 投资组合最广。',
    metadata: { country: 'US', hq: 'Menlo Park' },
    tags: ['vc', 'us', 'ai-investor'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-10T09:00:00.000Z',
    updatedAt: '2026-04-10T09:00:00.000Z',
  },

  // ----- ip (2) -----
  {
    id: 'entity_geo',
    name: 'Generative Engine Optimization',
    kind: 'ip',
    aliases: ['GEO'],
    description: '针对生成式 AI 答案引擎优化品牌可见度的实践方法论。',
    metadata: { coined: '2023', paper: 'Krishna 2023' },
    tags: ['methodology', 'geo', 'seo'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-13T09:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
  },
  {
    id: 'entity_aarw',
    name: 'AARW 原则',
    kind: 'ip',
    aliases: ['AARW methodology'],
    description: 'Add · Assert · Refute · Weigh 内容改写四原则。',
    metadata: { paper: 'Krishna 2023' },
    tags: ['methodology', 'aarw', 'content-rewrite'],
    linkedResearchCardIds: [],
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
  },

  // ----- character (2) -----
  {
    id: 'entity_char_operator',
    name: 'Operator',
    kind: 'character',
    aliases: ['founder operator'],
    description: 'CVO 的 operator 角色，负责串起研究 → 机会 → MVP 全流程。',
    metadata: { role: 'founder' },
    tags: ['role', 'operator', 'cvo'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },
  {
    id: 'entity_char_research_lead',
    name: 'Research Lead',
    kind: 'character',
    aliases: ['research lead agent'],
    description: 'CVO 的 research lead agent，负责驱动研究主题 / 资料 / 卡片。',
    metadata: { role: 'agent' },
    tags: ['role', 'agent', 'research'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },

  // ----- content_asset (2) -----
  {
    id: 'entity_content_krishna_2023',
    name: 'GEO Paper (Krishna 2023)',
    kind: 'content_asset',
    aliases: ['Krishna 2023 paper', 'arxiv 2311.09735'],
    description: 'GEO 概念首次提出的学术论文，Princeton 2023。',
    metadata: { kind: 'paper', year: '2023', url: 'https://arxiv.org/abs/2311.09735' },
    tags: ['paper', 'geo', 'krisna-2023'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-13T09:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
  },
  {
    id: 'entity_content_aarw_blog',
    name: 'AARW 实战 Blog Post',
    kind: 'content_asset',
    aliases: ['AARW blog'],
    description: '把 AARW 原则落到 CVO 自身博客的改写案例文章。',
    metadata: { kind: 'blog', year: '2026' },
    tags: ['blog', 'aarw', 'case-study'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-06-10T16:00:00.000Z',
  },

  // ----- platform (2) -----
  {
    id: 'entity_platform_chatgpt',
    name: 'ChatGPT Platform',
    kind: 'platform',
    aliases: ['chat.openai.com'],
    description: 'OpenAI 的对话式 AI 产品 / 平台，月活 2 亿+。',
    metadata: { vendor: 'OpenAI', mau: '200M+' },
    tags: ['platform', 'chatgpt', 'openai'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },
  {
    id: 'entity_platform_perplexity_app',
    name: 'Perplexity App',
    kind: 'platform',
    aliases: ['perplexity.ai app'],
    description: 'Perplexity 的 iOS / Web 答案引擎应用。',
    metadata: { vendor: 'Perplexity' },
    tags: ['platform', 'perplexity', 'app'],
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },

  // ----- tool (2) -----
  {
    id: 'entity_tool_otterly',
    name: 'Otterly',
    kind: 'tool',
    aliases: ['Otterly.ai'],
    description: 'GEO 监控工具，追踪品牌在 AI 答案中的可见度。',
    metadata: { category: 'geo-monitoring' },
    tags: ['tool', 'geo', 'monitoring'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-08T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'entity_tool_profound',
    name: 'Profound',
    kind: 'tool',
    aliases: ['Profound AI'],
    description: '企业级 GEO 监控 / 优化平台。',
    metadata: { category: 'geo-monitoring' },
    tags: ['tool', 'geo', 'enterprise'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-08T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'entity_apple',
    name: 'Apple',
    kind: 'company',
    aliases: ['Apple Inc.', 'AAPL'],
    description: '消费电子与平台公司，2024-2026 重点推 Apple Intelligence。',
    metadata: { country: 'US', founded: '1976', stage: 'public' },
    tags: ['consumer-tech', 'platform', 'us'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
  },
  {
    id: 'entity_nyt',
    name: 'The New York Times',
    kind: 'company',
    aliases: ['NYT', 'nytimes.com'],
    description: '传统媒体，2023 起起诉 OpenAI / Microsoft 侵权，标志性 AI 版权案原告。',
    metadata: { country: 'US', founded: '1851', stage: 'public' },
    tags: ['media', 'legal', 'us'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'entity_princeton_geo',
    name: 'Princeton GEO Research Group',
    kind: 'person',
    aliases: ['Princeton GEO Lab', 'Princeton NLP/GEO'],
    description: 'Princeton 大学提出的 Generative Engine Optimization (GEO) 研究团队。',
    metadata: { country: 'US', focus: 'geo', affiliation: 'Princeton University' },
    tags: ['research', 'geo', 'academic'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
  },
  {
    id: 'entity_langchain',
    name: 'LangChain',
    kind: 'company',
    aliases: ['LangChain Inc.', 'langchain.com'],
    description: 'LLM 应用编排框架 LangChain 母公司。',
    metadata: { country: 'US', founded: '2022', stage: 'series-b' },
    tags: ['llm', 'framework', 'us'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'entity_tiktok',
    name: 'TikTok',
    kind: 'platform',
    aliases: ['tiktok.com', '字节跳动旗下'],
    description: '短视频平台，2024-2026 在站内测试 AI 搜索与 GEO 化内容分发。',
    metadata: { country: 'US/CN', founded: '2016', parent: 'ByteDance' },
    tags: ['short-video', 'platform', 'social'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
  },
  {
    id: 'entity_mckinsey',
    name: 'McKinsey & Company',
    kind: 'company',
    aliases: ['McKinsey', 'mckinsey.com'],
    description: '全球管理咨询公司，2024-2026 发布多份 AI 搜索 / GEO 行业报告。',
    metadata: { country: 'US', founded: '1926', stage: 'private' },
    tags: ['consulting', 'research', 'us'],
    linkedResearchCardIds: [],
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
];

/* ---------- GraphRelation ----------
 *
 * direction: sourceEntityId → targetEntityId
 * 语义解读："sourceEntityId 关系于 targetEntityId"
 *
 * 关系类型说明（12 种）：
 *   competes_with      竞争 (对称，实际数据两条边)
 *   invested_by        被投资
 *   built_by           由...构建
 *   uses               使用
 *   belongs_to         属于
 *   growing_in         在...中增长
 *   mentioned_in       被...提及
 *   supports           支持
 *   contradicts        与...矛盾
 *   influences         影响
 *   similar_to         相似于
 *   alternative_to     替代
 */

export const mockGraphRelations: GraphRelation[] = [
  // ----- competes_with (3) -----
  {
    id: 'rel_perplexity_competes_openai',
    sourceEntityId: 'entity_perplexity',
    targetEntityId: 'entity_openai',
    relationType: 'competes_with',
    strength: 90,
    evidence: 'AI 答案引擎赛道直接竞争。',
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-04-12T09:00:00.000Z',
  },
  {
    id: 'rel_google_competes_openai',
    sourceEntityId: 'entity_google',
    targetEntityId: 'entity_openai',
    relationType: 'competes_with',
    strength: 95,
    evidence: 'Search vs SearchGPT / AI Overviews。',
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-04-12T09:00:00.000Z',
  },
  {
    id: 'rel_perplexity_competes_google',
    sourceEntityId: 'entity_perplexity',
    targetEntityId: 'entity_google',
    relationType: 'competes_with',
    strength: 85,
    evidence: 'Perplexity 直接挑战 Google 搜索。',
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-04-12T09:00:00.000Z',
  },

  // ----- similar_to (1) -----
  {
    id: 'rel_openai_similar_anthropic',
    sourceEntityId: 'entity_openai',
    targetEntityId: 'entity_anthropic',
    relationType: 'similar_to',
    strength: 70,
    evidence: '前沿 LLM 厂商，产品形态高度相似。',
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-04-12T09:00:00.000Z',
  },

  // ----- invested_by (2) -----
  {
    id: 'rel_perplexity_invested_by_sequoia',
    sourceEntityId: 'entity_perplexity',
    targetEntityId: 'entity_investor_sequoia',
    relationType: 'invested_by',
    strength: 90,
    evidence: 'Sequoia 领投 Perplexity B/C 轮。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-05-10T09:00:00.000Z',
  },
  {
    id: 'rel_anthropic_invested_by_a16z',
    sourceEntityId: 'entity_anthropic',
    targetEntityId: 'entity_investor_a16z',
    relationType: 'invested_by',
    strength: 90,
    evidence: 'a16z 参投 Anthropic 多轮。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-05-10T09:00:00.000Z',
  },

  // ----- uses (3) -----
  {
    id: 'rel_chatgpt_uses_claude',
    sourceEntityId: 'entity_platform_chatgpt',
    targetEntityId: 'entity_product_claude',
    relationType: 'uses',
    strength: 30,
    evidence: '竞品对标关系（非真实集成）。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-12T09:00:00.000Z',
    updatedAt: '2026-05-12T09:00:00.000Z',
  },
  {
    id: 'rel_perplexity_uses_llms_txt',
    sourceEntityId: 'entity_platform_perplexity_app',
    targetEntityId: 'entity_llms_txt',
    relationType: 'uses',
    strength: 50,
    evidence: 'Perplexity 抓取 llms.txt 作为优先摘要。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-05-20T09:00:00.000Z',
  },
  {
    id: 'rel_cvo_uses_mcp',
    sourceEntityId: 'entity_cognitive_venture_os',
    targetEntityId: 'entity_mcp',
    relationType: 'uses',
    strength: 80,
    evidence: 'CVO 计划用 MCP 把研究 agent 接到 Notion / Linear。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T10:00:00.000Z',
  },

  // ----- built_by (2) -----
  {
    id: 'rel_geo_paper_built_by_krishna',
    sourceEntityId: 'entity_content_krishna_2023',
    targetEntityId: 'entity_krishna',
    relationType: 'built_by',
    strength: 100,
    evidence: 'Krishna 是该论文一作。',
    linkedResearchCardIds: [],
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'rel_mcp_built_by_anthropic',
    sourceEntityId: 'entity_mcp',
    targetEntityId: 'entity_anthropic',
    relationType: 'built_by',
    strength: 100,
    evidence: 'MCP 由 Anthropic 开源。',
    linkedResearchCardIds: [],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-04-12T09:00:00.000Z',
  },

  // ----- mentioned_in (1) -----
  {
    id: 'rel_aarw_mentioned_in_geo_paper',
    sourceEntityId: 'entity_aarw',
    targetEntityId: 'entity_content_krishna_2023',
    relationType: 'mentioned_in',
    strength: 95,
    evidence: 'AARW 是 GEO 论文中提出的方法论。',
    linkedResearchCardIds: [],
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
  },

  // ----- supports (1) -----
  {
    id: 'rel_aarw_supports_geo_market',
    sourceEntityId: 'entity_aarw',
    targetEntityId: 'entity_market_geo_saas_2026',
    relationType: 'supports',
    strength: 70,
    evidence: 'AARW 是 GEO 工具市场落地的核心方法论之一。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-05-20T09:00:00.000Z',
  },

  // ----- belongs_to (1) -----
  {
    id: 'rel_operator_belongs_to_cvo',
    sourceEntityId: 'entity_char_operator',
    targetEntityId: 'entity_cognitive_venture_os',
    relationType: 'belongs_to',
    strength: 100,
    evidence: 'Operator 是 CVO 的 founder 角色。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
  },

  // ----- growing_in (1) -----
  {
    id: 'rel_geo_market_growing_in_ai_search',
    sourceEntityId: 'entity_market_geo_saas_2026',
    targetEntityId: 'entity_market_ai_search_global',
    relationType: 'growing_in',
    strength: 80,
    evidence: 'GEO SaaS 市场的增长嵌入在 AI Search 整体扩张中。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-05-20T09:00:00.000Z',
  },

  // ----- influences (1) -----
  {
    id: 'rel_citation_economy_influences_zero_click',
    sourceEntityId: 'entity_trend_citation_economy',
    targetEntityId: 'entity_trend_zero_click_search',
    relationType: 'influences',
    strength: 70,
    evidence: 'Citation economy 推动 zero-click search 体验普及。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-05-15T09:00:00.000Z',
  },

  // ----- alternative_to (1) -----
  {
    id: 'rel_otterly_alternative_to_profound',
    sourceEntityId: 'entity_tool_otterly',
    targetEntityId: 'entity_tool_profound',
    relationType: 'alternative_to',
    strength: 85,
    evidence: '同属 GEO 监控赛道，可互为替代。',
    linkedResearchCardIds: [],
    createdAt: '2026-05-08T09:00:00.000Z',
    updatedAt: '2026-05-08T09:00:00.000Z',
  },
];
