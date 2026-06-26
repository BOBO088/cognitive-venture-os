# GEO Metrics

> Cognitive Venture OS — GEO Engine 的 7 个运营指标。
> 目标：把"品牌在 AI 搜索里是否被引用"变成可观测、可对比、可优化的数字。

## 0. 范围

- 7 个指标全部由 `lib/services/citationMonitorService.computeGeoMetrics()` 产出。
- 数据源：mock 阶段 = `mock-data/geo.ts`；真实阶段 = `CitationMonitorConnector` + `SearchConsoleConnector` + `BrowserMCPConnector`。
- 指标汇总页面：`/geo/metrics`（默认显示第一个 brand，可通过 `?brandEntityId=` 切换）。
- 指标消费方：`/geo/citation-monitor`、`/geo/reports` 之外的统一观测入口。

## 1. 7 个指标速查

| # | 指标 | 单位 | 含义 | 健康阈值 |
|---|---|---|---|---|
| 1 | `brandMentionRate` | 0-1 | 答案里提到目标 brand 的比例 | ≥ 50% |
| 2 | `citationRate` | 0-1 | 引用 URL 命中 brand 官方链接的比例 | ≥ 30% |
| 3 | `competitorMentionRate` | 0-1 | 答案里出现 ≥1 个竞品的比例 | ≤ 50% |
| 4 | `answerInclusionRate` | 0-1 | 答案文本含 brand canonicalName 或任何 alias 的比例 | ≥ 60% |
| 5 | `queryCoverage` | 0-1 | active bank items 中有 ≥1 次 check 的比例 | ≥ 80% |
| 6 | `contentFreshnessDays` | days | 关联内容资产平均 `updatedAt` 距今的天数 | ≤ 60 天 |
| 7 | `entityConsistency` | 0-1 | 答案里出现 brand canonicalName（不是 alias）的比例 | ≥ 80% |

> 注：`brandMentionRate` 与 `mentionRate` 是同一个数值的两个名字。后者是
> `WeeklyReport` 旧字段的别名；迁移完成后只保留 `brandMentionRate`。

## 2. 每个指标的细节

### 2.1 brandMentionRate

- **公式**：`checks.filter(c => c.mentioned).length / checks.length`
- **数据源**：`AICitationCheck.mentioned`（人工录入 / mock connector 派生 / 未来 Browser MCP 自动检测）
- **含义**：所有引用检查里，AI 答案提到目标 brand 的比例。
- **高 / 低意味着什么**：
  - 高：品牌在 AI 答案里持续被讨论。
  - 低：品牌"在 AI 答案里缺位"——可能因为 a) 没有足够内容；b) 内容里没出现 brand 名；c) 竞品挤占了位次。
- **行动建议（低时）**：
  - 审核 `contentAssetService`：确保每个 AIQueryBankItem 都有 ≥1 个 `targetQueryIds` 资产。
  - 让 canonicalName + ≥1 alias 出现在每篇公开文章的 title / 第一段 / FAQ。
  - 跑一轮 `geoOptimizerService.analyzeAsset` 看哪些资产"没提 brand"。

### 2.2 citationRate

- **公式**：`checks.filter(c => c.citedUrl && brand.officialLinks.includes(c.citedUrl)).length / checks.length`
- **数据源**：`AICitationCheck.citedUrl` + `BrandEntityProfile.officialLinks`
- **含义**：被 AI 答案引用的 URL 里，命中 brand 官方链接的比例。
- **高 / 低意味着什么**：
  - 高：AI 直接把 brand 资产当成"第一手信源"——这是最强的 GEO 信号。
  - 低：AI 引用了第三方（Wikipedia / Crunchbase / 竞品）但没引用你。
- **行动建议（低时）**：
  - 在 `ContentAsset` 上加可解析的 FAQ 段落 + 数据 / 引文，使 AI 更容易把整页当成 source of truth。
  - 把核心资产的 URL 提交到 Google Search Console 加速索引（未来接 `SearchConsoleConnector.fetchUrlInspection`）。
  - 用 `BrowserMCPConnector.runQuery` 复测，看是不是"第三方 SEO 比自家 SEO 强"。

### 2.3 competitorMentionRate

- **公式**：`checks.filter(c => c.competitorMentions.length > 0).length / checks.length`
- **数据源**：`AICitationCheck.competitorMentions`
- **含义**：AI 答案里出现竞品名（≥1 个）的比例。
- **高 / 低意味着什么**：
  - 高：AI 把这个 query 归类为"竞品对比"赛道，且没把我们当主要选项。
  - 低：这是个"无人区"或者你已经占据主要位次。
- **行动建议（高时）**：
  - 用 `opportunityService` 起一条新的 opportunity：研究竞品内容结构 + 价格 + 客户类型。
  - 写 comparison / alternative 类资产，主动把"为什么我们 vs 竞品"讲清楚。
  - 注意：竞品出现的比率不是越低越好——对比型 query 必然出现竞品，关键是"你也在列表里"。

### 2.4 answerInclusionRate

- **公式**：`checks.filter(c => answerIncludes(c, brand.name) || answerIncludesAlias(c, brand.aliases)).length / checks.length`
- **数据源**：`AICitationCheck.answerSummary` + `BrandEntityProfile.name` + `BrandEntityProfile.aliases`
- **含义**：答案文本里能找到 brand 名（canonical 或 alias）的比例。
- **高 / 低意味着什么**：
  - 高：AI 答案里"看得到我们"——是 `brandMentionRate` 的更严格版本（连"间接被引用"也算）。
  - 低：可能 AI 用了 weasel word 描述，或者品牌名拼写差异太大。
- **行动建议（低时）**：
  - 在 GEO Optimizer 输出里看 `entityConsistency` 拆分：低 inclusion 可能是 brand 名字写法不一致。
  - 把 brand name / alias 加到 article 的 schema.org `name` / `alternateName` 里。

### 2.5 queryCoverage

- **公式**：`bankItems.filter(q => q.status === 'active' && checksForQ(q) >= 1).length / bankItems.filter(q => q.status === 'active').length`
- **数据源**：`AIQueryBankItem.status='active'` + `AICitationCheck.queryId`
- **含义**：active bank items 中，至少有 1 次 citation check 的比例。
- **高 / 低意味着什么**：
  - 高：监控网覆盖完整。
  - 低：很多 active 的问题没在跑——可能 scheduler 没配，可能 query 被忘了。
- **行动建议（低时）**：
  - 在 `aiQueryService.listAIQueryBankItems()` 里过滤 `status='active'` 但 `citationCheckIds` 为空 / 少的项。
  - 调整 `QuerySchedule`（daily / weekly / monthly）补齐遗漏。
  - 把"长期 0 check" 的 bank item 移到 `paused` / `archived`。

### 2.6 contentFreshnessDays

- **公式**：`avg((referenceDate - contentAsset.updatedAt) for asset in brand.contentAssets)`，单位天
- **数据源**：`ContentAsset.updatedAt`（v2 字段；`lastUpdated` 单独表示内容本身刷新时间）
- **含义**：品牌关联内容资产平均"距今多少天没更新"。
- **高 / 低意味着什么**：
  - 低（< 30 天）：内容持续维护。
  - 高（> 90 天）：老内容，AI 引擎对它的"新鲜度信号"会衰减，可能被新的第三方内容替换。
- **行动建议（高时）**：
  - 跑 `geoOptimizerService.analyzeAsset` 给每条 stale asset 出改稿建议。
  - 重新发布到同样的 URL（更新 `updatedAt` 即可，无需改 URL 结构）。
  - 在 `ImprovementLog` 里登记"stale asset refresh"作为下一次 loop 的输入。

### 2.7 entityConsistency

- **公式**：`checks.filter(c => answerSummary.includes(brand.name.toLowerCase())).length / checks.length`
- **数据源**：`AICitationCheck.answerSummary` + `BrandEntityProfile.name`（只看 canonical，**不**算 alias）
- **含义**：答案里 AI 用的是 brand canonical name 的比例。
- **高 / 低意味着什么**：
  - 高：AI 已经把 brand 认作"标准实体"——这是 entity authority 的核心信号。
  - 低：AI 用变体 / 拼错 / 加描述词——可能影响 entity 关联、schema 收录。
- **行动建议（低时）**：
  - 在官网、Wikipedia、Crunchbase、GitHub README、社交账号都把 canonicalName 设为统一写法。
  - 在 `BrandEntityProfile.description` 第一段用 canonicalName 自我介绍。
  - 用 `BrowserMCPConnector.runQuery` 跑 5 个平台，看哪种"变体"出现最多。

## 3. 阈值背后的依据

阈值是经验值，不是绝对。**调整方法**：

1. 用同一 brand 跑 4 周真实数据 → 看 weekly 指标分布。
2. 把 p25 / p50 / p75 记录到 `learning/lessons` 的 `scoreModelSuggestion` 字段。
3. 在 `GEO_METRICS.md` 这一节更新阈值（不要直接写死在 `computeGeoMetrics` 里——那是公式，不是策略）。

## 4. 后续可补的指标（不在本 MVP）

| 候选 | 含义 | 接入路径 |
|---|---|---|
| `topAnswerRank` | 答案里 brand 出现的位次（1=第一） | AIQuery 加 `position` 字段 |
| `sentimentScore` | brand 在答案里的情感（pos/neu/neg） | LLMProvider 加 `scoreSentiment` |
| `crossPlatformAgreement` | 5 个平台口径一致程度 | 多平台 check 后的 stat |
| `freshnessDecay` | 上次 refresh 后指标下降斜率 | 引入时间序列 |

## 5. 跨文档链接

- 实现：`lib/services/citationMonitorService.ts` → `computeGeoMetrics()`
- 页面：`app/geo/metrics/page.tsx`
- 测试：`lib/services/citationMonitorService.test.ts` → `describe('computeGeoMetrics')`
- 周报：`/geo/reports`（已包含 `mentionRate` / `citationRate` 历史数据）
- 监控：`/geo/citation-monitor`（每条 check 是上面指标的 raw 数据点）
- GEO 整体心智模型：`GEO_ENGINE.md`

**v2 品牌字段限制**：当前 v2 `BrandEntityProfile` 没有 `canonicalName` / `aliases` 拆分（只在 v0.1 `GEOBrandEntity` 存在）。所以：
- `answerInclusionRate` 和 `entityConsistency` 都用 `brand.name` 作为匹配键
- 暂时两者在 v2 数据下数值相同
- v3 brand 拆出 `canonicalName` / `aliases` 后，`entityConsistency` 会重新只算 canonicalName 命中，剔出 alias 命中部分
