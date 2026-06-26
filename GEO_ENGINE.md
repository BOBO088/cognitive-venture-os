# GEO Engine

> Cognitive Venture OS — Generative Engine Optimization 模块。
> 目标：把"品牌在 AI 搜索里如何被引用"变成可观测、可优化、可对比的资产。

## 1. GEO 引擎的整体心智模型

GEO 引擎回答 3 个问题：

1. **我们是什么** — 品牌的业务画像（产品 / 品牌 / IP / 服务 / 平台；目标用户；竞品；核心主张；证据点；官方链接）。
2. **AI 怎么引用我们** — 在 Perplexity / ChatGPT / Claude / Google AIO 的回答里，
   我们的品牌被提到几次、是否给具体链接、位次如何。
3. **怎么改** — 优化方向（哪些 query 缺位、哪些资产该补、哪些 claim 没支撑）。

对应到本工程的 4 类核心实体：

| 问题 | 实体 | 状态 |
|---|---|---|
| 1. 我们是什么 | `BrandEntityProfile` | ✅ 本次实现 |
| 2. AI 怎么引用我们 | `GEOBrandEntity` + `GEOContentAsset` + `AIQuery` + `CitationCheckResult` | ✅ 已存在（v0.1 早期） |
| 3. 怎么改 | `ImprovementLog.targetType='score_model'` / prompt v+1 迭代 | ✅ 通过 iteration layer 覆盖 |
| 关联上下文 | `MVPProject` + `GraphEntity` | ✅ 通过 `relatedProjectIds` / `relatedEntityIds` 关联 |

## 2. 实体全景

```
                              ┌─────────────────────┐
                              │ BrandEntityProfile  │  ←  真实世界的业务画像
                              │ (新)                │
                              └──────────┬──────────┘
                                         │  relatedProjectIds
                                         │  relatedEntityIds
                                         ▼
   ┌──────────────────┐         ┌──────────────────┐
   │ GraphEntity      │◄────────│ MVPProject       │
   │ (knowledge-graph)│         │ (mvp-pipeline)   │
   └──────────┬───────┘         └────────┬─────────┘
              │                          │
              │                          │  relatedEntityIds
              │  relatedEntityIds        │  derived from mvp.opportunityId
              ▼                          ▼
   ┌──────────────────────────────────────────────────┐
   │              GEO Engine (本模块)                  │
   ├──────────────────────────────────────────────────┤
   │  GEOBrandEntity       ← AI 搜索的"投影"           │
   │     pillars / aliases / canonicalName             │
   │     assetIds / queryIds                           │
   │  GEOContentAsset      ← 品牌发布的内容资产         │
   │  AIQuery              ← 监控问题                   │
   │  CitationCheckResult  ← 每次回答的引用快照         │
   └──────────────────────────────────────────────────┘
```

## 3. BrandEntityProfile（v1, 2026-06-26）

> "我们是什么"的标准化档案。管理品牌 / 产品 / IP / 服务 / 平台在 AI 搜索语境下的实体信息。

### 3.1 与 GEOBrandEntity 的关系

| 维度 | `BrandEntityProfile` | `GEOBrandEntity` |
|---|---|---|
| 视角 | 真实世界的业务画像 | AI 搜索里的"投影" |
| 字段 | name / category / targetAudience / competitors / keyClaims / proofPoints / officialLinks | brandName / canonicalName / description / pillars / aliases / assetIds / queryIds |
| 关联 | MVPProject / GraphEntity | GEOContentAsset / AIQuery |
| 用途 | 立项 / 品牌策略 / 投资人展示 | AI 监控 / 引用率看板 |
| 派生 | 未来可自动派生 GEOBrandEntity | 反向人工回填 BrandEntityProfile |

**两者独立**。当前没有强制绑定。后续可以加 `GEOBrandEntity.profileId` 反向引用。

### 3.2 字段

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | string | 唯一 | `profile_<timestamp36>-<rand8>` |
| `name` | string | 1-200 | 实体常用名（"Cognitive Venture OS"） |
| `description` | string | 1-4000 | 业务侧描述（是什么 / 为谁 / 解决什么） |
| `category` | enum | 6 个值 | `brand` / `product` / `ip` / `service` / `platform` / `other` |
| `targetAudience` | string | 1-1000 | 目标用户描述 |
| `competitors` | string[] | 每项 1-200，≤ 20 | 竞品名（自由文本） |
| `keyClaims` | string[] | 每项 1-400，≤ 20 | 核心主张 |
| `proofPoints` | string[] | 每项 1-400，≤ 20 | 证据点 |
| `officialLinks` | string[] | 每项合法 http(s) URL，≤ 20 | 官方链接 |
| `relatedProjectIds` | string[] | 必须指向存在的 MVPProject | 跨实体引用校验 |
| `relatedEntityIds` | string[] | 必须指向存在的 GraphEntity | 跨实体引用校验 |
| `createdAt` / `updatedAt` | string (ISO) | — | 时间戳 |

### 3.3 业务规则（service 层强制）

1. `name` / `description` / `targetAudience` 必填 + 长度约束。
2. `category` ∈ `BRAND_ENTITY_CATEGORIES`（6 个值）。
3. `competitors` / `keyClaims` / `proofPoints` / `officialLinks`：
   - 字符串数组，每项 trim / 去空 / 去重。
   - 长度上限 20 项。
   - 单项字符上限 200（competitors）/ 400（claims / proofs）。
   - `officialLinks` 必须匹配 `^https?://`。
4. `relatedProjectIds`：service 调 `mvpProjectService.getMVPProject(id)` 校验每个 id 存在。
5. `relatedEntityIds`：service 调 `graphEntityService.getEntity(id)` 校验每个 id 存在。
6. `id` 唯一性（service 检查 + repo 校验）。
7. 引用列在 `update` 时若被改才重新校验（避免无关更新触发引用校验）。

### 3.4 文件落位

| 文件 | 角色 |
|---|---|
| `types/geo.ts` | `BrandEntityProfile` interface + `BRAND_ENTITY_CATEGORIES` enum + label map |
| `mock-data/geo.ts` | `mockBrandEntityProfiles` — 6 个样本（1 product + 1 brand + 1 product + 1 ip + 1 service + 1 platform） |
| `lib/repos/geo.ts` | list / listSorted / listByCategory / get / insert / updateInStore / deleteFromStore |
| `lib/services/geoBrandService.ts` | 业务规则 + 引用校验 + aggregates |
| `lib/services/geoBrandService.test.ts` | 29 个 unit tests |
| `components/geo/BrandEntityProfileList.tsx` | RSC 列表 |
| `components/geo/BrandEntityProfileForm.tsx` | 'use client' 表单（10 字段 + quick-add picker） |
| `app/geo/brands/actions.ts` | create / update / delete server actions |
| `app/geo/brands/page.tsx` | `/geo/brands` 列表 + 过滤 |
| `app/geo/brands/new/page.tsx` | `/geo/brands/new` 新建（支持 `?projectId=&entityId=` 预填） |
| `app/geo/brands/[id]/page.tsx` | `/geo/brands/[id]` 详情 + 编辑 + 删除 |

## 4. AI Query Bank（v2, 2026-06-26）

> "我们关心哪些 AI 问题"的战略级问题库。和 `AIQuery`（执行单元）完全独立。
> 关注：问题清单、绑定 brand、绑定 content asset、priority / status。

### 4.1 与 AIQuery 的关系

| 维度 | `AIQueryBankItem` | `AIQuery` |
|---|---|---|
| 视角 | 战略级"问题库" | 执行级"监控单元" |
| 字段 | query / brandEntityId / intent / platform / priority / status / linkedAssetIds | text / provider / brandId / pillar / intent / schedule / citationCheckIds |
| 关联 | BrandEntityProfile + GEOContentAsset | GEOBrandEntity + CitationCheckResult |
| 用途 | "我们关心哪些问题、哪些资产能回答它" | "现在跑在哪个 AI 上、多久查一次、最近一次结果是什么" |
| 派生 | 未来 AIQuery.text 可来自 AIQueryBankItem.query（字符串匹配） | 人工维护 |

**两者独立**。当前没有强制绑定。`AIQuery.text` 与 `AIQueryBankItem.query` 字符串匹配做"问题库 → 执行单元"的弱关联（未来可加 `bankItemId` 反向引用）。

### 4.2 4 个 enum

| Enum | 取值 | 字段 |
|---|---|---|
| `AIQueryBankIntent` | informational / comparison / recommendation / how_to / review / pricing / alternative / trend / problem_solution | 9 个 |
| `AIQueryBankPlatform` | chatgpt / perplexity / gemini / google_ai_overview / claude | 5 个 |
| `AIQueryBankPriority` | urgent / high / medium / low | 4 个 |
| `AIQueryBankStatus` | active / paused / archived | 3 个 |

### 4.3 字段

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | string | 唯一 | `bank_<timestamp36>-<rand8>-<n>` |
| `brandEntityId` | string | 必须指向存在的 BrandEntityProfile | service 校验 |
| `query` | string | 1-500 | 自然语言问题 |
| `intent` | enum | 9 个值 | 提问意图 |
| `platform` | enum | 5 个值 | 监控平台 |
| `priority` | enum | 4 个值 | 监控优先级 |
| `status` | enum | 3 个值 | 生命周期 |
| `linkedAssetIds` | string[] | 每项必须指向存在的 GEOContentAsset，≤ 50 | 哪些资产能回答这个问题 |
| `createdAt` / `updatedAt` | string (ISO) | — | 时间戳 |

### 4.4 业务规则（service 层强制）

1. `brandEntityId` 必须指向存在的 `BrandEntityProfile`（service 调 `geoBrandService.getBrandEntityProfile`）。
2. `query` 1-500 字符。
3. `intent` / `platform` / `priority` / `status` 4 个 enum 校验。
4. `linkedAssetIds` 每项必须指向存在的 `GEOContentAsset`（service 调 `repos/geo.listContentAssets`）。
5. `update` 时若 `brandEntityId` / `linkedAssetIds` 被改才重新校验（避免无关更新触发引用校验）。
6. `id` 唯一性。
7. 批量生成（`generateAIQueryBankForBrand`）：
   - `count` 1-50
   - 调 `LLMProvider.generateAIQueryBankDraft` 拿草稿
   - LLM 返回 `priorityScore` 0-100 → service 映射到 `priority` enum（≥75 urgent, ≥50 high, ≥25 medium, else low）
   - 给每条草稿分配 `id` + `createdAt` / `updatedAt`
   - 跳过 `brandEntityId` 二次校验（已通过 `getBrandEntityProfile` 校验）

### 4.5 文件落位

| 文件 | 角色 |
|---|---|
| `types/geo.ts` | 4 个 enum + label map + `AIQueryBankItem` interface |
| `mock-data/geo.ts` | `mockAIQueryBankItems` — 8 条样本（4 brand × 1-4 query） |
| `lib/repos/geo.ts` | list / listSorted / listByBrand / get / insert / updateInStore / deleteFromStore |
| `lib/providers/llm.ts` | `LLMProvider.generateAIQueryBankDraft` + `AIQueryBankDraft` 类型 |
| `lib/providers/mock/llm.ts` | mock 实现（hash32(seed + '\|' + i) → 确定性内容） |
| `lib/services/aiQueryService.ts` | 业务规则 + 引用校验 + aggregates + 批量生成 |
| `lib/services/aiQueryService.test.ts` | 27 个 unit tests |
| `components/geo/AIQueryBankList.tsx` | RSC 列表（8 列 tone-coded badges） |
| `components/geo/AIQueryBankForm.tsx` | 'use client' 表单（7 字段 + linkedAssetIds quick-add picker） |
| `app/geo/queries/actions.ts` | create / update / delete / generateForBrand server actions |
| `app/geo/queries/page.tsx` | `/geo/queries` 列表 + 5 维过滤（brand / intent / platform / priority / status） |
| `app/geo/queries/new/page.tsx` | `/geo/queries/new` 单条 + 批量生成双入口 |
| `app/geo/queries/new/BatchGenerateForm.tsx` | 'use client' 批量生成表单（6 字段） |
| `app/geo/queries/[id]/page.tsx` | `/geo/queries/[id]` 详情 + 编辑 + 删除 |

### 4.6 与 provider 的预留接口

- `LLMProvider.generateAIQueryBankDraft` 当前是 mock（基于 brand.name + intent + platform + 索引 hash 出确定性内容，`priorityScore` 50-99 之间）。
- 切真实 LLM 时只换 `lib/providers/<real>/llm.ts` 实现，service 零改动。

Content Asset Library 通过 `ContentAssetConnector` 接口预留外部 CMS 接入点（WordPress /
Notion / Ghost / 自建 CMS）。当前 service 直接读写 `mockContentAssets`；未来
`lib/providers/<source>/contentAsset.ts` 实现 `ContentAssetConnector` 后，
service 通过 `getContentAssetConnector()` 拿实例。
- 未来可加 `LLMProvider.scoreQueryRelevance(query, brand)`：对历史 bank 重新打分调整 priority。


## 5. Content Asset Library（v3, 2026-06-26）

> "品牌发布了什么、回答了哪些 AI 问题、可被引用的证据有哪些"的战略级内容库。
> 把"内容资产"从 v0.1 的 `GEOContentAsset`（挂在 GEOBrandEntity 下、targetQueries
> 自由文本）升级到挂在 BrandEntityProfile 下、targetQueryIds 强引用 AIQueryBankItem。

### 5.1 与 GEOContentAsset（v0.1）的关系

| 维度 | `ContentAsset`（v2） | `GEOContentAsset`（v0.1） |
|---|---|---|
| 视角 | 战略级内容库 | 旧 v0.1 内容资产 |
| 挂在 | `BrandEntityProfile` | `GEOBrandEntity` |
| targetQueries | `AIQueryBankItem.id[]` 强引用 | `string[]` 自由文本 |
| 评分 | `geoScore` 0-100 整数 | 无 |
| 证据 | `structuredEvidence[]`（claim / source / quote） | 无 |
| 关联 | `AIQueryBankItem` 反查 | 无强引用 |
| 派生 | 未来可作为 `AIQueryBankItem.linkedAssetIds` 的扩展数据源 | 已存在但不再演进 |

**两者并行存在**，不互相替换。`AIQueryBankItem.linkedAssetIds` 当前仍指向 v0.1
`GEOContentAsset.id`（来自更早任务，已稳定），不强制迁移。后续如需合并，可做
`linkedAssetIds` 兼容读取 v0.1 + v2。

### 5.2 字段

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | string | 唯一 | `content_<timestamp36>-<rand8>` |
| `brandEntityId` | string | 必须指向存在的 BrandEntityProfile | service 校验 |
| `title` | string | 1-200 | 标题 |
| `url` | string | 合法 http(s) URL | 服务端可抓取入口 |
| `type` | enum | 9 个值 | 形态（landing_page / blog_post / ...） |
| `summary` | string | 1-1000 | 1-2 段摘要 |
| `targetQueryIds` | string[] | 每项必须指向存在的 AIQueryBankItem，≤ 50 | 这条资产能回答哪些 bank 问题 |
| `structuredEvidence` | ContentAssetStructuredEvidence[] | claim 1-400 字符，≤ 20 | 可被 AI 引用的证据点 |
| `lastUpdated` | string (ISO 8601) | — | 内容本身最近一次刷新时间 |
| `geoScore` | number | 整数 ∈ [0, 100] | GEO 健康分 |
| `createdAt` / `updatedAt` | string (ISO) | — | 实体记录时间戳 |

### 5.3 9 个 type 枚举

`landing_page` / `blog_post` / `research_report` / `case_study` / `faq` /
`comparison_page` / `documentation` / `video_script` / `social_post`。

### 5.4 ContentAssetStructuredEvidence

```ts
interface ContentAssetStructuredEvidence {
  claim: string;        // 1-400 字符
  source?: string;      // 可选 URL / 报告名
  quote?: string;       // 可选直接引文
}
```

当前 form 只收集 `claim`（一行一项）。`source` / `quote` 字段保留供后续
更结构化的录入 UI。

### 5.5 业务规则（service 层强制）

1. `title` 1-200 字符；`summary` 1-1000 字符。
2. `url` 必须是合法 `^https?://` URL。
3. `type` ∈ `CONTENT_ASSET_TYPES`（9 个值）。
4. `brandEntityId` 必须指向存在的 `BrandEntityProfile`（service 调
   `geoBrandService.getBrandEntityProfile`）。
5. `targetQueryIds` 每项必须指向存在的 `AIQueryBankItem`，≤ 50（service
   调 `aiQueryService.getAIQueryBankItem`）。
6. `structuredEvidence` 每项 `claim` 1-400 字符、≤ 20；`source` / `quote`
   可选且 trim 后非空才保留。
7. `lastUpdated` 必须是合法 ISO 8601 datetime。
8. `geoScore` 整数 ∈ [0, 100]。
9. `id` 唯一性。
10. `update` 时若 `brandEntityId` / `targetQueryIds` / `structuredEvidence`
    被改才重新校验（避免无关更新触发引用校验）。

### 5.6 报告导出（Markdown）

详情页 `ContentAssetReport` 客户端组件：
- "Generate report" → 构建 markdown 字符串（metadata + summary + evidence + target queries + timestamp）。
- "Copy markdown" → 调 `navigator.clipboard.writeText`。
- "Download .md" → `Blob` + `URL.createObjectURL` 触发下载。
- 文件名 = `<title-slug>.md`（≤ 60 字符）。

不通过 server action：markdown 是数据视图，服务端拼字符串反而绕。

### 5.7 文件落位

| 文件 | 角色 |
|---|---|
| `types/geo.ts` | `ContentAssetType` enum + label + `ContentAssetStructuredEvidence` + `ContentAsset` |
| `mock-data/geo.ts` | `mockContentAssets` — 6 个样本（4 brand × 6 type） |
| `lib/repos/geo.ts` | list / listSorted / listByBrand / get / insert / updateInStore / deleteFromStore（`ContentLibrary` 前缀，避开 v0.1 `listContentAssets`） |
| `lib/services/contentAssetService.ts` | 业务规则 + 引用校验 + aggregates + report context + reserved `ContentAssetConnector` 接口 |
| `lib/services/contentAssetService.test.ts` | 32 个 unit tests |
| `components/geo/ContentAssetList.tsx` | RSC 列表（8 列；GEO score tone-coded badge） |
| `components/geo/ContentAssetForm.tsx` | 'use client' 表单（9 字段 + targetQueryIds picker） |
| `components/geo/ContentAssetReport.tsx` | 'use client' Markdown 报告生成 / 复制 / 下载 |
| `app/geo/content-assets/actions.ts` | create / update / delete server actions |
| `app/geo/content-assets/page.tsx` | `/geo/content-assets` 列表 + 3 维过滤（brand / type / minScore） |
| `app/geo/content-assets/new/page.tsx` | `/geo/content-assets/new` 新建（支持 `?brandEntityId=&queryId=` 预填） |
| `app/geo/content-assets/[id]/page.tsx` | `/geo/content-assets/[id]` 详情 + 编辑 + 删除 + 报告 |

### 5.8 与 provider / connector 的预留接口

- **`ContentAssetConnector` 接口**（在 service 文件中声明、不实现）：
  - `name: string`、`health()`、`fetchDrafts({ brandEntityId, since })`。
  - `registerContentAssetConnector(c)` / `getContentAssetConnector()` 全局注册。
  - 未来接 WordPress / Notion / Ghost / 自建 CMS 时，新增
    `lib/providers/<source>/contentAsset.ts` 实现此接口。
  - service 仍走 mock 路径（无 connector 时直接 `mockContentAssets` 读写）；
    connector 上线后只换实现，service 零改动。
- **未来 LLM 评分**：`LLMProvider.scoreAsset(asset, bankItems)` 给出建议
  `geoScore` 和理由。当前 `geoScore` 是人工录入。

### 5.9 Aggregates（`computeContentAssetStats`）

| 字段 | 说明 |
|---|---|
| `totalAssets` | 总数 |
| `byType` | Record<type, count> 覆盖 9 个 type（未使用为 0） |
| `byScoreBucket` | `{ low: 0-49, mid: 50-74, high: 75-100 }` |
| `withEvidence` | structuredEvidence 非空的数量 |
| `withTargetQueries` | targetQueryIds 非空的数量 |
| `averageGeoScore` | 整数平均分（无 asset 时为 0） |

### 5.10 与其它模块的桥接

- **BrandEntityProfile**：`brandEntityId` 强引用；profile 详情页可跳到
  `?brandEntityId=<id>` 过滤的 content asset 列表。
- **AIQueryBankItem**：`targetQueryIds` 强引用；bank item 详情页可跳到
  `?queryId=<id>` 过滤的 content asset 列表；bank item 删除 / 改后
  `revalidatePath` 刷新关联 asset 详情。
- **GEO Optimizer / AI**：未来 `LLMProvider.generateGEOSuggestions`
  可以基于 `ContentAsset.structuredEvidence` + `geoScore` + brand
  给出"哪几个 claim 还缺证据"的具体建议。


## 6. GEO Content Optimizer（v4, 2026-06-26）

> 给一条 `ContentAsset` 跑一次 7 维 GEO 审计，输出 9 项建议和 1 份优化版大纲。
> Append-only 历史；每次 run 创建一条 `GEOAudit` 记录，不做 update / delete。

### 6.1 与 v0.1 GEO Optimizer 的关系

`GEOProvider` 的 v0.1 方法（`generateSuggestions` / `analyzeCheck` /
`suggestQueries`）关注"品牌在 AI 答案里被怎么引用"，输入是
`GEOBrandEntity` + `CitationCheckResult`；v2 Optimizer 关注"单条内容
资产本身在 GEO 维度上怎么改"，输入是 `ContentAsset` + 关联
`BrandEntityProfile` + `AIQueryBankItem` + `GraphEntity`。两者**互补**，
都在 `GEOProvider` interface 里（v2 = `analyzeContentAsset`）。

### 6.2 类型

| 类型 | 用途 |
|---|---|
| `OptimizerInputType`（6） | 用户在 form 里选的"输入类型"（article / product_intro / landing_page / research_report / faq / short_video_script），用于 tune `buildSuggestions` defaults。 |
| `GEOAuditDimension`（7） | 7 维评分枚举（clarity / entity_consistency / evidence_density / citation_worthiness / freshness / topical_authority / query_alignment）。 |
| `GEO_AUDIT_WEIGHTS` | 7 维权重（sum = 1.0）：clarity 0.1 / entity_consistency 0.1 / evidence_density 0.15 / citation_worthiness 0.2 / freshness 0.1 / topical_authority 0.15 / query_alignment 0.2。 |
| `GEOAuditScore` | 7 维（camelCase）+ `geoScore`（0-100 浮点，1 位小数，service 用 `GEO_AUDIT_WEIGHTS` 重算）。 |
| `GEOAuditSuggestion` | 一条结构化建议（text + 可选 `relatedBankItemId`）。 |
| `GEOAuditComparisonRow` | 对比表一行（dimension / thisSide / otherSide / 可选 source）。 |
| `GEOAuditFAQItem` | FAQ 草稿（question / answer / 可选 `relatedBankItemId`）。 |
| `GEOAuditOutlineSection` | 优化版大纲的一节（heading / purpose / targetQueries / notes）。 |
| `GEOAuditSuggestions` | 9 项优化建议容器：targetQueries / coreEntities / definableTerms / evidenceChecklist / comparisonTable / faqSuggestions / structuredSuggestions / optimizedOutline。注：8 号位故意空缺，与用户给的 9 桶编号对齐。 |
| `GEOAudit` | 一次审计（id / assetId / inputType / score / suggestions / explanation / scoringModelVersion / createdAt / updatedAt）。 |

### 6.3 业务规则（service 层强制）

- `assetId` 必须指向存在的 `ContentAsset`。
- `inputType ∈ OPTIMIZER_INPUT_TYPES`（6 个值）。
- 7 维分必须 ∈ [0, 100] **整数**。
- `geoScore` 由 service 用 `computeWeightedTotal(dims) = Σ dim_i × GEO_AUDIT_WEIGHTS_i` 重算（1 位小数）。**不信任 provider 给的 `geoScore`**（mock provider 返回 0 占位）。
- `suggestions` 9 桶有各自长度上限（见 `geoOptimizerService.ts` 常量）。
- `explanation` 1-1000 字符。
- `id` 唯一性，格式 `audit_<timestamp36>-<rand8>`。
- `createdAt` / `updatedAt` 由调用方提供（mock now = `2026-06-25T12:00:00.000Z`）。
- **append-only**：没有 `update` / `delete` —— audit 是历史快照。

### 6.4 文件落位

| 文件 | 角色 |
|---|---|
| `types/geo.ts` | `OptimizerInputType` / `GEOAuditDimension` / `GEO_AUDIT_WEIGHTS` / `GEOAuditScore` / `GEOAuditSuggestion` / `GEOAuditComparisonRow` / `GEOAuditFAQItem` / `GEOAuditOutlineSection` / `GEOAuditSuggestions` / `GEOAudit` |
| `mock-data/geo.ts` | 3 条 `mockGEOAudits`：playbook 88（research_report）/ FAQ 38（faq）/ Otterly landing 54（landing_page） |
| `lib/repos/geo.ts` | `listGEOAudits` / `listGEOAuditsSorted` / `listGEOAuditsByAsset` / `getGEOAudit` / `insertGEOAudit`（read + append，无 update / delete） |
| `lib/providers/geo.ts` | `GEOProvider.analyzeContentAsset(input)` 接口 |
| `lib/providers/mock/geo.ts` | mock `analyzeContentAsset` —— 基于 hash 派生确定性 7 维分 + 9 桶建议 + explanation |
| `lib/services/geoOptimizerService.ts` | `runGEOAudit` / `listGEOAudits` / `getLatestAuditForAsset` / `computeGEOAuditStats` / `buildAuditReportContext` / `computeWeightedTotal` + 预留 `GEOAuditScoringModel` |
| `lib/services/geoOptimizerService.test.ts` | 18 tests |
| `components/geo/GEOAuditView.tsx` (RSC) | 7 维 breakdown + 9 桶建议展示 |
| `components/geo/GEOOptimizerForm.tsx` (client) | assetId + inputType 表单 |
| `components/geo/GEOAuditReport.tsx` (client) | Markdown 报告生成 / 复制 / 下载 |
| `app/geo/optimizer/page.tsx` (RSC) | 列表视图 + `?assetId=` 聚焦视图 |
| `app/geo/optimizer/actions.ts` | `runGEOAuditAction` —— revalidate + redirect |

### 6.5 与 provider / connector 的预留接口

- `GEOAuditScoringModel`（service 暴露）：版本化的评分模型注册入口
  （`registerGEOAuditScoringModel(m)` / `getGEOAuditScoringModel()`）。当前
  未实现，未来切换评分模型时只换实现，调用方零改动。
- 评分模型改动通过 `ImprovementLog`（`targetType='score_model'`）记录，
  与 Iteration Layer 打通。

### 6.6 与其它模块的桥接

- `ContentAsset`：`assetId` 强引用；audit 跑完后 `revalidatePath` 刷新
  `/geo/content-assets/[id]` 详情。
- `BrandEntityProfile`：从 `asset.brandEntityId` 拉 brand 上下文（description /
  keyClaims / proofPoints）作为 LLM prompt 输入。
- `AIQueryBankItem`：从 `asset.targetQueryIds` 拉 bank items，作为
  `targetQueries` 和 FAQ 建议的 `relatedBankItemId` 来源。
- `GraphEntity`：从 `brand.relatedEntityIds` 拉 graph entities，
  `entityConsistency` 维度会按 entity 数量加 bonus。

## 7. AI Citation Monitor（v5, 2026-06-26）

> 把"在 AI 搜索答案里追踪品牌被提及 / 引用"这件事收口到本模块。
> 5 平台 × N query × 时间序列：每个 check 是 append-only 快照，支撑趋势图 + 周报。

### 7.1 与 v0.1 CitationCheckResult 的关系

`CitationCheckResult`（v0.1，关联 `AIQuery`）：判 `verdict`（cited / mentioned /
absent / competitor_only）+ 引用 `GEOContentAsset.id` 和 `GraphEntity.id`。
关注"AI 答案的结构化命中"。

`AICitationCheck`（v5，关联 `AIQueryBankItem`）：跑一次 query → 记录
`mentioned` boolean + `citedUrl`（原样 URL） + `competitorMentions`（自由
brand 名列表） + `answerSummary`（AI 答案文本） + `geoScore`（0-100 整数）。
关注"AI 答案本身长什么样"——便于做趋势图 + 周报。

两者**互补**。同一 query 可同时挂 v0.1 check 和 v5 check（甚至同日），各
服务不同 UI（v0.1 → GEO 引用面板；v5 → 趋势图 + 周报）。

### 7.2 类型

| 类型 | 用途 |
|---|---|
| `CitationPlatform`（5） | `chatgpt` / `perplexity` / `gemini` / `google_ai_overview` / `claude`。与 `AIQueryBankPlatform` 同值但语义独立。 |
| `CITATION_PLATFORMS` | 5 个值的数组。 |
| `CITATION_PLATFORM_LABEL` | 平台 → 显示名。 |
| `AICitationCheck` | 单次 check 快照（id / queryId / platform / checkedAt / mentioned / citedUrl / competitorMentions / answerSummary / geoScore / createdAt / updatedAt）。 |

### 7.3 业务规则（service 层强制）

- `queryId` 必须指向存在的 `AIQueryBankItem`。
- `platform ∈ CITATION_PLATFORMS`。
- `checkedAt` 必须是合法 ISO 8601。
- `citedUrl` 可选；存在时必须是合法 `http(s)://` URL，≤ 500 字符。
- `competitorMentions` 每项 1-100 字符，≤ 20 项。
- `answerSummary` 1-2000 字符。
- `geoScore ∈ [0, 100]` **整数**。
- `id` 唯一性，格式 `cite_<timestamp36>-<rand8>`。
- `createdAt` / `updatedAt` 由调用方提供。
- **append-only**：没有 update / delete。

### 7.4 文件落位

| 文件 | 角色 |
|---|---|
| `types/geo.ts` | `CitationPlatform` / `CITATION_PLATFORMS` / `CITATION_PLATFORM_LABEL` / `AICitationCheck` |
| `mock-data/geo.ts` | 22 条 `mockAICitationChecks`（CVO 定义 / 价格 / Otterly 评测 3 个 query × 5 平台 × 1-4 次 = 22 条），时间跨度 2026-06-12 → 2026-06-25 |
| `lib/repos/geo.ts` | `listAICitationChecks` / `listAICitationChecksSorted` / `listAICitationChecksByQuery` / `listAICitationChecksByPlatform` / `getAICitationCheck` / `insertAICitationCheck`（read + append，无 update / delete） |
| `lib/providers/connectors/citation-monitor.ts` | `CitationMonitorConnector` 接口（`runCheck(input) → draft`） |
| `lib/providers/mock/connectors/citation-monitor.ts` | mock 实现：基于 platform `friendliness` + hash 派生确定性结果 |
| `lib/providers/index.ts` | `getCitationMonitorConnector()` 工厂 + 聚合 health 加进 `getAllProvidersHealth` |
| `lib/services/citationMonitorService.ts` | `runCitationCheck` / `list*` / `computeCitationStats` / `computeTrend` / `buildCitationReportContext` / `generateWeeklyReport` + 26 tests |
| `lib/services/citationMonitorService.test.ts` | 26 tests |
| `components/geo/CitationCheckList.tsx` (RSC) | check 列表（带平台 / mention / score badge） |
| `components/geo/CitationCheckForm.tsx` (client) | 选 query + platform + checkedAt 后跑一次 |
| `components/geo/CitationTrendChart.tsx` (RSC) | inline SVG 趋势图（3 条线：mention / citation / score），无 chart 库依赖 |
| `components/geo/WeeklyReport.tsx` (client) | 周报 Markdown 生成 / 复制 / 下载 |
| `app/geo/citation-monitor/page.tsx` (RSC) | 列表 + 趋势 + byPlatform 计数 + form |
| `app/geo/citation-monitor/[id]/page.tsx` (RSC) | 单条 check 详情 + 关联 query / brand 跳转 |
| `app/geo/citation-monitor/actions.ts` | `runCitationCheckAction` —— revalidate + redirect |
| `app/geo/reports/page.tsx` (RSC) | 周报视图（by brand / by platform / by query / top cited / top competitors） + Markdown 导出 |

### 7.5 与 connector 的预留接口

`CitationMonitorConnector` 当前为 mock，预留接入：

- **Browser MCP**（如 Playwright MCP / Browserless）：在 ChatGPT / Perplexity /
  Gemini 网页里模拟真实用户问题，截图 + 抽取 brand 提及。
- **Search API**：Perplexity API / OpenAI with web search / Anthropic web search
  tool —— 直接拿结构化结果。
- **Search Console**：Google Search Console 拉"web result mentions"做 ground
  truth（尤其对 Google AI Overview）。
- **Custom scraper**：自建 scraper（带 rotating proxy）抓 Google AIO 答案块。

切真实 connector 时只换 `lib/providers/<real>/connectors/citation-monitor.ts` 实现，
service 与 UI 零改动。`getCitationMonitorConnector()` 工厂切换是单一改动点。

### 7.6 Aggregates

- `computeCitationStats(targetBrandUrls?)`：`{ totalChecks, mentionRate,
  citationRate, averageGeoScore, byPlatform }`。`citationRate` = `citedUrl` 命中
  `targetBrandUrls` 之一的占比。
- `computeTrend({ queryId?, platform?, targetBrandUrls? })`：按 `checkedAt`
  日期聚合 → 每日 `mentionRate / citationRate / averageGeoScore / count`。
  趋势图直接消费这个。
- `generateWeeklyReport({ startDate, endDate, brandEntityId?, targetBrandUrls? })`：
  返回 `{ totalChecks, mentionRate, citationRate, averageGeoScore,
  byPlatform, byQuery, trend, topCitedUrls, topCompetitors }`。周报页面
  / Markdown 导出都消费这个。

### 7.7 与其它模块的桥接

- `AIQueryBankItem`：`queryId` 强引用；service 校验存在性。bank item 的
  `query` 文本传给 connector 作为"问什么"；`brandEntityId` 决定目标 brand。
- `BrandEntityProfile`：从 `query.brandEntityId` 拉 brand；`officialLinks`
  用作 `targetBrandUrls` 算 citationRate。
- `GEO_ENGINE.md` 后续迭代：可加 `Competitor` 类型，把
  `competitorMentions` 自由文本升级为强引用，链接到 `BrandEntityProfile`。
- `Iteration Layer`：周报里识别出的"哪条 query 长期 0% mention"是
  ImprovementLog（`targetType='citation_query'`）的天然输入。
- `Learning Loop`：`launchResultService` 跑完上线 → `lessonService` 复盘 →
  "AI 答案里没提到我们" 是高频 lesson；可对接 citation monitor 的
  0%-mention query list。

## 8. 页面入口

| 路由 | 用途 | 过滤参数 |
|---|---|---|
| `/geo/brands` | 全部 profile 列表 | `?category=&projectId=&entityId=` |
| `/geo/brands/new` | 新建 profile | `?projectId=&entityId=` 预填 |
| `/geo/brands/[id]` | 详情 + 编辑 + 删除 | — |
| `/geo/queries` | AI Query Bank 列表 | `?brandEntityId=&intent=&platform=&priority=&status=` |
| `/geo/queries/new` | 新建 + 批量生成（双入口） | `?brandEntityId=&assetId=` 预填 |
| `/geo/queries/[id]` | 详情 + 编辑 + 删除 | — |
| `/geo/content-assets` | Content Asset Library 列表 | `?brandEntityId=&type=&minScore=` |
| `/geo/content-assets/new` | 新建内容资产 | `?brandEntityId=&queryId=` 预填 |
| `/geo/content-assets/[id]` | 详情 + 编辑 + 删除 + Markdown 报告 | — |
| `/geo/optimizer` | GEO Content Optimizer：7 维审计 + 9 桶建议 + Markdown 报告 | `?assetId=` 预选 |
| `/geo/citation-monitor` | AI 引用监控列表 + 趋势图 + form | `?queryId=&platform=&brandEntityId=` |
| `/geo/citation-monitor/[id]` | 单条 check 详情 + 关联 query / brand | — |
| `/geo/reports` | GEO 周报（by brand / by platform / by query / top cited / top competitors） + Markdown 导出 | `?brandEntityId=&start=&end=` |

## 9. 与其它模块的桥接

### 9.1 与 Knowledge Graph Entity

`relatedEntityIds: string[]` 指向 `GraphEntity.id`。service 校验存在性。
详情页把 GraphEntity 的 `name` / `kind` 一并展示，并提供"打开 graph entity"链接。
这让"品牌"和"图谱里的实体"可以双向跳转。

### 9.2 与 MVP Project

`relatedProjectIds: string[]` 指向 `MVPProject.id`。service 校验存在性。
详情页把 MVPProject 的 `name` / `stage` 一并展示，并提供"打开 mvp"链接。
当 profile 新建 / 更新 / 删除时，`revalidatePath` 会刷新所有关联 MVP 详情页。

### 9.3 与 Iteration Layer

`ImprovementLog.targetType` 当前只支持 `prompt` / `loop` / `score_model` / `other`。
未来可加 `brand_profile` 类型，引用 `BrandEntityProfile.id`，让"品牌策略本身"也能迭代。

### 9.4 与 GEO Optimizer / AI

`GEOContentAsset` / `AIQuery` / `CitationCheckResult` 是 GEO engine 已经在跑的
"AI 引用监控"层。`BrandEntityProfile` 提供"被监控对象"的结构化信息，让 LLM
生成的 GEO 建议（`LLMProvider.generateGEOSuggestions(brand, queries)`）能拿到
更准确的 `keyClaims` / `competitors` / `proofPoints` 作为 prompt 上下文。

## 10. Mock 数据

[`mock-data/geo.ts`](mock-data/geo.ts) 内置 6 个 `BrandEntityProfile`：

| id | name | category | 项目 | 实体 |
|---|---|---|---|---|
| `profile_cvo` | Cognitive Venture OS | product | 3 MVP | 3 entity |
| `profile_profound` | Profound | brand | — | 2 entity |
| `profile_otterly` | Otterly | product | — | 1 entity |
| `profile_krishna_ip` | Krishna · Founder Avatar | ip | 1 MVP | 1 entity |
| `profile_geo_consulting` | Cognitive GEO Advisory | service | — | 1 entity |
| `profile_geo_marketplace` | GEO Tool Marketplace | platform | — | 1 entity |

覆盖全部 6 个 `category` 值；3 个有 MVP 引用；6 个有 graph entity 引用；竞品
互相出现在对方列表（CVO 把 Profound 当竞品，Profound 也把 CVO 当竞品）。

8 条 `AIQueryBankItem` 覆盖 4 个 brand（CVO 4 条 / Profound 2 条 / Otterly 1 条 / GEO Consulting 1 条），
9 个 intent 之中的 7 个（informational / comparison / pricing / how_to / review / alternative / recommendation），
5 个 platform 之中的 5 个（ChatGPT / Perplexity / Gemini / Google AI Overview / Claude），
4 个 priority 之中的 4 个（urgent / high / medium / low），
3 个 status 全部覆盖（active / paused / archived）。

6 条 `ContentAsset` 覆盖 4 个 brand（CVO 3 条 / Profound 1 条 / Otterly 1 条 / GEO Consulting 1 条），
9 个 type 中的 6 个（research_report / comparison_page / faq / landing_page / case_study），
GEO score 跨度 38-88，4/6 资产有 targetQueryIds，4/6 资产有 structuredEvidence。

3 条 `GEOAudit` 覆盖 3 种 inputType（research_report / faq / landing_page）× 3 条不同 content asset，
GEO score 跨度 38.1-88.7，7 维均落在 [0, 100] 整数范围，每条都填满 9 桶建议。

22 条 `AICitationCheck` 覆盖 3 个 query（CVO 定义 / CVO 价格 / Otterly 评测）× 5 平台
（chatgpt 5 / perplexity 5 / gemini 4 / google_ai_overview 4 / claude 3 = 22），
时间跨度 2026-06-12 → 2026-06-25 共 14 天。mention rate ≈ 81%（18/22），
citation rate ≈ 50%（11/22 含目标 URL），平均 geoScore ≈ 51。

## 11. 与 provider 的预留接口

`BrandEntityProfile` 当前是**纯手填**。未来可以加：

- `LLMProvider.suggestBrandProfile(input)`：基于一段自由文本（"我在做一个 AI-native GEO 工具，面向 SMB 营销团队"）自动生成 profile 草稿。
- `Connector` 拉取外部品牌信息（Twitter bio / LinkedIn / CrunchBase / Product Hunt）自动填表。
- GEO Content Asset 的 `targetQueries` 自动从 `BrandEntityProfile.keyClaims` 派生。

这些都先预留接口，service 改写不影响 UI。

AI Query Bank 的 `LLMProvider.generateAIQueryBankDraft` 当前是 mock（基于 brand.name + intent + platform + 索引
hash 出确定性内容，`priorityScore` 50-99 之间）。切真实 LLM 时只换 `lib/providers/<real>/llm.ts` 实现，
service 零改动。

## 12. 已知限制 / 后续 TODO

- **没接 GEOBrandEntity**：当前 profile 和 GEOBrandEntity 完全独立。后续加
  `GEOBrandEntity.profileId?` 反向引用，并在 GEO 监控页面显示"这个 brand 在 profile 里的官方定位"。
- **competitors 是自由文本**：竞品名重复、别名合并、竞品 ↔ GraphEntity 关联都还没做。
  建议加 `relatedCompetitorEntityIds?: string[]` 字段，把竞品链接到 GraphEntity。
- **keyClaims / proofPoints 没有版本**：跟 `PromptVersion` 一样，未来可加
  `ClaimVersion` / `ProofVersion` 让 claim 本身可迭代。
- **多对多绑定**：`relatedProjectIds` / `relatedEntityIds` 是手填数组，
  没有双向校验（删除 profile 不会清理 MVP 详情上的引用，但删除 MVP/Entity
  会在 profile 详情显示 "not found"）。
- **没建 dashboard 入口**：`/geo` 路由还没有 page（v0.1 早期未做）。当前
  入口在 `/geo/brands` 列表头，跨链到 `/geo/brands/[id]` 详情。
- **AI Query Bank ↔ AIQuery 弱关联**：bank item 没有反向引用到 AIQuery。
  当前的关联是字符串匹配（`AIQuery.text` 与 `AIQueryBankItem.query`），未来可加 `AIQuery.bankItemId?` 强引用。
- **ContentAsset 与 v0.1 GEOContentAsset 双轨**：v0.1 仍由 `AIQueryBankItem.linkedAssetIds`
  引用（不可破坏），v2 由 `ContentAsset.targetQueryIds` 反向回查 bank item。两边数据
  目前不互通；后续可做 `linkedAssetIds` 兼容读取 v0.1 + v2。
- **structuredEvidence 表单只收 claim**：`source` / `quote` 字段已在类型里支持，
  但当前 form 暂不收集（textarea 一行一项 claim）。后续可加每条 evidence 单独编辑区。
- **ContentAssetConnector 暂未实现**：`registerContentAssetConnector` 入口已就绪，
  但当前没有具体 connector。MVP 阶段 service 直接走 mock 路径。
- **bank item 没有版本**：和 BrandEntityProfile 一样，priority / status / linkedAssetIds
  改动不留 history。后续可加 `AIQueryBankItemVersion` 做 priority 重新打分的 audit trail。

- **GEOAuditScoringModel 暂未实现**：`registerGEOAuditScoringModel` 入口已就绪，
  但当前没有具体模型实现。MVP 阶段 service 直接用 mock GEOProvider.analyzeContentAsset 算分。
  未来接真实 LLM 评分时只换实现，调用方零改动。
- **Optimizer 不校验跨实体引用**：runGEOAudit 不校验 `asset.targetQueryIds` 里的
  bank item 存在性（service 只校验 `assetId`）。如果 bank item 被删，audit
  里 `targetQueries` 会被静默过滤掉，不会报错。后续可加 strict 校验开关。
- **§6.2 第 8 桶位空缺**：用户给的 9 桶建议里有 1 号、2 号、…、7 号、9 号；8 号
  故意空缺（与编号对齐），类型里没有 `extraSuggestions` 字段。如需补 8 号桶，
  在 `GEOAuditSuggestions` 加一个字段并同步更新 service 校验 + mock provider。
- **Append-only 没有"重跑"入口**：当前 optimizer 页面没有"基于历史 audit 改
  inputType 重跑"的 UI —— 每次都是新 audit。后续可加 `?baseAuditId=` 让用户
  在历史 audit 基础上跑新变体。

- **Citation Monitor 没接真实 connector**：当前 `CitationMonitorConnector` 是 mock
  实现（基于 hash 派生确定性结果）。Browser MCP / Search API / Search Console 的
  接入入口已就绪（`getCitationMonitorConnector` 工厂 + 接口保留），未来切真实
  只需替换 mock impl。
- **`competitorMentions` 是自由文本**：当前仅按出现顺序记 brand 名字符串。未来可
  升级为强引用 `Competitor` 类型（指向 `BrandEntityProfile`），方便做竞品
  频次分析 + 反向链接到 brand 详情。
- **`runCitationCheck` 没去重**：同一 query + platform + checkedAt（精确到毫秒）
  重复调会得到不同 id 的两条记录。当前不做 dedup。后续可加 `?dedupBy=24h` 开关。
- **`listAICitationChecksByBrand` 是 stub**：保留 `brandEntityId` 参数但当前
  不过滤（避免环依赖）。调用方应先用 `listAIQueryBankItemsByBrand` 拿 query id
  集合，再按 queryId 过滤。
- **周报不支持自然语言日期范围**：当前只接受 `YYYY-MM-DD`。未来可加
  `?range=last_7_days` / `?range=this_month` 快捷按钮。
- **没有"按竞品拆 citation rate"**：周报里只看到 topCitedUrls + topCompetitors
  两个独立列表；没做"竞品 X 被引用了多少次 / 我们被引用了多少次"对照。后续可
  加 `byCompetitor` 维度的 stats。
