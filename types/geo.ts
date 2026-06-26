/**
 * GEO 域：Generative Engine Optimization。
 *
 * 核心问题：品牌在 AI 搜索 / 回答里是否被正确引用？
 * 数据流：GEOBrandEntity 定义品牌 → AIQuery 定义要监控的问题 →
 * CitationCheckResult 记录每次查询的实际引用情况。
 */

/** 品牌叙事支柱。 */
export type GEOPillar = 'core' | 'product' | 'founder' | 'category' | 'use_case';

/**
 * GEOBrandEntity — 品牌在 AI 引擎视角下的实体表示。
 *
 * canonicalName 是希望 AI 引用的"标准写法"，aliases 收集所有变体以辅助合并。
 * pillars 用于把 query 分类（同一个 brand 可能有不同维度的叙事）。
 */
export interface GEOBrandEntity {
  id: string;
  /** 品牌常用名。 */
  brandName: string;
  /** 标准写法（"Apple" 而非 "apple Inc."）。 */
  canonicalName: string;
  /** 1-2 句的官方描述，建议包含"是什么 / 为谁 / 解决什么"。 */
  description: string;
  /** 品牌覆盖的叙事支柱。 */
  pillars: GEOPillar[];
  /** 常见别名 / 拼写变体。 */
  aliases: string[];
  homepageUrl?: string;
  /** 关联的内容资产。 */
  assetIds: string[];
  /** 监控中的 AIQuery 列表。 */
  queryIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 内容资产形态。 */
export type GEOAssetFormat =
  | 'blog_post'
  | 'whitepaper'
  | 'comparison'
  | 'faq'
  | 'landing_page'
  | 'case_study'
  | 'other';

/** 资产生命周期。 */
export type GEOAssetStatus = 'draft' | 'published' | 'updated' | 'retired';

/**
 * GEOContentAsset — 一份 GEO 优化的内容资产。
 *
 * 品牌在自有 / 外站发布的"可被 AI 抓取并引用"的内容。
 * targetQueries 是预期这张资产能命中哪些 AI 问题。
 */
export interface GEOContentAsset {
  id: string;
  /** 所属 GEOBrandEntity.id。 */
  brandId: string;
  title: string;
  url: string;
  format: GEOAssetFormat;
  status: GEOAssetStatus;
  /** 目标查询（自然语言问题列表）。 */
  targetQueries: string[];
  /** 上线时间，ISO 8601。 */
  publishedAt?: string;
  /** 最近一次内容刷新时间，ISO 8601。 */
  lastRefreshedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** AI 提供方。 */
export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'perplexity'
  | 'google_aio'
  | 'bing_copilot'
  | 'other';

/** 查询意图。 */
export type QueryIntent =
  | 'informational'
  | 'commercial'
  | 'navigational'
  | 'transactional';

/** 调度频率。 */
export type QuerySchedule = 'daily' | 'weekly' | 'monthly' | 'on_demand';

/**
 * AIQuery — 一条 AI 查询样本。
 *
 * 用来检测品牌在 AI 回答中是否被引用的具体问题。
 * 周期性地发到 AIProvider，由 CitationCheckResult 记录结果。
 */
export interface AIQuery {
  id: string;
  /** 查询文本（自然语言问题）。 */
  text: string;
  provider: AIProvider;
  /** 监控哪个品牌。 */
  brandId: string;
  /** 关联到品牌的哪个支柱。 */
  pillar: GEOPillar;
  intent: QueryIntent;
  schedule: QuerySchedule;
  /** 该查询的历史检查结果。 */
  citationCheckIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 引用判定。 */
export type CitationVerdict =
  | 'cited'           // 直接引用了品牌的某个资产
  | 'mentioned'       // 提到了品牌名但未给具体资产
  | 'absent'          // 完全没提到
  | 'competitor_only';// 只提到竞品

/**
 * CitationCheckResult — 一次 AI 引用检查的结果。
 *
 * AIQuery → AI 回答 → 命中/未命中的快照记录。
 * citedAssetIds 和 citedEntityIds 都是可能引用的目标（资产是品牌自己的，
 * 实体是图谱里的，可能包括竞品）。
 */
export interface CitationCheckResult {
  id: string;
  /** 关联的 AIQuery.id。 */
  queryId: string;
  /** 关联的 GEOBrandEntity.id。 */
  brandId: string;
  /** 检查时间，ISO 8601。 */
  checkedAt: string;
  verdict: CitationVerdict;
  /** AI 回答片段（用于人工复核）。 */
  responseExcerpt?: string;
  /** 被引用的 GEOContentAsset.id 列表。 */
  citedAssetIds: string[];
  /** 回答中出现的 GraphEntity.id 列表（可能含竞品）。 */
  citedEntityIds: string[];
  /** 引用在答案中的位次（1 = 第一位）。 */
  position?: number;
  /** 人工备注。 */
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
 * BrandEntityProfile — 品牌在 GEO 引擎视角下的"实体信息"档案。
 *
 * 与 GEOBrandEntity 的关系：
 *   - GEOBrandEntity = 品牌在 AI 搜索里的"投影"（canonicalName / pillars / aliases /
 *     assetIds / queryIds），关注"AI 怎么引用我们"。
 *   - BrandEntityProfile = 品牌在真实世界里的"业务画像"（category / targetAudience /
 *     competitors / keyClaims / proofPoints / officialLinks），关注"我们是什么"。
 *
 * 两者独立但互补：未来 GEOBrandEntity 可派生于 BrandEntityProfile（自动生成
 * canonicalName、pillers 等）。当前两者都手填。
 *
 * 关联：
 *   - relatedProjectIds → MVPProject.id（service 校验存在）
 *   - relatedEntityIds  → GraphEntity.id（service 校验存在）
 * ============================================================ */

/** 品牌实体类型：区分品牌 / 产品 / IP / 服务 / 平台。 */
export type BrandEntityCategory =
  | 'brand'    // 品牌 (B2C / D2C)
  | 'product'  // 产品 (SaaS / 工具 / 应用)
  | 'ip'       // 知识产权 (角色 / 形象 / 内容)
  | 'service'  // 服务 (咨询 / agency)
  | 'platform' // 平台 (marketplace / network)
  | 'other';

export const BRAND_ENTITY_CATEGORIES: BrandEntityCategory[] = [
  'brand',
  'product',
  'ip',
  'service',
  'platform',
  'other',
];

export const BRAND_ENTITY_CATEGORY_LABEL: Record<BrandEntityCategory, string> = {
  brand: 'Brand',
  product: 'Product',
  ip: 'IP',
  service: 'Service',
  platform: 'Platform',
  other: 'Other',
};

/**
 * BrandEntityProfile — 品牌实体信息档案。
 *
 * 字段约束（service 层强制）：
 *   - name 1-200 字符
 *   - description 1-4000 字符
 *   - category ∈ BRAND_ENTITY_CATEGORIES
 *   - targetAudience 1-1000 字符
 *   - competitors 每项 1-200 字符，≤ 20 项，去空 / 去重
 *   - keyClaims 每项 1-400 字符，≤ 20 项，去空 / 去重
 *   - proofPoints 每项 1-400 字符，≤ 20 项，去空 / 去重
 *   - officialLinks 每项必须是合法 URL (http/https)，≤ 20 项
 *   - relatedProjectIds → MVPProject.id 引用一致性
 *   - relatedEntityIds  → GraphEntity.id 引用一致性
 *   - id 唯一性
 *   - createdAt / updatedAt 由调用方提供
 */
export interface BrandEntityProfile {
  id: string;
  /** 实体常用名（如 "Cognitive Venture OS" / "Perplexity"）。 */
  name: string;
  /** 业务侧描述（1-2 段，建议包含"是什么 / 为谁 / 解决什么"）。 */
  description: string;
  /** 实体类型。 */
  category: BrandEntityCategory;
  /** 目标用户 / 受众描述。1-1000 字符。 */
  targetAudience: string;
  /** 竞品列表（自由文本：竞品名 / 竞品 URL / 竞品 ID）。≤ 20。 */
  competitors: string[];
  /** 核心主张：我们对外讲的最关键的 3-5 个 claim。≤ 20。 */
  keyClaims: string[];
  /** 证据点：每个 claim 背后的数据 / 案例 / 引用。≤ 20。 */
  proofPoints: string[];
  /** 官方链接：homepage / docs / GitHub / 品牌页。≤ 20，必须是 URL。 */
  officialLinks: string[];
  /** 关联的 MVP Project id 列表。service 校验引用一致性。 */
  relatedProjectIds: string[];
  /** 关联的 Knowledge Graph Entity id 列表。service 校验引用一致性。 */
  relatedEntityIds: string[];
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
 * AIQueryBankItem — 用户在 AI 搜索里可能提出的问题（问题库）。
 *
 * 与 AIQuery 的关系：
 *   - AIQuery = 监控的"执行单元"（provider / schedule / citationCheckIds），
 *     关注"现在跑在哪个 AI 上、多久查一次、最近一次结果是什么"。
 *   - AIQueryBankItem = 监控的"问题库"（priority / status / linkedAssetIds），
 *     关注"我们关心哪些问题、哪些资产能回答它、什么优先级"。
 *
 * 两者**独立**。当前没有强制绑定。AIQuery 通过 `text` 与 AIQueryBankItem.query
 * 字符串匹配做"问题库 → 执行单元"的弱关联（未来可加 `bankItemId` 反向引用）。
 *
 * 关联：
 *   - brandEntityId  → BrandEntityProfile.id（service 校验）
 *   - linkedAssetIds → GEOContentAsset.id（service 校验）
 * ============================================================ */

/** 用户提问的意图分类。9 个枚举值。 */
export type AIQueryBankIntent =
  | 'informational'     // 是什么 / 怎么工作
  | 'comparison'        // A vs B
  | 'recommendation'    // 推荐 / 哪个好
  | 'how_to'            // 怎么做
  | 'review'            // 评测 / 体验
  | 'pricing'           // 价格 / 性价比
  | 'alternative'       // 替代品
  | 'trend'             // 趋势 / 未来
  | 'problem_solution'; // 问题 → 解决

export const AI_QUERY_BANK_INTENTS: AIQueryBankIntent[] = [
  'informational',
  'comparison',
  'recommendation',
  'how_to',
  'review',
  'pricing',
  'alternative',
  'trend',
  'problem_solution',
];

export const AI_QUERY_BANK_INTENT_LABEL: Record<AIQueryBankIntent, string> = {
  informational: 'Informational',
  comparison: 'Comparison',
  recommendation: 'Recommendation',
  how_to: 'How-to',
  review: 'Review',
  pricing: 'Pricing',
  alternative: 'Alternative',
  trend: 'Trend',
  problem_solution: 'Problem → Solution',
};

/** AI 平台。5 个枚举值，绑定到具体产品（与 AIProvider 区分）。 */
export type AIQueryBankPlatform =
  | 'chatgpt'
  | 'perplexity'
  | 'gemini'
  | 'google_ai_overview'
  | 'claude';

export const AI_QUERY_BANK_PLATFORMS: AIQueryBankPlatform[] = [
  'chatgpt',
  'perplexity',
  'gemini',
  'google_ai_overview',
  'claude',
];

export const AI_QUERY_BANK_PLATFORM_LABEL: Record<AIQueryBankPlatform, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  google_ai_overview: 'Google AI Overview',
  claude: 'Claude',
};

/** 监控优先级。4 个枚举值，参考 Codex Task Board 模式。 */
export type AIQueryBankPriority = 'urgent' | 'high' | 'medium' | 'low';

export const AI_QUERY_BANK_PRIORITIES: AIQueryBankPriority[] = [
  'urgent',
  'high',
  'medium',
  'low',
];

export const AI_QUERY_BANK_PRIORITY_LABEL: Record<AIQueryBankPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** 问题库条目的生命周期。 */
export type AIQueryBankStatus = 'active' | 'paused' | 'archived';

export const AI_QUERY_BANK_STATUSES: AIQueryBankStatus[] = [
  'active',
  'paused',
  'archived',
];

export const AI_QUERY_BANK_STATUS_LABEL: Record<AIQueryBankStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

/**
 * AIQueryBankItem — 一条监控问题。
 *
 * 字段约束（service 层强制）：
 *   - brandEntityId 必须指向存在的 BrandEntityProfile
 *   - query 1-500 字符（自然语言问题）
 *   - intent ∈ AI_QUERY_BANK_INTENTS
 *   - platform ∈ AI_QUERY_BANK_PLATFORMS
 *   - priority ∈ AI_QUERY_BANK_PRIORITIES
 *   - status ∈ AI_QUERY_BANK_STATUSES
 *   - linkedAssetIds 每项必须指向存在的 GEOContentAsset
 *   - id 唯一性
 *   - createdAt / updatedAt 由调用方提供
 */
export interface AIQueryBankItem {
  id: string;
  /** 关联的 BrandEntityProfile.id。service 校验。 */
  brandEntityId: string;
  /** 自然语言问题（"best GEO tool for SMB 2026"）。1-500 字符。 */
  query: string;
  intent: AIQueryBankIntent;
  platform: AIQueryBankPlatform;
  priority: AIQueryBankPriority;
  status: AIQueryBankStatus;
  /** 关联的 GEOContentAsset.id 列表（哪些资产能回答这个问题）。service 校验。 */
  linkedAssetIds: string[];
  createdAt: string;
  updatedAt: string;
}


/* ============================================================
 * ContentAsset — GEO Content Asset Library 的"内容资产条目"。
 *
 * 与 GEOContentAsset（v0.1）的区别：
 *   - v0.1 GEOContentAsset：挂在 GEOBrandEntity（旧投影层）下，
 *     targetQueries 是自由文本问题。已被 AIQueryBankItem.linkedAssetIds 引用。
 *   - v2 ContentAsset：挂在 BrandEntityProfile（业务画像层）下，
 *     targetQueryIds 是 AIQueryBankItem.id 列表（强引用），便于反向回查
 *     "这个 bank 问题被哪些内容资产回答"。
 *   - 两者并行存在、不互相替换。新增 v2 时不应破坏 v0.1 引用。
 *
 * 用途：
 *   - 内容资产登记（哪个品牌、什么类型、什么 URL）。
 *   - 与 AIQueryBankItem 反向关联（"回答 X 问题的资产有哪些"）。
 *   - 评分（geoScore 0-100，人工 / 未来 AI 打分）。
 *   - 导出内容资产报告 Markdown。
 *
 * 关联：
 *   - brandEntityId  → BrandEntityProfile.id（service 校验）
 *   - targetQueryIds → AIQueryBankItem.id（service 校验）
 *
 * 预留接口（不在本文件）：
 *   - ContentAssetConnector（service 暴露）→ 未来接 blog / website / Notion / CMS 抓取。
 * ============================================================ */

/** 内容资产形态。9 个枚举值。 */
export type ContentAssetType =
  | 'landing_page'
  | 'blog_post'
  | 'research_report'
  | 'case_study'
  | 'faq'
  | 'comparison_page'
  | 'documentation'
  | 'video_script'
  | 'social_post';

export const CONTENT_ASSET_TYPES: ContentAssetType[] = [
  'landing_page',
  'blog_post',
  'research_report',
  'case_study',
  'faq',
  'comparison_page',
  'documentation',
  'video_script',
  'social_post',
];

export const CONTENT_ASSET_TYPE_LABEL: Record<ContentAssetType, string> = {
  landing_page: 'Landing page',
  blog_post: 'Blog post',
  research_report: 'Research report',
  case_study: 'Case study',
  faq: 'FAQ',
  comparison_page: 'Comparison page',
  documentation: 'Documentation',
  video_script: 'Video script',
  social_post: 'Social post',
};

/**
 * 一条可引用证据。
 *
 * claim 是核心陈述（AI 引擎最可能引用的部分），source 是证据出处
 * （URL / 报告名 / 案例名），quote 是可选的直接引文。
 * 当前 form 只收集 claim，source / quote 字段保留供后续阶段录入。
 */
export interface ContentAssetStructuredEvidence {
  /** 核心陈述 / claim。1-400 字符。 */
  claim: string;
  /** 证据出处（URL / 报告名 / 案例名）。可选。 */
  source?: string;
  /** 直接引文（"原文如此"）。可选。 */
  quote?: string;
}

/**
 * ContentAsset — 一份内容资产。
 *
 * 字段约束（service 层强制）：
 *   - title 1-200 字符
 *   - url 必须是合法 http(s) URL
 *   - type ∈ CONTENT_ASSET_TYPES
 *   - summary 1-1000 字符
 *   - brandEntityId 必须指向存在的 BrandEntityProfile
 *   - targetQueryIds 每项必须指向存在的 AIQueryBankItem，≤ 50
 *   - structuredEvidence 每项 claim 1-400 字符，≤ 20
 *   - lastUpdated 必须是合法 ISO 8601 时间
 *   - geoScore ∈ [0, 100] 整数
 *   - id 唯一性
 *   - createdAt / updatedAt 由调用方提供
 */
export interface ContentAsset {
  id: string;
  /** 关联的 BrandEntityProfile.id。service 校验。 */
  brandEntityId: string;
  title: string;
  url: string;
  type: ContentAssetType;
  summary: string;
  /** 关联的 AIQueryBankItem.id 列表（这条资产能回答哪些 bank 问题）。service 校验。 */
  targetQueryIds: string[];
  structuredEvidence: ContentAssetStructuredEvidence[];
  /** 内容本身最近一次刷新时间，ISO 8601。与 updatedAt（实体记录时间）独立。 */
  lastUpdated: string;
  /** GEO 健康分 0-100（人工或未来 AI 打分）。 */
  geoScore: number;
  createdAt: string;
  updatedAt: string;
}


/* ============================================================
 * GEO Content Optimizer — 给 ContentAsset 做内容审计和改稿建议。
 *
 * 与 GEO Optimizer v0.1（`GEOProvider.generateSuggestions` / `analyzeCheck` /
 * `suggestQueries`）的关系：v0.1 关注"品牌在 AI 答案里被怎么引用、是否被
 * 引用"，输入是 `GEOBrandEntity` + `CitationCheckResult`；v2 Optimizer 关注
 * "单条内容资产本身在 GEO 维度上怎么改"，输入是 `ContentAsset` + 关联
 * `BrandEntityProfile` + `AIQueryBankItem` + `GraphEntity`。两者**互补**，
 * 都在 GEOProvider interface 里。
 *
 * 关联：
 *   - assetId → ContentAsset.id（service 校验）
 *   - inputType → 6 个值（用户在 form 里选）
 *   - score.geoScore → 用 GEO_AUDIT_WEIGHTS 加权（service 算）
 *
 * 预留接口（不在本文件）：
 *   - GEOAuditScoringModel（service 暴露）→ 未来切换评分模型时只换实现。
 * ============================================================ */

/** Optimizer 输入类型（用户在 form 里选）。6 个枚举值。 */
export type OptimizerInputType =
  | 'article'             // 文章
  | 'product_intro'       // 产品介绍
  | 'landing_page'        // Landing Page
  | 'research_report'     // 研究报告
  | 'faq'                 // FAQ
  | 'short_video_script'; // 短视频文案

export const OPTIMIZER_INPUT_TYPES: OptimizerInputType[] = [
  'article',
  'product_intro',
  'landing_page',
  'research_report',
  'faq',
  'short_video_script',
];

export const OPTIMIZER_INPUT_TYPE_LABEL: Record<OptimizerInputType, string> = {
  article: 'Article',
  product_intro: 'Product intro',
  landing_page: 'Landing page',
  research_report: 'Research report',
  faq: 'FAQ',
  short_video_script: 'Short video script',
};

/** GEO 审计 7 维评分。 */
export type GEOAuditDimension =
  | 'clarity'              // 表达清晰度
  | 'entity_consistency'   // 实体一致性（品牌 / 产品 / 人物 / 概念在文中口径统一）
  | 'evidence_density'     // 证据密度（数据 / 引文 / 案例数量）
  | 'citation_worthiness'  // 可被 AI 引擎引用的程度
  | 'freshness'            // 新鲜度（是否有时效性更新）
  | 'topical_authority'    // 主题权威性（深度 / 完整度）
  | 'query_alignment';     // 与目标 AI 查询的对齐度

export const GEO_AUDIT_DIMENSIONS: GEOAuditDimension[] = [
  'clarity',
  'entity_consistency',
  'evidence_density',
  'citation_worthiness',
  'freshness',
  'topical_authority',
  'query_alignment',
];

export const GEO_AUDIT_DIMENSION_LABEL: Record<GEOAuditDimension, string> = {
  clarity: 'Clarity',
  entity_consistency: 'Entity consistency',
  evidence_density: 'Evidence density',
  citation_worthiness: 'Citation worthiness',
  freshness: 'Freshness',
  topical_authority: 'Topical authority',
  query_alignment: 'Query alignment',
};

/** 7 维评分权重（service 用此算总 GEO Score）。 */
export const GEO_AUDIT_WEIGHTS: Record<GEOAuditDimension, number> = {
  clarity: 0.1,
  entity_consistency: 0.1,
  evidence_density: 0.15,
  citation_worthiness: 0.2,
  freshness: 0.1,
  topical_authority: 0.15,
  query_alignment: 0.2,
};

/** 7 维评分 + 总分。 */
export interface GEOAuditScore {
  clarity: number;
  entityConsistency: number;
  evidenceDensity: number;
  citationWorthiness: number;
  freshness: number;
  topicalAuthority: number;
  queryAlignment: number;
  /** 0-100 浮点（1 位小数）。service 用 GEO_AUDIT_WEIGHTS 重算覆盖。 */
  geoScore: number;
}

/** 一条结构化内容建议（FAQ / 对比 / 证据等）。 */
export interface GEOAuditSuggestion {
  /** 建议内容（1-500 字符）。 */
  text: string;
  /** 关联的 AI Query Bank item id（可选；存在则建立强引用）。 */
  relatedBankItemId?: string;
}

/** 对比表一行。 */
export interface GEOAuditComparisonRow {
  /** 对比维度。 */
  dimension: string;
  /** 这条资产所在方。 */
  thisSide: string;
  /** 替代方（"alternative" / 自由文本）。 */
  otherSide: string;
  /** 来源 / 证据（自由文本）。 */
  source?: string;
}

/** FAQ 草稿。 */
export interface GEOAuditFAQItem {
  question: string;
  /** 建议答案（1-500 字符）。 */
  answer: string;
  /** 关联的 AI Query Bank item id（可选）。 */
  relatedBankItemId?: string;
}

/** 优化版大纲的某一节。 */
export interface GEOAuditOutlineSection {
  /** 段落标题。 */
  heading: string;
  /** 段落目的（为什么要写这一段）。 */
  purpose: string;
  /** 该段落要回答的 AI 查询（自然语言 / bank id 列表）。 */
  targetQueries: string[];
  /** 实施备注（语气 / 字数 / 引用 / Schema 等）。 */
  notes: string;
}

/** 9 项优化建议的容器。 */
export interface GEOAuditSuggestions {
  /** 1. 目标 AI 查询问题（5-10 条自然语言问题）。 */
  targetQueries: string[];
  /** 2. 核心实体（3-6 个：品牌 / 产品 / 技术 / 概念 / 人物）。 */
  coreEntities: string[];
  /** 3. 可引用定义（3-6 条：可被 AI 答案直接引用的"是什么"句）。 */
  definableTerms: string[];
  /** 4. 数据证据清单（3-8 条：应补充的统计 / 引文 / 案例）。 */
  evidenceChecklist: string[];
  /** 5. 对比表建议（2-6 行：行 = 对比维度，列 = this vs other）。 */
  comparisonTable: GEOAuditComparisonRow[];
  /** 6. FAQ 建议（3-8 条 Q&A）。 */
  faqSuggestions: GEOAuditFAQItem[];
  /** 7. 结构化内容建议（3-8 条：definition box / stat table / how-to steps / ...）。 */
  structuredSuggestions: string[];
  /** 9. 优化版内容大纲（3-8 节）。 */
  optimizedOutline: GEOAuditOutlineSection[];
}

/**
 * GEOAudit — 一次 ContentAsset 的 GEO 审计记录（append-only）。
 *
 * 字段约束（service 层强制）：
 *   - assetId 必须指向存在的 ContentAsset
 *   - inputType ∈ OPTIMIZER_INPUT_TYPES
 *   - score 7 维必须 ∈ [0, 100] 整数
 *   - score.geoScore 由 service 用 GEO_AUDIT_WEIGHTS 重算（0-100 浮点）
 *   - id 唯一性
 *   - createdAt / updatedAt 由调用方提供
 */
export interface GEOAudit {
  id: string;
  /** 关联的 ContentAsset.id。service 校验。 */
  assetId: string;
  /** Optimizer 输入类型（用户在 form 里选）。 */
  inputType: OptimizerInputType;
  /** 7 维评分 + 总分。 */
  score: GEOAuditScore;
  /** 9 项优化建议。 */
  suggestions: GEOAuditSuggestions;
  /** 评分解释（provider 生成的 1-1000 字符自然语言解释）。 */
  explanation: string;
  /** Scoring model 版本（预留，默认 'mock-v1'）。 */
  scoringModelVersion: string;
  createdAt: string;
  updatedAt: string;
}


/* ============================================================
 * AI Citation Monitor — 在 AI 搜索答案里追踪品牌被提及 / 引用的快照。
 *
 * 与 v0.1 `CitationCheckResult` 的关系：
 *   - v0.1 CitationCheckResult：判 verdict（cited / mentioned / absent / competitor_only）+
 *     引用 `GEOContentAsset.id` 和 `GraphEntity.id` —— 关注"AI 答案的结构化命中"。
 *     关联 `AIQuery`（v0.1，含 provider / pillar / schedule）。
 *   - v2 AICitationCheck：单次"原样"跑一次 query → 记录 answer 摘要 + 是否提到
 *     目标品牌 + 是否引用目标 URL + 竞品出现情况 + 一个原始 geoScore。关注
 *     "AI 答案本身长什么样"，便于做趋势图 + 周报。
 *   - 两者**互补**。同一 query 可以同时挂 v0.1 check 和 v2 check（甚至同日），
 *     各自服务不同 UI（v0.1 → GEO 引用面板；v2 → 趋势图 + 周报）。
 *
 * 关联：
 *   - queryId → AIQueryBankItem.id（v2；query 文本 + 品牌 + 优先级已就位）
 *   - platform → 5 个 AI 平台（与 AIQueryBankPlatform 同值，独立枚举）
 * ============================================================ */

/** 5 个 AI 平台。与 `AIQueryBankPlatform` 数值一致，语义独立。 */
export type CitationPlatform =
  | 'chatgpt'
  | 'perplexity'
  | 'gemini'
  | 'google_ai_overview'
  | 'claude';

export const CITATION_PLATFORMS: CitationPlatform[] = [
  'chatgpt',
  'perplexity',
  'gemini',
  'google_ai_overview',
  'claude',
];

export const CITATION_PLATFORM_LABEL: Record<CitationPlatform, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  google_ai_overview: 'Google AI Overview',
  claude: 'Claude',
};

/**
 * AICitationCheck — 一次"在 AI 平台上跑一次 query"的快照结果。
 *
 * 字段约束（service 层强制）：
 *   - queryId 必须指向存在的 AIQueryBankItem（service 校验）
 *   - platform ∈ CITATION_PLATFORMS
 *   - checkedAt 必须是合法 ISO 8601 时间
 *   - mentioned：boolean
 *   - citedUrl：可选 URL（http/https），≤ 500 字符
 *   - competitorMentions：每项 1-100 字符，≤ 20 项
 *   - answerSummary：1-2000 字符（截取自 AI 答案原文）
 *   - geoScore ∈ [0, 100] 整数
 *   - id 唯一性，格式 `cite_<timestamp36>-<rand8>`
 *   - createdAt / updatedAt 由调用方提供
 *
 * geoScore 含义（mock）：
 *   - 100  = 目标品牌被引用为目标 URL（"first-party citation"）
 *   - 60-99 = 目标品牌被提及但未给 URL / 或非首位
 *   - 30-59 = 仅有竞品被提到 / 目标品牌缺位
 *   - 0-29  = 完全缺位
 */
export interface AICitationCheck {
  id: string;
  /** 关联的 AIQueryBankItem.id。service 校验。 */
  queryId: string;
  /** 实际跑的平台（与 bank item 自身的 platform 不一定一致 —— 一个 query 可多平台跑）。 */
  platform: CitationPlatform;
  /** 检查时间，ISO 8601。 */
  checkedAt: string;
  /** 目标品牌是否在答案中被提及。 */
  mentioned: boolean;
  /** 答案里被引用的 URL（可能是 brand 自有 URL，也可能是第三方）。 */
  citedUrl?: string;
  /** 答案里出现的竞品名列表（自由文本，按出现顺序）。≤ 20。 */
  competitorMentions: string[];
  /** AI 答案的摘要（1-2000 字符）。 */
  answerSummary: string;
  /** 该次 check 的 GEO 健康分 0-100 整数（mock / 未来真实 AI 评分）。 */
  geoScore: number;
  createdAt: string;
  updatedAt: string;
}
