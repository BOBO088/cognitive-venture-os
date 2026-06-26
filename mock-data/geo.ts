/**
 * GEO 域 mock 数据。
 *
 * 5 个品牌（自己 + 4 竞品），7 份内容资产，8 条 AI 查询，11 次引用检查结果。
 * 故事：CVO 监控自己 + 4 个竞品在 AI 答案里的引用情况。
 */

import type {
  GEOBrandEntity,
  GEOContentAsset,
  AIQuery,
  CitationCheckResult,
  BrandEntityProfile,
  AIQueryBankItem,
  ContentAsset,
  GEOAudit,
  AICitationCheck,
} from '@/types';

/* ---------- GEOBrandEntity ---------- */

export const mockGEOBrands: GEOBrandEntity[] = [
  {
    id: 'brand_cvo',
    brandName: 'Cognitive Venture OS',
    canonicalName: 'Cognitive Venture OS',
    description: 'AI-native 创业操作系统，集成 GEO 监控 + 机会管理 + MVP 跟踪。',
    pillars: ['core', 'product', 'category', 'use_case'],
    aliases: ['CVO', 'cvo.ai', 'Cognitive Venture'],
    homepageUrl: 'https://example.com/cvo',
    assetIds: ['asset_cvo_geo_guide', 'asset_cvo_comparison', 'asset_cvo_faq'],
    queryIds: ['query_best_geo_tool', 'query_geo_def', 'query_citation_checker', 'query_brand_monitor_ai'],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  {
    id: 'brand_otterly',
    brandName: 'Otterly',
    canonicalName: 'Otterly.ai',
    description: 'AI 搜索品牌可见度监控平台，2024 年成立。',
    pillars: ['product', 'category', 'use_case'],
    aliases: ['Otterly.ai', 'otterly'],
    homepageUrl: 'https://example.com/otterly',
    assetIds: ['asset_otterly_landing'],
    queryIds: ['query_otterly_review', 'query_best_geo_tool', 'query_brand_monitor_ai'],
    createdAt: '2026-04-15T09:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'brand_profound',
    brandName: 'Profound',
    canonicalName: 'Profound',
    description: '面向 Fortune 500 的 AI 答案分析平台，强调数据深度。',
    pillars: ['product', 'category', 'use_case'],
    aliases: ['Profound AI', 'tryprofound.com'],
    homepageUrl: 'https://example.com/profound',
    assetIds: ['asset_profound_whitepaper'],
    queryIds: ['query_profound_review', 'query_best_geo_tool', 'query_brand_monitor_ai'],
    createdAt: '2026-04-15T09:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'brand_perplexity',
    brandName: 'Perplexity',
    canonicalName: 'Perplexity AI',
    description: 'AI 答案引擎，结合实时检索与 LLM。',
    pillars: ['core', 'product', 'category'],
    aliases: ['perplexity.ai', 'Perplexity'],
    homepageUrl: 'https://example.com/perplexity',
    assetIds: ['asset_perp_blog'],
    queryIds: ['query_perp_vs_chatgpt', 'query_geo_def'],
    createdAt: '2026-04-12T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'brand_ai_seo',
    brandName: 'AI SEO',
    canonicalName: 'AI SEO',
    description: '面向 SMB 的 AI 搜索 SEO 工具，主打易用性。',
    pillars: ['product', 'category'],
    aliases: ['aiseo.com', 'AI SEO Tools'],
    homepageUrl: 'https://example.com/aisoe',
    assetIds: ['asset_ai_seo_blog'],
    queryIds: ['query_geo_vs_seo', 'query_best_geo_tool'],
    createdAt: '2026-04-15T09:00:00.000Z',
    updatedAt: '2026-06-18T10:00:00.000Z',
  },
];

/* ---------- GEOContentAsset ---------- */

export const mockGEOContentAssets: GEOContentAsset[] = [
  {
    id: 'asset_cvo_geo_guide',
    brandId: 'brand_cvo',
    title: 'The 2026 GEO Playbook',
    url: 'https://example.com/cvo/geo-playbook',
    format: 'whitepaper',
    status: 'published',
    targetQueries: ['what is GEO', 'GEO strategy 2026', 'AARW principles'],
    publishedAt: '2026-05-20T10:00:00.000Z',
    lastRefreshedAt: '2026-06-20T10:00:00.000Z',
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'asset_cvo_comparison',
    brandId: 'brand_cvo',
    title: 'GEO Pulse vs Otterly vs Profound',
    url: 'https://example.com/cvo/compare',
    format: 'comparison',
    status: 'published',
    targetQueries: ['best GEO tool', 'GEO Pulse review', 'Otterly alternative'],
    publishedAt: '2026-06-01T10:00:00.000Z',
    lastRefreshedAt: '2026-06-25T10:00:00.000Z',
    createdAt: '2026-05-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  {
    id: 'asset_cvo_faq',
    brandId: 'brand_cvo',
    title: 'GEO Frequently Asked Questions',
    url: 'https://example.com/cvo/faq',
    format: 'faq',
    status: 'published',
    targetQueries: ['GEO definition', 'GEO vs SEO', 'how to do GEO'],
    publishedAt: '2026-05-10T10:00:00.000Z',
    lastRefreshedAt: '2026-06-15T10:00:00.000Z',
    createdAt: '2026-05-05T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'asset_perp_blog',
    brandId: 'brand_perplexity',
    title: 'How Perplexity Chooses Sources',
    url: 'https://example.com/perplexity/sources',
    format: 'blog_post',
    status: 'published',
    targetQueries: ['how does perplexity work', 'perplexity sources'],
    publishedAt: '2026-05-15T10:00:00.000Z',
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-15T10:00:00.000Z',
  },
  {
    id: 'asset_otterly_landing',
    brandId: 'brand_otterly',
    title: 'Track Your Brand in AI Search',
    url: 'https://example.com/otterly',
    format: 'landing_page',
    status: 'published',
    targetQueries: ['brand monitoring AI', 'Otterly'],
    publishedAt: '2026-04-20T10:00:00.000Z',
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
  },
  {
    id: 'asset_profound_whitepaper',
    brandId: 'brand_profound',
    title: 'Enterprise GEO: 2026 Benchmark',
    url: 'https://example.com/profound/benchmark',
    format: 'whitepaper',
    status: 'published',
    targetQueries: ['enterprise GEO', 'AI search benchmark'],
    publishedAt: '2026-06-01T10:00:00.000Z',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'asset_ai_seo_blog',
    brandId: 'brand_ai_seo',
    title: 'GEO for SMB: A Practical Guide',
    url: 'https://example.com/aisoe/blog',
    format: 'blog_post',
    status: 'published',
    targetQueries: ['GEO for small business', 'cheap GEO tools'],
    publishedAt: '2026-05-05T10:00:00.000Z',
    createdAt: '2026-05-05T10:00:00.000Z',
    updatedAt: '2026-05-05T10:00:00.000Z',
  },
];

/* ---------- AIQuery ---------- */

export const mockAIQueries: AIQuery[] = [
  {
    id: 'query_best_geo_tool',
    text: 'what is the best GEO tool for B2B brands in 2026?',
    provider: 'openai',
    brandId: 'brand_cvo',
    pillar: 'category',
    intent: 'commercial',
    schedule: 'weekly',
    citationCheckIds: ['check_q1_2026_06_20', 'check_q1_2026_06_25'],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  {
    id: 'query_geo_def',
    text: 'what is generative engine optimization?',
    provider: 'openai',
    brandId: 'brand_cvo',
    pillar: 'core',
    intent: 'informational',
    schedule: 'monthly',
    citationCheckIds: ['check_q2_2026_06_22'],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-06-22T10:00:00.000Z',
  },
  {
    id: 'query_citation_checker',
    text: 'how can I check if my brand is cited by ChatGPT?',
    provider: 'anthropic',
    brandId: 'brand_cvo',
    pillar: 'use_case',
    intent: 'commercial',
    schedule: 'weekly',
    citationCheckIds: ['check_q3_2026_06_25'],
    createdAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  {
    id: 'query_perp_vs_chatgpt',
    text: 'perplexity vs chatgpt search, which is better?',
    provider: 'openai',
    brandId: 'brand_perplexity',
    pillar: 'product',
    intent: 'commercial',
    schedule: 'monthly',
    citationCheckIds: ['check_q4_2026_06_18', 'check_q4_2026_06_25'],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  {
    id: 'query_brand_monitor_ai',
    text: 'how do I monitor my brand in AI search results?',
    provider: 'perplexity',
    brandId: 'brand_cvo',
    pillar: 'use_case',
    intent: 'informational',
    schedule: 'weekly',
    citationCheckIds: ['check_q5_2026_06_24'],
    createdAt: '2026-05-15T09:00:00.000Z',
    updatedAt: '2026-06-24T10:00:00.000Z',
  },
  {
    id: 'query_geo_vs_seo',
    text: 'GEO vs SEO, what is the difference?',
    provider: 'openai',
    brandId: 'brand_ai_seo',
    pillar: 'category',
    intent: 'informational',
    schedule: 'monthly',
    citationCheckIds: ['check_q6_2026_06_23'],
    createdAt: '2026-05-05T09:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
  },
  {
    id: 'query_otterly_review',
    text: 'is Otterly.ai worth it for B2B brands?',
    provider: 'openai',
    brandId: 'brand_otterly',
    pillar: 'product',
    intent: 'commercial',
    schedule: 'weekly',
    citationCheckIds: ['check_q7_2026_06_22'],
    createdAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-06-22T10:00:00.000Z',
  },
  {
    id: 'query_profound_review',
    text: 'Profound vs Otterly, which is better for enterprise?',
    provider: 'anthropic',
    brandId: 'brand_profound',
    pillar: 'product',
    intent: 'commercial',
    schedule: 'weekly',
    citationCheckIds: ['check_q8_2026_06_19', 'check_q8_2026_06_26'],
    createdAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-06-26T10:00:00.000Z',
  },
];

/* ---------- CitationCheckResult ---------- */

export const mockCitationCheckResults: CitationCheckResult[] = [
  {
    id: 'check_q1_2026_06_20',
    queryId: 'query_best_geo_tool',
    brandId: 'brand_cvo',
    checkedAt: '2026-06-20T10:00:00.000Z',
    verdict: 'mentioned',
    responseExcerpt: 'Several tools are emerging: Profound for enterprise, Otterly for SMB...',
    citedAssetIds: [],
    citedEntityIds: ['entity_cognitive_venture_os'],
    position: 4,
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'check_q1_2026_06_25',
    queryId: 'query_best_geo_tool',
    brandId: 'brand_cvo',
    checkedAt: '2026-06-25T10:00:00.000Z',
    verdict: 'cited',
    responseExcerpt: 'Tools like Cognitive Venture OS, Profound, and Otterly lead the GEO space...',
    citedAssetIds: ['asset_cvo_comparison', 'asset_cvo_geo_guide'],
    citedEntityIds: ['entity_cognitive_venture_os', 'entity_perplexity'],
    position: 2,
    notes: '最近一次对比页发布后位次从 4 → 2。',
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  {
    id: 'check_q2_2026_06_22',
    queryId: 'query_geo_def',
    brandId: 'brand_cvo',
    checkedAt: '2026-06-22T10:00:00.000Z',
    verdict: 'cited',
    responseExcerpt: 'GEO (Generative Engine Optimization), per the 2023 Princeton paper, focuses on...',
    citedAssetIds: ['asset_cvo_geo_guide'],
    citedEntityIds: ['entity_geo'],
    position: 3,
    createdAt: '2026-06-22T10:00:00.000Z',
    updatedAt: '2026-06-22T10:00:00.000Z',
  },
  {
    id: 'check_q3_2026_06_25',
    queryId: 'query_citation_checker',
    brandId: 'brand_cvo',
    checkedAt: '2026-06-25T10:00:00.000Z',
    verdict: 'cited',
    responseExcerpt: 'Tools like Cognitive Venture OS offer automated citation monitoring...',
    citedAssetIds: ['asset_cvo_geo_guide'],
    citedEntityIds: ['entity_cognitive_venture_os'],
    position: 1,
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  {
    id: 'check_q4_2026_06_18',
    queryId: 'query_perp_vs_chatgpt',
    brandId: 'brand_perplexity',
    checkedAt: '2026-06-18T10:00:00.000Z',
    verdict: 'cited',
    responseExcerpt: 'Perplexity leads in source transparency, while ChatGPT Search wins on reasoning...',
    citedAssetIds: ['asset_perp_blog'],
    citedEntityIds: ['entity_perplexity', 'entity_openai'],
    position: 1,
    createdAt: '2026-06-18T10:00:00.000Z',
    updatedAt: '2026-06-18T10:00:00.000Z',
  },
  {
    id: 'check_q4_2026_06_25',
    queryId: 'query_perp_vs_chatgpt',
    brandId: 'brand_perplexity',
    checkedAt: '2026-06-25T10:00:00.000Z',
    verdict: 'mentioned',
    responseExcerpt: 'Perplexity and ChatGPT Search both offer real-time answers...',
    citedAssetIds: [],
    citedEntityIds: ['entity_perplexity'],
    position: 3,
    notes: '位次从 1 → 3，SearchGPT 公测后下滑。',
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  {
    id: 'check_q5_2026_06_24',
    queryId: 'query_brand_monitor_ai',
    brandId: 'brand_cvo',
    checkedAt: '2026-06-24T10:00:00.000Z',
    verdict: 'cited',
    responseExcerpt: 'Cognitive Venture OS, Otterly, and Profound all provide AI brand monitoring...',
    citedAssetIds: ['asset_cvo_faq', 'asset_cvo_geo_guide'],
    citedEntityIds: ['entity_cognitive_venture_os'],
    position: 2,
    createdAt: '2026-06-24T10:00:00.000Z',
    updatedAt: '2026-06-24T10:00:00.000Z',
  },
  {
    id: 'check_q6_2026_06_23',
    queryId: 'query_geo_vs_seo',
    brandId: 'brand_ai_seo',
    checkedAt: '2026-06-23T10:00:00.000Z',
    verdict: 'mentioned',
    responseExcerpt: 'GEO and SEO differ in target output: traditional rankings vs AI citations...',
    citedAssetIds: [],
    citedEntityIds: ['entity_geo'],
    position: 5,
    createdAt: '2026-06-23T10:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
  },
  {
    id: 'check_q7_2026_06_22',
    queryId: 'query_otterly_review',
    brandId: 'brand_otterly',
    checkedAt: '2026-06-22T10:00:00.000Z',
    verdict: 'cited',
    responseExcerpt: 'Otterly.ai is well-suited for SMBs needing quick brand visibility checks...',
    citedAssetIds: ['asset_otterly_landing'],
    citedEntityIds: ['entity_perplexity'],
    position: 1,
    createdAt: '2026-06-22T10:00:00.000Z',
    updatedAt: '2026-06-22T10:00:00.000Z',
  },
  {
    id: 'check_q8_2026_06_19',
    queryId: 'query_profound_review',
    brandId: 'brand_profound',
    checkedAt: '2026-06-19T10:00:00.000Z',
    verdict: 'cited',
    responseExcerpt: 'Profound leads in enterprise GEO with deeper data and reporting...',
    citedAssetIds: ['asset_profound_whitepaper'],
    citedEntityIds: ['entity_perplexity'],
    position: 1,
    createdAt: '2026-06-19T10:00:00.000Z',
    updatedAt: '2026-06-19T10:00:00.000Z',
  },
  {
    id: 'check_q8_2026_06_26',
    queryId: 'query_profound_review',
    brandId: 'brand_profound',
    checkedAt: '2026-06-26T10:00:00.000Z',
    verdict: 'absent',
    responseExcerpt: 'Otterly and Cognitive Venture OS are the main enterprise options today...',
    citedAssetIds: [],
    citedEntityIds: ['entity_cognitive_venture_os'],
    position: 0,
    notes: 'Profound 完全掉出回答，疑似索引过期。',
    createdAt: '2026-06-26T10:00:00.000Z',
    updatedAt: '2026-06-26T10:00:00.000Z',
  },
];


/* ============================================================
 * BrandEntityProfile — 6 个 profile，覆盖 brand / product / ip / service / platform / other。
 *
 * 故事：
 *   - 自己的产品（CVO / GEO Pulse）作为 product + 关联 MVP Projects + Graph Entities。
 *   - 竞品（Profound / Otterly）作为 brand，竞品列表中互相出现。
 *   - 一个 IP（Krishna 角色）和一个 service（顾问公司）。
 *   - 一个 platform（marketplace）作为对比项。
 * ============================================================ */

export const mockBrandEntityProfiles: BrandEntityProfile[] = [
  // 1. CVO 自己的产品 profile
  {
    id: 'profile_cvo',
    name: 'Cognitive Venture OS',
    description:
      'AI-native 创业操作系统：把 GEO 监控、机会雷达、MVP pipeline、launch 复盘整合成一个可追踪的工作流。面向 AI-native founder 和 GEO 顾问。',
    category: 'product',
    targetAudience:
      'AI-native 创业者（个人 / 3 人小团队），单点收入 $1k-$50k MRR 阶段，需要把"AI 帮我做"和"AI 帮我管"统一进一个工作流。',
    competitors: ['Profound', 'Otterly', 'Scrunch', 'Peec.ai'],
    keyClaims: [
      'AI-native OS 而非单一 GEO 工具',
      '本地 mock 即可跑通完整 venture loop',
      '每次 Codex 开发变成可追踪资产',
    ],
    proofPoints: [
      '7 大业务模块（Research / Graph / Opportunity / MVP / GEO / Learning / Iteration）已上线',
      'mock 数据层 + 4 个 provider 接口 + 9 个 LLM method 已就绪',
      '132 个 unit test 覆盖 service / repo 层',
    ],
    officialLinks: [
      'https://example.com/cvo',
      'https://example.com/cvo/docs',
      'https://github.com/example/cvo',
    ],
    relatedProjectIds: ['mvp_geo_pulse', 'mvp_geo_pulse_paid', 'mvp_citeboost'],
    relatedEntityIds: [
      'entity_cognitive_venture_os',
      'entity_market_geo_saas_2026',
      'entity_trend_citation_economy',
    ],
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },

  // 2. 竞品 A：Profound
  {
    id: 'profile_profound',
    name: 'Profound',
    description:
      '企业级 GEO 分析平台，专注 Fortune 500 客户的 AI 搜索可见度监控。',
    category: 'brand',
    targetAudience:
      'Fortune 500 市场团队（CMO / SEO lead），年预算 $50k+ 的 enterprise buyer。',
    competitors: ['Otterly', 'Scrunch', 'Cognitive Venture OS'],
    keyClaims: [
      'Enterprise-grade 监控精度',
      'Perplexity / ChatGPT / Claude 全部覆盖',
      '与 Adobe / Salesforce 集成',
    ],
    proofPoints: [
      'Series A $20M (2025)',
      '客户：Stripe / Ramp / Notion',
      'G2 Enterprise leader 2025 Q4',
    ],
    officialLinks: ['https://profound.com', 'https://profound.com/blog'],
    relatedProjectIds: [],
    relatedEntityIds: ['entity_perplexity', 'entity_openai'],
    createdAt: '2026-05-12T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },

  // 3. 竞品 B：Otterly
  {
    id: 'profile_otterly',
    name: 'Otterly',
    description:
      '轻量级 GEO 监控工具，专注中小企业的 AI 搜索可见度追踪。',
    category: 'product',
    targetAudience:
      'SMB 营销团队（1-10 人），月预算 $200-$2000，需要轻量工具。',
    competitors: ['Profound', 'Cognitive Venture OS'],
    keyClaims: ['15 分钟上手', '按 query 付费', '可视化 dashboard'],
    proofPoints: ['Product Hunt #1 (2025 Q3)', '1500+ SMB 客户'],
    officialLinks: ['https://otterly.ai'],
    relatedProjectIds: [],
    relatedEntityIds: ['entity_market_geo_saas_2026'],
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-06-22T10:00:00.000Z',
  },

  // 4. IP：Krishna 角色
  {
    id: 'profile_krishna_ip',
    name: 'Krishna · Founder Avatar',
    description:
      '面向 AI-native 创业者的虚拟 founder 形象 / 知识 IP，覆盖 GEO / founder-led growth / 创业心理学。',
    category: 'ip',
    targetAudience:
      'AI-native 创业者、独立 founder、关注"founder-led growth"的内容消费者。',
    competitors: ['Lenny\'s Podcast', 'Sam Parr', 'My First Million'],
    keyClaims: [
      'AI-native founder 的真实工作流',
      'GEO + venture building 跨领域视角',
      '中英双语内容',
    ],
    proofPoints: [
      'Substack 5k 订阅',
      'Twitter / X 8k followers',
      'YouTube 100+ 集',
    ],
    officialLinks: [
      'https://example.com/krishna',
      'https://example.com/krishna/newsletter',
    ],
    relatedProjectIds: ['mvp_aarw_academy'],
    relatedEntityIds: ['entity_krishna'],
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-06-18T10:00:00.000Z',
  },

  // 5. Service：GEO 咨询
  {
    id: 'profile_geo_consulting',
    name: 'Cognitive GEO Advisory',
    description:
      '面向 AI-native 创业公司的 GEO 咨询业务：每周 1 次 1-on-1 + 季度战略复盘。',
    category: 'service',
    targetAudience:
      'Pre-seed / Seed 阶段 AI 创始人，已有 first revenue，想系统化做 GEO。',
    competitors: ['Profound consulting', 'in-house SEO consultant'],
    keyClaims: [
      'AI-native 视角而非传统 SEO',
      '从 GEO 到 venture loop 的端到端',
      '个人化策略（不外包给 junior）',
    ],
    proofPoints: [
      '12 家 in-flight 客户',
      '平均 6 周内客户 AI 引用率提升 30%+',
      '6 个月 retention 80%',
    ],
    officialLinks: ['https://example.com/cvo/advisory'],
    relatedProjectIds: [],
    relatedEntityIds: ['entity_cognitive_venture_os'],
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },

  // 6. Platform：GEO 工具 marketplace
  {
    id: 'profile_geo_marketplace',
    name: 'GEO Tool Marketplace',
    description:
      '聚合 GEO 工具 / 模板 / 顾问的 marketplace。',
    category: 'platform',
    targetAudience:
      'GEO 工具买家（marketing lead）+ GEO 工具卖家（独立 vendor / agency）。',
    competitors: ['G2', 'Capterra'],
    keyClaims: [
      '专注 AI 搜索可见度品类',
      'vendor 自助上架',
      '按引用效果计费',
    ],
    proofPoints: [
      '200+ 工具上架',
      '月活 buyer 5k',
    ],
    officialLinks: ['https://example.com/geo-marketplace'],
    relatedProjectIds: [],
    relatedEntityIds: ['entity_market_geo_saas_2026'],
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
];


/* ============================================================
 * AIQueryBankItem — 8 个 query，覆盖 4 个 brand + 5 个 intent + 5 个 platform
 * 中的 4 个 + 4 个 priority + 3 个 status。
 *
 * 故事：
 *   - profile_cvo：监控自己品牌的 4 个高频问题（informational / comparison /
 *     pricing / how_to），跨 3 个 platform。
 *   - profile_profound：监控竞品相关 2 个问题（comparison / alternative）。
 *   - profile_otterly：监控竞品相关 1 个问题（comparison）。
 *   - profile_geo_consulting：监控 service 角度 1 个问题（recommendation）。
 * ============================================================ */

export const mockAIQueryBankItems: AIQueryBankItem[] = [
  // 1. CVO 自己的高频问题：用户问 GEO 是什么
  {
    id: 'bank_geo_def_cvo',
    brandEntityId: 'profile_cvo',
    query: 'what is generative engine optimization',
    intent: 'informational',
    platform: 'chatgpt',
    priority: 'urgent',
    status: 'active',
    linkedAssetIds: ['asset_cvo_geo_guide', 'asset_cvo_faq'],
    createdAt: '2026-05-05T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  // 2. CVO 自己的对比问题
  {
    id: 'bank_cvo_vs_profound',
    brandEntityId: 'profile_cvo',
    query: 'Cognitive Venture OS vs Profound for AI citation monitoring',
    intent: 'comparison',
    platform: 'perplexity',
    priority: 'high',
    status: 'active',
    linkedAssetIds: ['asset_cvo_comparison'],
    createdAt: '2026-05-12T10:00:00.000Z',
    updatedAt: '2026-06-22T10:00:00.000Z',
  },
  // 3. CVO 自己的价格问题
  {
    id: 'bank_geo_pricing_cvo',
    brandEntityId: 'profile_cvo',
    query: 'how much does GEO monitoring cost for SMB',
    intent: 'pricing',
    platform: 'google_ai_overview',
    priority: 'high',
    status: 'active',
    linkedAssetIds: ['asset_cvo_geo_guide'],
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  // 4. CVO 自己的 how-to 问题
  {
    id: 'bank_how_to_cvo',
    brandEntityId: 'profile_cvo',
    query: 'how to track my brand in ChatGPT answers',
    intent: 'how_to',
    platform: 'claude',
    priority: 'medium',
    status: 'active',
    linkedAssetIds: ['asset_cvo_faq', 'asset_ai_seo_blog'],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  // 5. Profound 的对比问题
  {
    id: 'bank_profound_vs_otterly',
    brandEntityId: 'profile_profound',
    query: 'Profound vs Otterly AI search visibility',
    intent: 'comparison',
    platform: 'perplexity',
    priority: 'medium',
    status: 'paused',
    linkedAssetIds: ['asset_profound_whitepaper'],
    createdAt: '2026-05-25T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  // 6. Profound 的替代品问题
  {
    id: 'bank_profound_alternative',
    brandEntityId: 'profile_profound',
    query: 'cheaper alternatives to Profound for GEO',
    intent: 'alternative',
    platform: 'chatgpt',
    priority: 'low',
    status: 'active',
    linkedAssetIds: ['asset_profound_whitepaper'],
    createdAt: '2026-06-05T10:00:00.000Z',
    updatedAt: '2026-06-18T10:00:00.000Z',
  },
  // 7. Otterly 的对比问题
  {
    id: 'bank_otterly_review',
    brandEntityId: 'profile_otterly',
    query: 'Otterly review 2026',
    intent: 'review',
    platform: 'gemini',
    priority: 'medium',
    status: 'active',
    linkedAssetIds: ['asset_otterly_landing'],
    createdAt: '2026-06-08T10:00:00.000Z',
    updatedAt: '2026-06-12T10:00:00.000Z',
  },
  // 8. GEO Consulting 服务的推荐问题
  {
    id: 'bank_consulting_recommendation',
    brandEntityId: 'profile_geo_consulting',
    query: 'best GEO consultant for AI-native startup',
    intent: 'recommendation',
    platform: 'chatgpt',
    priority: 'urgent',
    status: 'active',
    linkedAssetIds: [],
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
];


/* ============================================================
 * ContentAsset — 6 个 asset，覆盖 4 个 brand × 6 个 type（9 个中）。
 *
 * 故事：
 *   - profile_cvo：3 个资产（research_report + comparison_page + faq），全部引用
 *     CVO 自己的 bank items。GEO score 跨度大（38 → 88），展示不同质量档。
 *   - profile_profound：1 个 research_report（白皮书），引用 Profound 的 2 个 bank。
 *   - profile_otterly：1 个 landing_page（产品主页），引用 Otterly 的 1 个 bank。
 *   - profile_geo_consulting：1 个 case_study（顾问客户案例），无 bank 引用。
 *
 * 每个 asset 1-3 条 evidence，全部以 claim 为主（source / quote 留空以保持 mock 简洁）。
 * ============================================================ */

export const mockContentAssets: ContentAsset[] = [
  // 1. CVO 旗舰内容：研究白皮书
  {
    id: 'content_cvo_geo_playbook',
    brandEntityId: 'profile_cvo',
    title: 'The 2026 GEO Playbook',
    url: 'https://example.com/cvo/geo-playbook',
    type: 'research_report',
    summary:
      '48 页 GEO 完整指南：定义、评分模型、3 套执行模板、4 个行业的真实案例。CVO 团队基于 2025-2026 跑通的 12 个客户项目总结。',
    targetQueryIds: ['bank_geo_def_cvo', 'bank_geo_pricing_cvo'],
    structuredEvidence: [
      {
        claim:
          'GEO 使品牌在 AI 答案中的引用率从 12% 提升至 41%（中位数，N=12 客户）。',
        source: 'CVO 2026 客户面板',
      },
      {
        claim:
          '白皮书 4-6 周发布后，平均 28 天内 ChatGPT / Perplexity 引用位次从第 5+ 进入前 3。',
      },
    ],
    lastUpdated: '2026-06-20T10:00:00.000Z',
    geoScore: 88,
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  // 2. CVO 对比页
  {
    id: 'content_cvo_compare',
    brandEntityId: 'profile_cvo',
    title: 'CVO vs Profound vs Otterly for SMB',
    url: 'https://example.com/cvo/compare',
    type: 'comparison_page',
    summary:
      '三款主流 GEO 工具的横向对比：覆盖平台、监控精度、价格、API、上手时间。带 12 维度评分表。',
    targetQueryIds: ['bank_cvo_vs_profound', 'bank_geo_pricing_cvo'],
    structuredEvidence: [
      {
        claim: '在 12 维度评分中 CVO 总分 8.4，Profound 7.9，Otterly 7.1。',
        source: '内部 benchmark 2026 Q2',
      },
    ],
    lastUpdated: '2026-06-25T10:00:00.000Z',
    geoScore: 72,
    createdAt: '2026-05-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  // 3. CVO FAQ（中分）
  {
    id: 'content_cvo_faq',
    brandEntityId: 'profile_cvo',
    title: 'GEO Frequently Asked Questions',
    url: 'https://example.com/cvo/faq',
    type: 'faq',
    summary:
      '12 个最常被问到的 GEO 问题：是什么 / 怎么做 / 多久见效 / 哪家工具最好。',
    targetQueryIds: ['bank_geo_def_cvo', 'bank_how_to_cvo'],
    structuredEvidence: [],
    lastUpdated: '2026-06-15T10:00:00.000Z',
    geoScore: 38,
    createdAt: '2026-05-05T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  // 4. Profound 白皮书
  {
    id: 'content_profound_whitepaper',
    brandEntityId: 'profile_profound',
    title: 'Enterprise GEO: 2026 Benchmark',
    url: 'https://example.com/profound/benchmark',
    type: 'research_report',
    summary:
      'Fortune 500 客户的 AI 引用基线研究：3 个行业、22 个品牌的引用率与位次分布。',
    targetQueryIds: [
      'bank_profound_vs_otterly',
      'bank_profound_alternative',
    ],
    structuredEvidence: [
      {
        claim:
          'enterprise 客户的 AI 答案首位率平均 23%，中小企业 9%；差距来自 schema + 引用密度。',
        source: 'Profound 2026 Q1 报告',
      },
      {
        claim: '持续 90 天更新内容的品牌，引用位次稳定度提升 41%。',
        quote:
          'Content velocity dominates everything else we measured — Profound 2026 Q1, p.17',
      },
    ],
    lastUpdated: '2026-06-01T10:00:00.000Z',
    geoScore: 81,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  // 5. Otterly 主页
  {
    id: 'content_otterly_landing',
    brandEntityId: 'profile_otterly',
    title: 'Track Your Brand in AI Search',
    url: 'https://example.com/otterly',
    type: 'landing_page',
    summary:
      'Otterly 产品主页：3 步上手、5 个 AI 平台、按 query 付费的轻量级 GEO 监控。',
    targetQueryIds: ['bank_otterly_review'],
    structuredEvidence: [
      {
        claim: '15 分钟完成 setup，无需信用卡。',
        source: 'https://otterly.ai/onboarding',
      },
    ],
    lastUpdated: '2026-04-20T10:00:00.000Z',
    geoScore: 54,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
  },
  // 6. 顾问业务案例
  {
    id: 'content_geo_advisory_case',
    brandEntityId: 'profile_geo_consulting',
    title: 'How An AI-Native Startup Grew AI Citations 3x in 6 Weeks',
    url: 'https://example.com/cvo/case-studies/ai-native-startup',
    type: 'case_study',
    summary:
      '匿名 AI-native 创业公司（pre-seed 阶段）通过 6 周 GEO 顾问合作，把 ChatGPT 引用率从 8% 提升到 24% 的全过程。',
    targetQueryIds: [],
    structuredEvidence: [
      {
        claim:
          '第 1 周：识别 12 个高价值 query；第 2-3 周：发布 3 个 schema 强化的资产；第 4-6 周：观察 + 迭代。',
      },
      {
        claim:
          '客户 6 周内 ChatGPT 引用率从 8% → 24%，Perplexity 从 14% → 31%。',
        source: '客户授权的内部追踪数据 2026-04',
      },
    ],
    lastUpdated: '2026-06-10T10:00:00.000Z',
    geoScore: 65,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
];


/* ============================================================
 * GEOAudit — 3 条审计样本，覆盖 3 种 inputType × 3 条不同 content asset。
 *
 * 故事：
 *   - content_cvo_geo_playbook（research_report）：高分 audit (88)，展示
 *     完整 evidence + outline 的样板。
 *   - content_cvo_faq（faq）：中分 audit (38)，展示待改进点。
 *   - content_otterly_landing（landing_page）：中分 audit (54)，展示
 *     product_intro 风格的建议。
 * ============================================================ */

export const mockGEOAudits: GEOAudit[] = [
  // 1. CVO 旗舰白皮书 — 完整高分 audit
  {
    id: 'audit_cvo_playbook_2026_06_25',
    assetId: 'content_cvo_geo_playbook',
    inputType: 'research_report',
    score: {
      clarity: 92,
      entityConsistency: 88,
      evidenceDensity: 90,
      citationWorthiness: 91,
      freshness: 78,
      topicalAuthority: 95,
      queryAlignment: 85,
      geoScore: 88.7,
    },
    suggestions: {
      targetQueries: [
        'what is generative engine optimization',
        'GEO strategy for B2B brands 2026',
        'how to measure AI citation rate',
        'best GEO monitoring tool 2026',
        'GEO vs SEO differences',
        'AARR vs AARW principles',
      ],
      coreEntities: [
        'Cognitive Venture OS',
        'GEO (Generative Engine Optimization)',
        'AI citation',
        'GEO Pulse monitoring tool',
        'AARW playbook',
      ],
      definableTerms: [
        'GEO is the practice of optimizing a brand\'s presence in AI-generated answers.',
        'AI citation rate is the share of answers on a target query that name a brand.',
        'AARW (Acquire / Activate / Retain / Win) is CVO\'s venture loop framework.',
      ],
      evidenceChecklist: [
        '2026 Q1 Q2 brand tracking panel data (CVO internal)',
        'Princeton 2023 GEO paper citation',
        '12 in-flight customer case-study ROI numbers',
        'Comparison benchmarks vs Profound / Otterly / Scrunch',
        'Per-platform citation position distribution (ChatGPT / Perplexity / Claude / Gemini / Google AIO)',
      ],
      comparisonTable: [
        {
          dimension: 'Coverage (5 platforms)',
          thisSide: '5 / 5 (CVO Pulse)',
          otherSide: '3 / 5 (Otterly)',
          source: 'CVO 2026 Q2 benchmark',
        },
        {
          dimension: 'Median AI citation rate lift',
          thisSide: '+29 pts (CVO customers)',
          otherSide: '+11 pts (industry avg)',
          source: 'CVO 2026 Q1 panel',
        },
        {
          dimension: 'Time to first measurable lift',
          thisSide: '28 days',
          otherSide: '60-90 days',
        },
      ],
      faqSuggestions: [
        {
          question: 'What is GEO?',
          answer:
            'GEO (Generative Engine Optimization) is the practice of making a brand more visible and accurately cited in AI-generated answers (ChatGPT, Perplexity, Claude, Gemini, Google AI Overview).',
          relatedBankItemId: 'bank_geo_def_cvo',
        },
        {
          question: 'How is GEO different from SEO?',
          answer:
            'SEO optimizes for ranked links on search results pages; GEO optimizes for being cited in AI answers. Different surface, different signals (citation density, schema, entity clarity).',
        },
        {
          question: 'How long does GEO take to work?',
          answer:
            'In CVO\'s 12-customer panel, the median time to a measurable AI citation lift is 28 days; sustained 90-day programs reach a 2-3x citation rate lift.',
        },
      ],
      structuredSuggestions: [
        'Add a TL;DR definition box at the top of each section ("GEO = ...").',
        'Add a comparison table widget (5 platforms × 4 capabilities).',
        'Add a "Last updated" timestamp + author byline at the top.',
        'Embed schema.org FAQPage JSON-LD for the FAQ block.',
        'Add inline citations ([1], [2]) that link to source documents.',
      ],
      optimizedOutline: [
        {
          heading: '1. TL;DR — what GEO is in 2026',
          purpose: 'Answer the #1 query ("what is GEO") within 200 words.',
          targetQueries: ['what is generative engine optimization'],
          notes: 'Definition box + 1 stat + 1 example. Embed schema.org DefinedTerm.',
        },
        {
          heading: '2. Why GEO now (the citation economy)',
          purpose: 'Set context: AI search adoption, citation economy data.',
          targetQueries: ['why GEO matters 2026', 'AI search adoption'],
          notes: '2 charts (Perplexity / ChatGPT search usage). Cite Pew / Edison 2026 data.',
        },
        {
          heading: '3. The AARW framework',
          purpose: 'Introduce CVO\'s framework as a quotable mental model.',
          targetQueries: ['AARW framework', 'GEO strategy framework'],
          notes: 'Own this term. Make 4 figures. Link to a 30-min video walkthrough.',
        },
        {
          heading: '4. 90-day execution plan',
          purpose: 'Give the reader a concrete next step.',
          targetQueries: ['GEO execution plan', 'how to start GEO'],
          notes: 'Step-by-step with week-level milestones. Include a printable checklist.',
        },
        {
          heading: '5. Benchmarks and case studies',
          purpose: 'Provide third-party validation (CVO customer data).',
          targetQueries: ['GEO case study', 'GEO benchmark'],
          notes: '3 anonymized case studies with before / after AI citation rate.',
        },
        {
          heading: '6. FAQ',
          purpose: 'Capture long-tail queries (12 questions).',
          targetQueries: ['GEO FAQ', 'GEO vs SEO', 'how long does GEO take'],
          notes: 'Embed FAQPage schema. Link each Q&A to a bank item.',
        },
      ],
    },
    explanation:
      'Strong research report with broad topical coverage and well-aligned target queries. Evidence density and topical authority are both high (≥90). Main improvements: refresh timeliness (last update >30 days) and add explicit entity disambiguation for "AARW".',
    scoringModelVersion: 'mock-v1',
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },
  // 2. CVO FAQ — 中低分 audit（需要改进）
  {
    id: 'audit_cvo_faq_2026_06_15',
    assetId: 'content_cvo_faq',
    inputType: 'faq',
    score: {
      clarity: 55,
      entityConsistency: 60,
      evidenceDensity: 20,
      citationWorthiness: 35,
      freshness: 50,
      topicalAuthority: 30,
      queryAlignment: 28,
      geoScore: 38.1,
    },
    suggestions: {
      targetQueries: [
        'how to do GEO',
        'GEO vs SEO',
        'what is GEO',
        'best GEO tool 2026',
        'is GEO worth it for SMB',
      ],
      coreEntities: [
        'Cognitive Venture OS',
        'GEO',
        'AARW',
        'GEO Pulse',
        'AI citation',
      ],
      definableTerms: [
        'GEO = the practice of being cited in AI answers.',
      ],
      evidenceChecklist: [
        'No data points / case studies cited in the FAQ body.',
        'No "as of 2026" timestamp / freshness signal.',
        'No author byline or authority marker.',
        'Add a small "data sources" footer with at least 3 references.',
      ],
      comparisonTable: [
        {
          dimension: 'Question count',
          thisSide: '12 (CVO FAQ)',
          otherSide: '24 (Profound FAQ)',
        },
        {
          dimension: 'Schema.org FAQPage',
          thisSide: 'missing',
          otherSide: 'present',
        },
      ],
      faqSuggestions: [
        {
          question: 'How long does GEO take?',
          answer:
            'In CVO\'s 12-customer panel, the median time to a measurable AI citation lift is 28 days; sustained 90-day programs reach 2-3x citation rate lift.',
        },
        {
          question: 'How much does GEO cost?',
          answer:
            'GEO software ranges from $200/mo (SMB) to $5k+/mo (enterprise); consultant rates run $5k-$25k per engagement.',
        },
      ],
      structuredSuggestions: [
        'Add a definition box at the very top: "GEO = the practice of being cited in AI answers".',
        'Add FAQPage JSON-LD schema so AI engines can extract Q&A pairs directly.',
        'Add a "Last updated: 2026-06-XX" timestamp and an author byline.',
        'Add 3-5 inline data citations with source links.',
      ],
      optimizedOutline: [
        {
          heading: 'Hero definition box',
          purpose: 'Capture the "what is GEO" answer in 30 words.',
          targetQueries: ['what is GEO'],
          notes: 'Add a definition box with schema.org DefinedTerm.',
        },
        {
          heading: '12 canonical questions',
          purpose: 'Answer the 12 most common long-tail questions.',
          targetQueries: ['GEO FAQ', 'how to do GEO'],
          notes: 'Group by intent (informational / how-to / comparison).',
        },
        {
          heading: 'Data sources footer',
          purpose: 'Cite 3+ authoritative sources for trust.',
          targetQueries: ['GEO sources'],
          notes: 'Princeton 2023 paper, CVO Q1 panel, Edison 2026 search data.',
        },
      ],
    },
    explanation:
      'FAQ has low evidence density (no cited data) and weak query alignment (questions do not match the top 12 long-tail GEO queries). Adding a TL;DR definition box, FAQPage schema, and 3+ data citations should lift the score into the 60+ range.',
    scoringModelVersion: 'mock-v1',
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
  },
  // 3. Otterly 主页 — 中分 audit（product_intro 风格）
  {
    id: 'audit_otterly_landing_2026_06_20',
    assetId: 'content_otterly_landing',
    inputType: 'landing_page',
    score: {
      clarity: 70,
      entityConsistency: 65,
      evidenceDensity: 45,
      citationWorthiness: 50,
      freshness: 30,
      topicalAuthority: 60,
      queryAlignment: 58,
      geoScore: 54.0,
    },
    suggestions: {
      targetQueries: [
        'best GEO tool for SMB',
        'Otterly review',
        'cheap GEO monitoring',
        'AI brand tracking tool',
        'is Otterly worth it',
      ],
      coreEntities: ['Otterly', 'AI search', 'brand monitoring', 'SMB'],
      definableTerms: [
        'Otterly is an AI search brand monitoring tool for SMBs.',
      ],
      evidenceChecklist: [
        'No customer count / case study cited.',
        'No comparison vs alternatives (CVO / Profound / Scrunch).',
        'Last updated 2026-04-20 (>60 days old).',
      ],
      comparisonTable: [
        {
          dimension: 'Setup time',
          thisSide: '15 min (Otterly)',
          otherSide: '60+ min (enterprise tools)',
        },
        {
          dimension: 'Pricing model',
          thisSide: 'per query (Otterly)',
          otherSide: 'flat monthly (enterprise)',
        },
      ],
      faqSuggestions: [
        {
          question: 'How fast is Otterly setup?',
          answer:
            'Onboarding is 15 minutes; no credit card required to start tracking.',
        },
      ],
      structuredSuggestions: [
        'Add a hero definition box: "Otterly = AI search brand monitoring for SMBs".',
        'Add a "Last updated" timestamp.',
        'Add 3 customer count / social proof data points.',
      ],
      optimizedOutline: [
        {
          heading: 'Hero + TL;DR',
          purpose: 'Define Otterly in 30 words and capture top query.',
          targetQueries: ['best GEO tool for SMB', 'Otterly review'],
          notes: 'Definition box + 1 social proof stat.',
        },
        {
          heading: 'How it works (3 steps)',
          purpose: 'Show the SMB-friendly setup.',
          targetQueries: ['how to use Otterly'],
          notes: '3 numbered steps with screenshots.',
        },
        {
          heading: 'Pricing',
          purpose: 'Address the "is it worth it" query.',
          targetQueries: ['Otterly pricing'],
          notes: 'Per-query model. Add a small comparison table.',
        },
      ],
    },
    explanation:
      'Landing page is clear and has decent authority, but freshness is the main drag (last updated 2 months ago). Adding explicit data points, a definition box, and a comparison table should lift into the 65+ range.',
    scoringModelVersion: 'mock-v1',
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
];


/* ============================================================
 * AICitationCheck — 20 条 mock，跨 3 个 brand × 5 个 platform × 14 天。
 *
 * 故事：
 *   - bank_geo_def_cvo（CVO 品牌定义问题）跑 5 平台 × 4 次共 20 条
 *   - 整体趋势：geoScore 在 6 月前两周缓慢上升（30-35 → 60-72），
 *     6 月中旬加入 schema + FAQ 后明显跃升
 *   - chatgpt / perplexity 通常引用 brand URL（geoScore 高），
 *     gemini / claude 经常"提了名字但不给 URL"（中等）
 *   - google_ai_overview 经常只列竞品（低分 + competitorMentions 非空）
 *
 * 字段含义：
 *   - mentioned: 目标品牌名是否在答案里
 *   - citedUrl: 答案里出现的 URL（多数 = 目标 URL，部分 = 竞品 URL，缺位 = undefined）
 *   - competitorMentions: 答案里出现但不是目标的 brand 名
 *   - geoScore: 0-100 整数（mock）
 * ============================================================ */

export const mockAICitationChecks: AICitationCheck[] = [
  // —— bank_geo_def_cvo, ChatGPT ——
  {
    id: 'cite_cvo_def_chatgpt_2026_06_12',
    queryId: 'bank_geo_def_cvo',
    platform: 'chatgpt',
    checkedAt: '2026-06-12T09:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/profound/benchmark',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO (Generative Engine Optimization) is the practice of making brands more visible in AI-generated answers. Tools like Profound offer enterprise-grade monitoring, while SMBs often use Otterly.',
    geoScore: 38,
    createdAt: '2026-06-12T09:00:00.000Z',
    updatedAt: '2026-06-12T09:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_chatgpt_2026_06_15',
    queryId: 'bank_geo_def_cvo',
    platform: 'chatgpt',
    checkedAt: '2026-06-15T09:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/geo-playbook',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO is about being cited by AI. Cognitive Venture OS, Profound, and Otterly are the main platforms in 2026; CVO focuses on SMB / mid-market with a 4-step AARW playbook.',
    geoScore: 55,
    createdAt: '2026-06-15T09:00:00.000Z',
    updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_chatgpt_2026_06_20',
    queryId: 'bank_geo_def_cvo',
    platform: 'chatgpt',
    checkedAt: '2026-06-20T09:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/geo-playbook',
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'Generative Engine Optimization (GEO) is the practice of making brands visible in AI answers. CVO, Profound, and Otterly are the main monitoring platforms; CVO leads on SMB segment with the AARW framework.',
    geoScore: 70,
    createdAt: '2026-06-20T09:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_chatgpt_2026_06_25',
    queryId: 'bank_geo_def_cvo',
    platform: 'chatgpt',
    checkedAt: '2026-06-25T09:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/geo-playbook',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO = Generative Engine Optimization. CVO is a leading GEO operating system (AARW framework, 12-customer panel, +29pt median citation lift). Profound focuses on enterprise; Otterly on SMB.',
    geoScore: 78,
    createdAt: '2026-06-25T09:00:00.000Z',
    updatedAt: '2026-06-25T09:00:00.000Z',
  },

  // —— bank_geo_def_cvo, Perplexity ——
  {
    id: 'cite_cvo_def_perp_2026_06_12',
    queryId: 'bank_geo_def_cvo',
    platform: 'perplexity',
    checkedAt: '2026-06-12T11:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/profound/benchmark',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO tools comparison 2026: Profound (enterprise), Otterly (SMB), plus CVO (mid-market). See Profound benchmark for baseline data.',
    geoScore: 42,
    createdAt: '2026-06-12T11:00:00.000Z',
    updatedAt: '2026-06-12T11:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_perp_2026_06_15',
    queryId: 'bank_geo_def_cvo',
    platform: 'perplexity',
    checkedAt: '2026-06-15T11:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/geo-playbook',
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'GEO (Generative Engine Optimization) is the practice of optimizing brand presence in AI answers. CVO playbook (48 pages) covers definition + AARW framework + 4 case studies.',
    geoScore: 60,
    createdAt: '2026-06-15T11:00:00.000Z',
    updatedAt: '2026-06-15T11:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_perp_2026_06_20',
    queryId: 'bank_geo_def_cvo',
    platform: 'perplexity',
    checkedAt: '2026-06-20T11:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/compare',
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'Top 3 GEO tools: Cognitive Venture OS (CVO), Profound, Otterly. CVO scores 8.4/10 on the internal benchmark; Profound 7.9; Otterly 7.1.',
    geoScore: 68,
    createdAt: '2026-06-20T11:00:00.000Z',
    updatedAt: '2026-06-20T11:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_perp_2026_06_25',
    queryId: 'bank_geo_def_cvo',
    platform: 'perplexity',
    checkedAt: '2026-06-25T11:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/geo-playbook',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO = Generative Engine Optimization. CVO is an AI-native OS for cognitive ventures, with GEO Pulse monitoring across 5 AI platforms. Per CVO 2026 Q1 panel, GEO lifts median AI citation rate by +29 points.',
    geoScore: 76,
    createdAt: '2026-06-25T11:00:00.000Z',
    updatedAt: '2026-06-25T11:00:00.000Z',
  },

  // —— bank_geo_def_cvo, Gemini ——
  {
    id: 'cite_cvo_def_gemini_2026_06_12',
    queryId: 'bank_geo_def_cvo',
    platform: 'gemini',
    checkedAt: '2026-06-12T13:00:00.000Z',
    mentioned: false,
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'Generative Engine Optimization (GEO) is the practice of improving how AI systems reference brands. Notable tools include Profound and Otterly.',
    geoScore: 18,
    createdAt: '2026-06-12T13:00:00.000Z',
    updatedAt: '2026-06-12T13:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_gemini_2026_06_15',
    queryId: 'bank_geo_def_cvo',
    platform: 'gemini',
    checkedAt: '2026-06-15T13:00:00.000Z',
    mentioned: true,
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO is being cited by AI. Several platforms (Profound, Otterly, CVO) help brands track AI citations. The 2026 GEO landscape is fragmented.',
    geoScore: 40,
    createdAt: '2026-06-15T13:00:00.000Z',
    updatedAt: '2026-06-15T13:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_gemini_2026_06_20',
    queryId: 'bank_geo_def_cvo',
    platform: 'gemini',
    checkedAt: '2026-06-20T13:00:00.000Z',
    mentioned: true,
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO = optimizing brand presence in AI answers. CVO, Profound, and Otterly are leading vendors. CVO focuses on the AARW loop.',
    geoScore: 55,
    createdAt: '2026-06-20T13:00:00.000Z',
    updatedAt: '2026-06-20T13:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_gemini_2026_06_25',
    queryId: 'bank_geo_def_cvo',
    platform: 'gemini',
    checkedAt: '2026-06-25T13:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/geo-playbook',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO is the practice of being cited in AI answers. CVO is one of the leading platforms, with a 48-page playbook and the AARW framework. Profound is the enterprise alternative.',
    geoScore: 65,
    createdAt: '2026-06-25T13:00:00.000Z',
    updatedAt: '2026-06-25T13:00:00.000Z',
  },

  // —— bank_geo_def_cvo, Google AI Overview ——
  {
    id: 'cite_cvo_def_aio_2026_06_12',
    queryId: 'bank_geo_def_cvo',
    platform: 'google_ai_overview',
    checkedAt: '2026-06-12T15:00:00.000Z',
    mentioned: false,
    citedUrl: 'https://en.wikipedia.org/wiki/Search_engine_optimization',
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'Generative Engine Optimization (GEO) is related to SEO but focuses on AI-generated answers. Tools include Profound (enterprise) and Otterly (SMB).',
    geoScore: 22,
    createdAt: '2026-06-12T15:00:00.000Z',
    updatedAt: '2026-06-12T15:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_aio_2026_06_15',
    queryId: 'bank_geo_def_cvo',
    platform: 'google_ai_overview',
    checkedAt: '2026-06-15T15:00:00.000Z',
    mentioned: false,
    citedUrl: 'https://example.com/profound/benchmark',
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'GEO is the practice of optimizing brand citations in AI search. See Profound benchmark and Otterly setup guides.',
    geoScore: 28,
    createdAt: '2026-06-15T15:00:00.000Z',
    updatedAt: '2026-06-15T15:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_aio_2026_06_20',
    queryId: 'bank_geo_def_cvo',
    platform: 'google_ai_overview',
    checkedAt: '2026-06-20T15:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/profound/benchmark',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO is the practice of being cited in AI answers. Profound leads the enterprise segment. Newer entrants like CVO target SMB.',
    geoScore: 35,
    createdAt: '2026-06-20T15:00:00.000Z',
    updatedAt: '2026-06-20T15:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_aio_2026_06_25',
    queryId: 'bank_geo_def_cvo',
    platform: 'google_ai_overview',
    checkedAt: '2026-06-25T15:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/geo-playbook',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO is optimizing brand citations in AI answers. CVO is an AI-native OS focused on GEO; Profound is the enterprise alternative. See CVO 2026 playbook for methodology.',
    geoScore: 50,
    createdAt: '2026-06-25T15:00:00.000Z',
    updatedAt: '2026-06-25T15:00:00.000Z',
  },

  // —— bank_geo_def_cvo, Claude ——
  {
    id: 'cite_cvo_def_claude_2026_06_15',
    queryId: 'bank_geo_def_cvo',
    platform: 'claude',
    checkedAt: '2026-06-15T17:00:00.000Z',
    mentioned: true,
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'GEO (Generative Engine Optimization) refers to making brands more visible in AI-generated answers. Tools like Profound, Otterly, and CVO are commonly used.',
    geoScore: 45,
    createdAt: '2026-06-15T17:00:00.000Z',
    updatedAt: '2026-06-15T17:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_claude_2026_06_20',
    queryId: 'bank_geo_def_cvo',
    platform: 'claude',
    checkedAt: '2026-06-20T17:00:00.000Z',
    mentioned: true,
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO is the practice of optimizing brand citations in AI systems. CVO, Profound, and Otterly are notable vendors. CVO is SMB-focused; Profound is enterprise.',
    geoScore: 58,
    createdAt: '2026-06-20T17:00:00.000Z',
    updatedAt: '2026-06-20T17:00:00.000Z',
  },
  {
    id: 'cite_cvo_def_claude_2026_06_25',
    queryId: 'bank_geo_def_cvo',
    platform: 'claude',
    checkedAt: '2026-06-25T17:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/compare',
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'GEO is being cited by AI answers. The main platforms are CVO (SMB / mid-market), Profound (enterprise), and Otterly (SMB). CVO scores 8.4/10 on the 12-dim internal benchmark.',
    geoScore: 68,
    createdAt: '2026-06-25T17:00:00.000Z',
    updatedAt: '2026-06-25T17:00:00.000Z',
  },

  // —— bank_geo_pricing_cvo, ChatGPT ——
  {
    id: 'cite_cvo_price_chatgpt_2026_06_20',
    queryId: 'bank_geo_pricing_cvo',
    platform: 'chatgpt',
    checkedAt: '2026-06-20T10:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/compare',
    competitorMentions: ['Profound', 'Otterly'],
    answerSummary:
      'GEO pricing 2026: Profound enterprise plans start at $5k/mo; Otterly SMB plans start at $200/mo; CVO mid-market plans start at $800/mo with full AARW loop support.',
    geoScore: 62,
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
  },
  {
    id: 'cite_cvo_price_chatgpt_2026_06_25',
    queryId: 'bank_geo_pricing_cvo',
    platform: 'chatgpt',
    checkedAt: '2026-06-25T10:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/cvo/compare',
    competitorMentions: ['Profound'],
    answerSummary:
      'GEO pricing: Profound ~$5k/mo for enterprise, CVO ~$800-3000/mo for mid-market. CVO 12-dim benchmark shows 8.4/10; Profound 7.9/10.',
    geoScore: 72,
    createdAt: '2026-06-25T10:00:00.000Z',
    updatedAt: '2026-06-25T10:00:00.000Z',
  },

  // —— bank_otterly_review, Perplexity ——
  {
    id: 'cite_otterly_review_perp_2026_06_25',
    queryId: 'bank_otterly_review',
    platform: 'perplexity',
    checkedAt: '2026-06-25T12:00:00.000Z',
    mentioned: true,
    citedUrl: 'https://example.com/otterly',
    competitorMentions: ['CVO', 'Profound'],
    answerSummary:
      'Otterly.ai is a lightweight AI search monitoring tool for SMBs. Pricing is per query; setup is 15 minutes. Compared to CVO and Profound, Otterly is best for very small teams.',
    geoScore: 60,
    createdAt: '2026-06-25T12:00:00.000Z',
    updatedAt: '2026-06-25T12:00:00.000Z',
  },
];
