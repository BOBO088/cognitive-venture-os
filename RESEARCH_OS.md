# Research OS

> Cognitive Venture OS 的研究域子模块。基于 2026-06-25 代码状态。

## 1. 目标

把"研究主题"变成可管理的工作流：每个主题有自己的状态、优先级、分类、标签，operator 可以：

- 看列表（按状态 / 分类 / 标签过滤）
- 看详情（含 description / question / scope / 关联统计）
- 创建 / 编辑 / 删除

下游模块（research cards、signals、opportunities）继续通过 `topicId` 反查；本页是 operator 视角的"研究主题工作台"。

## 2. 数据模型

复用 `types/research.ts` 中已有的 `ResearchTopic`，**扩展**而非新建：

| 字段 | 来源 | 说明 |
|---|---|---|
| `id` | 既有 | UUID |
| `title` | 既有 | 一句话主题名（列表 / 详情显示用） |
| `description?` | **新增** | 业务描述（UI 直接显示） |
| `category?` | **新增** | `ai` / `ip` / `geo` / `short_video` / `saas` / `investment` / `other` |
| `priority?` | **新增** | `low` / `medium` / `high`，默认 `medium` |
| `tags?` | **新增** | 自由字符串数组，service 层规范化（trim / lowercase / 去重 / ≤ 20） |
| `question?` | 既有 | 核心研究问题（问号结尾），lightweight topic 可省略 |
| `scope?` | 既有 | 范围说明，lightweight topic 可省略 |
| `status` | **替换** | `active` / `completed` / `archived`（原 `open` / `in_progress` / `closed` / `archived`） |
| `ownerId?` | 既有 | 负责人 / agent id |
| `parentTopicId?` | 既有 | 父主题 id，支持主题树 |
| `sourceIds` | 既有 | 关联的 SourceItem id 列表 |
| `cardIds` | 既有 | 关联的 ResearchCard id 列表 |
| `signalIds` | 既有 | 由此主题产出的 Signal id 列表 |
| `createdAt` / `updatedAt` | 既有 | ISO 8601 |

**状态机：**

```
active ──► completed ──► archived
   │           │
   └───────────┘  (reopen)
   │
   └─► archived ──► active  (reopen from archive)
```

`active → archived` 直接归档；不允许 `completed → archived` 之外的反向跨级跳（service 层校验）。

## 3. 分层

```
app/research/topics/
  page.tsx               ← 列表 (RSC)
  new/page.tsx           ← 创建表单
  [id]/page.tsx          ← 详情 + 编辑
  actions.ts             ← 'use server' 入口

components/research/     ← 表现层
  TopicStatusBadge.tsx
  TopicPriorityBadge.tsx
  TopicCategoryBadge.tsx
  TopicList.tsx
  TopicForm.tsx          ← 'use client'

lib/services/
  researchTopicService.ts  ← 业务规则层
    listTopics()
    getTopic()
    createTopic(input)        — 校验 title / 规范 tags
    updateTopic(id, patch)    — 校验 status 转移
    deleteTopic(id)           — 拒绝有关联 children 的删除

lib/repos/
  research.ts               ← 数据访问层 (CRUD)

mock-data/
  research.ts               ← 种子数据 (7 topics, 含 archived + 各分类)
```

**关键约束：**

- UI / actions **只** import `lib/services/researchTopicService` 和 `app/research/topics/actions`
- UI 永远 **不** 直接 import `lib/repos/*` 或 `mock-data/*`
- service 层是**业务规则**的单一来源（标题长度、tag 规范化、status 转移、删除保护）
- repo 层是**数据访问**的单一来源，service 调用 repo，UI 调用 service

## 4. 业务规则（service 层实现）

| 规则 | 行为 |
|---|---|
| title 必填 | 1-200 字符，trim 后判空 |
| tags 规范化 | 全部 lowercase + 替换空格为 `-` + 截断 32 字符 + 去重 + 上限 20 |
| status 转移 | 见 §2 状态机，跨级跳抛 `ResearchTopicServiceError` |
| 删除保护 | 关联 `cardIds.length > 0 \|\| signalIds.length > 0` 时拒绝删除，提示改用 archive |
| 优先级默认 | 创建时未指定 → `medium` |
| 状态默认 | 创建时未指定 → `active` |

错误通过自定义 `ResearchTopicServiceError` 抛出，UI 在 `useTransition` 中捕获并展示。

## 5. 页面

| 路由 | 类型 | 渲染 | 说明 |
|---|---|---|---|
| `/research/topics` | ○ Static | RSC | 列表 + 状态统计 + 新建按钮 |
| `/research/topics/new` | ○ Static | RSC + 客户端 form | 创建表单 |
| `/research/topics/[id]` | ƒ Dynamic | RSC + 客户端 form | 详情（只读上下文卡片）+ 编辑表单 + 删除 |

Sidebar 入口：Dashboard → Tasks → **Research** → Ventures → Agents → Integrations → Settings。

## 6. 接入真实后端

切到 Supabase 时只改 `lib/repos/research.ts` 的函数体，service / actions / UI 零改动。建议步骤：

1. `lib/repos/research.ts` 把每个 `async` 函数换成 Supabase 查询（保留签名）
2. 写操作的 mutation 落 `research_topics` 表
3. service 的 `ResearchTopicServiceError` 翻译 Supabase 错误
4. `mock-data/research.ts` 保留作为 seed / fixture

## 7. 已知限制 / TODO

- **没有搜索 / 过滤**：列表只按 updatedAt 倒序，没有按 status / category / tags 过滤的 UI（service 已经在 sort，可加 query 入口）
- **没有关联 children 编辑 UI**：topic 详情页只显示 card / source / signal 的 *数量*，不提供跳转到 children 的链接（数据层已经反查可用，UI 待补）
- **没有批量操作**：删除是单条；如需批量删除，加一个 `deleteTopics(ids: string[])` 即可
- **状态机警告而非硬阻止**：考虑用 `warn` 而非 `throw` 让 operator 重置时不被卡住（需要用户拍板）
- **没接 provider 层**：`researchTopicService` 当前不调用 `ResearchProvider`（`lib/providers/research.ts`），后续可在 `createTopic` 后异步触发 `extractInsights` 预热

---

# Source Library

> Cognitive Venture OS 的资料源管理子模块。基于 2026-06-25 代码状态。

## 1. 目标

把"研究资料"变成可管理的工作流：每条 source 独立可 CRUD、可绑定到一个 ResearchTopic、可信度可视化、支持全文搜索。

下游模块（research cards、signals、opportunities）继续通过 `sourceId` / `topicId` 反查；本页是 operator 视角的"资料库"。

## 2. 数据模型

复用 `types/research.ts` 中已有的 `SourceItem`，**重构字段**而非新建：

| 字段 | 来源 | 说明 |
|---|---|---|
| `id` | 既有 | UUID |
| `title` | 既有 | 必填 |
| `type` | **替换** | `article` / `paper` / `video` / `website` / `note` / `report` / `book` / `podcast`（原 `kind`） |
| `url?` | 既有 | 内部笔记 / 上传文件可空 |
| `topicId?` | **新增** | 主要绑定的 ResearchTopic.id，0 或 1 个 |
| `summary?` | **替换** | 一段摘要（原 `excerpt`） |
| `credibilityScore?` | **替换** | 数字 0..100（原 `credibility` 枚举） |
| `tags?` | **新增** | 自由标签，service 规范化 |
| `notes?` | **新增** | 私人笔记 |
| `author?` / `publishedAt?` | 既有 | optional metadata |
| `createdAt` / `updatedAt` | 既有 | ISO 8601 |

**重要变化**：
- `kind: 'document' | 'other'` → `type: 'website' | 'note' | 'book' | 'podcast'`（更贴用户语汇）
- `topicIds: string[]` → `topicId?: string`（单绑定；多 topic 共享用同 URL 多条源或后续 `additionalTopicIds`）
- `excerpt` → `summary`，`credibility` (low/medium/high) → `credibilityScore` (0..100)

## 3. 分层

```
app/research/sources/
  page.tsx                ← 列表 + 搜索 (RSC, ?q= query string)
  new/page.tsx            ← 创建表单
  [id]/page.tsx           ← 详情 + 编辑
  actions.ts              ← 'use server' 入口

components/research/      ← 表现层
  SourceTypeBadge.tsx
  SourceCredibilityBar.tsx
  SourceList.tsx
  SourceForm.tsx          ← 'use client'

lib/services/
  sourceService.ts        ← 业务规则层
    listSources() / getSource() / listSourcesByTopic() / listSourcesByType()
    searchSources(query)  — 跨 title / summary / notes / author / tags 子串匹配
    createSource(input)   — 校验 title / type / url / credibility / topicId 引用
    updateSource(id, patch)
    deleteSource(id)

lib/repos/
  research.ts             ← 数据访问层（含 source CRUD + search + listByTopic）

lib/providers/connectors/
  source.ts               ← SourceConnector 接口（保留给 RSS / Browser MCP / 抓取 / 上传）
lib/providers/mock/connectors/
  source.ts               ← 确定性 mock 实现
```

**关键约束**：

- UI / actions **只** import `lib/services/sourceService` 和 `app/research/sources/actions`
- UI 永远 **不** 直接 import `lib/repos/*` 或 `mock-data/*`
- `lib/providers/connectors/source.ts` 是 **预留** 接口：service 当前不强制使用，未来可注入做"粘贴 URL → 预填表单"快捷创建

## 4. 业务规则（service 层）

| 规则 | 行为 |
|---|---|
| title 必填 | 1-300 字符 |
| type 必填 | 必须 ∈ `article/paper/video/website/note/report/book/podcast` |
| url 格式 | `^https?://...`（optional） |
| credibilityScore | 数字 ∈ [0, 100]，自动 round（optional） |
| topicId 引用 | 必须引用 `ResearchTopic` 中已存在的 id |
| tags 规范化 | 全部 lowercase / 空格→`-` / 截断 32 / 去重 / 上限 20 |
| 搜索 | 不区分大小写子串匹配：title / summary / notes / author / tags |

错误通过 `SourceServiceError` 抛出，UI 在 `useTransition` 中捕获展示。

## 5. 页面

| 路由 | 类型 | 渲染 | 说明 |
|---|---|---|---|
| `/research/sources` | ○ Static | RSC + GET form | 列表 + 搜索（?q=）+ bound/standalone 计数 |
| `/research/sources/new` | ○ Static | RSC + 客户端 form | 创建表单 |
| `/research/sources/[id]` | ƒ Dynamic | RSC + 客户端 form | 详情（含跳转到绑定 topic）+ 编辑 + 删除 |

**Search 模式**：`<form method="get">` 提交 `?q=`，RSC 读 `searchParams.q` → 调 `searchSources(q)`。无需 client-side fetch。

**跨模块导航**：
- `/research/topics` 头部新增 `Source library →` 链接
- `/research/sources` 头部新增 `← Topics` 链接

## 6. 未来 Source Connector

`SourceConnector` (`lib/providers/connectors/source.ts`) 是预留接口，**MVP 阶段 service 不依赖**。预定的 4 种实现：

| 实现 | 入口 | 用途 |
|---|---|---|
| RSS reader | `fetchRssFeed(feedUrl)` | 订阅 feed，批量入候选源 |
| Browser MCP | `fetchFromUrl(url)` | 渲染 JS 后抽取 metadata（应对 SPA / 反爬） |
| 网页抓取 | `fetchFromUrl(url)` | 轻量 HTTP 抓取（cheerio / readability） |
| 文件上传 | `fetchFromUpload({name, content})` | 解析 PDF / docx / md |

service 接入示例（未来）：

```ts
// 注入 connector，让 createSource 支持 "URL → 预填" 快捷路径
export async function createSourceFromUrl(
  url: string,
  topicId: string | undefined,
  connector: SourceConnector = await getSourceConnector(),
): Promise<SourceItem> {
  const draft = await connector.fetchFromUrl(url);
  if (!draft) throw new SourceServiceError(`could not fetch: ${url}`);
  return createSource({
    title: draft.title,
    type: draft.type,
    url: draft.url ?? url,
    summary: draft.summary,
    tags: draft.suggestedTags,
    credibilityScore: draft.suggestedCredibilityScore,
    topicId,
  });
}
```

切到真实实现时只换 `createMockSourceConnector` → `createRealSourceConnector`（如 `createFirecrawlSourceConnector` / `createRssSourceConnector`），调用方零改动。

## 7. 与 Research Topic 模块的耦合

- `SourceItem.topicId` 引用 `ResearchTopic.id`
- `sourceService.createSource` / `updateSource` 校验 `topicId` 引用存在性
- 删除 topic 时**未**级联删除 source（service 策略：孤儿 source 允许存在，operator 可重新绑定）
- 未来加删除保护：当 source 被某 research card 引用时拒绝删除 source（与 topic 的删除保护对称）

## 8. 已知限制 / TODO

- **搜索是子串匹配**，不是 full-text；数据规模上去后应换 PG FTS 或 OpenSearch（接口签名稳定即可）
- **单 topic 绑定**：未来如需多 topic，加 `additionalTopicIds: string[]` 字段，service / UI 增量更新
- **没有批量导入**：未来通过 `SourceConnector.fetchRssFeed` 实现 RSS 一键入库
- **没有 Source → Card 链接 UI**：Source 详情页未显示"哪些 cards 引用了我"（数据层 `sourceIds` 反查可用，UI 待补）
- **没有"快速创建"按钮**：UI 只有完整表单，没有"粘贴 URL → connector 预填"的快捷路径（connector 已就位，UI 接入留待后续）


# Research Card

> Cognitive Venture OS 的研究卡片子模块。基于 2026-06-25 代码状态。

## 1. 目标

把 SourceItem / ResearchTopic 浓缩成"可独立消费、可在 dashboard 滚动、可独立打分"的研究卡片。
每张卡片 = 一段核心摘要 + 关键洞察 + 证据 + 风险 + 重要性评分 + 标签 + 关联 source/topic。

下游模块（signals、opportunities）继续通过 `cardId` / `topicId` 反查；本页是 operator 视角的"研究沉淀"。

## 2. 数据模型

复用 `types/research.ts` 中已有的 `ResearchCard`，**重构字段**而非新建：

| 字段 | 来源 | 说明 |
|---|---|---|
| `id` | 既有 | UUID |
| `topicId` | 既有 | 所属 ResearchTopic.id（必填） |
| `sourceIds` | 既有 | 引用的 SourceItem.id 列表（**移到必填位置**） |
| `title` | 既有 | 卡片标题，必填 |
| `summary` | **替换** | 核心摘要（原 `body`），必填 1-2000 字符 |
| `keyInsights?` | **新增** | 关键洞察列表，每条独立可消费 |
| `evidence?` | **新增** | 证据列表：数据 / 引用 / 链接 |
| `risks?` | **新增** | 风险提醒：可证伪点 / 反例 / 局限 |
| `tags?` | 既有 | 自由标签，service 规范化 |
| `score?` | **替换** | 重要性评分 0..100（原 `confidence` 0..1） |
| `graphEntityIds?` / `signalId?` | 既有 | optional 深度链接 |
| `createdAt` / `updatedAt` | 既有 | ISO 8601 |

**重要变化**：
- `body: string` → `summary: string`（必填、长度上限 2000）
- `confidence: number` (0..1) → `score: number` (0..100，整数)
- 新增 `keyInsights` / `evidence` / `risks` 三个列表字段

## 3. 分层

```
app/research/cards/
  page.tsx               ← 列表 (RSC)
  new/page.tsx           ← 创建（含 AI 草稿预填 / 一步式生成）
  [id]/page.tsx          ← 详情 + 编辑 + Markdown 导出按钮
  actions.ts             ← 'use server' 入口

components/research/     ← 表现层
  CardScoreBar.tsx       — 0-100 进度条
  CardList.tsx           — 表格 + topic 反链
  CardForm.tsx           — 'use client'，3 种 genMode
  CardMarkdownDownload.tsx — 'use client'，Blob 触发下载

lib/services/
  researchCardService.ts  ← 业务规则层 + AI 编排
    listCards() / getCard()
    listCardsByTopic() / listCardsBySource()
    createCard(input) / updateCard() / deleteCard()
    generateCardDraftFromSource(source)    — 调 LLMProvider
    generateCardDraftFromTopic(topic, ids) — 调 LLMProvider
    createCardFromSource(source, topicId)  — 一步式（生成 + 入库）
    createCardFromTopic(topic, ids)        — 一步式（生成 + 入库）
    exportMarkdown(card)                   — 纯函数

lib/repos/
  research.ts             ← 数据访问层 (CRUD, listResearchCards / createResearchCard / ...)

lib/providers/llm.ts      ← LLMProvider 接口 + CardDraft 类型
lib/providers/mock/llm.ts ← 确定性 mock（hash 驱动 score 40..100）
```

**关键约束：**

- UI / actions **只** import `lib/services/researchCardService` 和 `app/research/cards/actions`
- UI 永远 **不** 直接 import `lib/repos/*` / `mock-data/*` / `lib/providers/*`
- AI 生成能力 **必须** 走 LLMProvider；service 只做编排（规范化 + 入库），不写提示词 / 调 SDK
- Markdown 导出是 **纯函数**（`exportMarkdown(card)`），无副作用；UI 用 client-side Blob 触发下载
- `form[data-card-form]` 标识主表单，genMode 区域在它**外面**（避免嵌套 form）

## 4. 业务规则（service 层）

| 规则 | 行为 |
|---|---|
| title 必填 | 1-300 字符，trim 后判空 |
| summary 必填 | 1-2000 字符，trim 后判空 |
| topicId 引用 | 必须引用 `ResearchTopic` 中已存在的 id |
| score | 数字 ∈ [0, 100]，自动 round（optional） |
| tags 规范化 | 全部 lowercase / 空格→`-` / 截断 32 / 去重 / 上限 20 |
| keyInsights / evidence / risks | 每项 trim + 去重 + 上限 20 |
| LLM 草稿 | 走 `getLLMProvider().generateCardDraftFrom{Source,Topic}`，service 拿到后做 normalize（trim/validate）再入库 |

错误通过 `ResearchCardServiceError` 抛出，UI 在 `useTransition` 中捕获展示。

## 5. 页面

| 路由 | 类型 | 渲染 | 说明 |
|---|---|---|---|
| `/research/cards` | ○ Static | RSC | 列表 + 计数（with topic / avg score） + 新建按钮 |
| `/research/cards/new` | ○ Static | RSC + 客户端 form | 创建（含 AI 草稿） |
| `/research/cards/[id]` | ƒ Dynamic | RSC + 客户端 form | 详情（只读 context 卡 + Markdown 导出 + 编辑表单 + 删除） |

**三种创建模式**（在 `/research/cards/new` 通过 CardForm 的 genMode toggle）：

1. **blank**：纯手工填写
2. **from-source**：选一条 source → 调 `generateCardDraftFromSource` → 预填表单 → operator 修改 → Save
3. **from-topic**：选一个 topic → 调 `generateCardDraftFromTopic(topic, topic.sourceIds)` → 预填表单 → operator 修改 → Save

**一步式（One-click: generate + save）**：
genMode = from-source / from-topic 时启用，绕过表单直接调 `createCardFromSource/Topic` → 拿到 id → 跳详情页。用于"快速沉淀、不修细节"的场景。

## 6. LLMProvider 扩展

为支持卡片生成，LLMProvider 接口扩展如下：

```ts
export interface LLMProvider {
  // ... 既有方法（health / summarizeSource / generateResearchCard / scoreOpportunity / ...）

  /** 从一条 SourceItem 生成结构化卡片草稿（不含 id / 时间戳）。 */
  generateCardDraftFromSource(source: SourceItem): Promise<CardDraft>;

  /** 从 topic + 关联 sourceIds 生成结构化卡片草稿。 */
  generateCardDraftFromTopic(
    topic: ResearchTopic,
    sourceIds: string[],
  ): Promise<CardDraft>;
}

export interface CardDraft {
  title: string;
  summary: string;
  keyInsights: string[];
  evidence: string[];
  risks: string[];
  tags: string[];
  score: number;       // 0..100
}
```

**CardDraft 故意不携带** `id` / `topicId` / `sourceIds` / `createdAt` / `updatedAt` / `graphEntityIds` / `signalId` —— 这些由 service 补齐，避免 LLM 幻觉生成脏 id。

**Mock 实现**（`lib/providers/mock/llm.ts`）：
- `generateCardDraftFromSource`：`hash32(source.id)` 派生 score ∈ [40, 100)，从 `source.tags` 抓前 3 个拼成 `tags`
- `generateCardDraftFromTopic`：`hash32(topicId + sourceIds)` 派生 score ∈ [50, 100)，从 `topic.tags` 抓前 3 个
- 关键洞察 / 证据 / 风险都是固定模板字符串
- 输出基于输入可重现（确定性 mock）

切到真实 OpenAI / Anthropic SDK 时只换 `lib/providers/mock/llm.ts` → `lib/providers/openai/llm.ts`，service / actions / UI 零改动。

## 7. Markdown 导出

`service.exportMarkdown(card)` 是纯函数，渲染示例：

```markdown
# GEO 定义与边界

**Tags:** `definition` `geo` `seo`

**Score:** 90/100

**Topic:** `topic_geo_market_2026`
**Sources:** `src_geo_paper_krishna`

## Summary

Generative Engine Optimization (GEO) 指针对生成式 AI 搜索/回答引擎优化品牌可见度的实践...

## Key insights

- GEO 是 SEO 的继任者...
- 论文 2023 年首次提出...

## Evidence

- Krishna et al. (2023) 论文: arxiv.org/abs/2311.09735

## Risks

- 定义尚未标准化...

---

id: `card_geo_definition`
created: 2026-04-13T09:00:00.000Z
updated: 2026-04-13T09:00:00.000Z
```

UI 端 `CardMarkdownDownload` 用 Blob + `URL.createObjectURL` 触发浏览器下载，文件名 `card-{id}.md`，**不**走 server action（更轻、无网络往返）。

## 8. 跨模块导航

- `/research/topics` 头部新增 `Research cards →` 链接
- `/research/sources` 头部新增 `Research cards →` 链接
- `/research/cards` 头部有 `← Topics` / `Source library` 链接
- `/research/cards/[id]` 详情页中：
  - topic 反链 → `/research/topics/[id]`
  - source 反链 → `/research/sources/[id]`

## 9. 已知限制 / TODO

- **sourceIds 没做引用校验**：service 只校验 `topicId` 引用，未校验 `sourceIds` 中每条都存在于 `SourceItem`（mock 数据是闭合的，没问题；接真实 DB 时需在 repo 层加 FK 约束）
- **没有 card 搜索 / 过滤**：列表只按 updatedAt 倒序，没有按 score / tags / topic 过滤（service 已经在 sort，可加 query 入口）
- **没有"从 topic 详情页 → 该 topic 的 cards"反查链接**：topic 详情页只显示 card *数量*，不提供跳转到 cards 的链接（数据层可用，UI 待补）
- **没有批量操作**：删除是单条
- **没有 card 版本历史**：编辑后旧版本丢失（mock 不存历史，真实 DB 可加 `research_card_versions` 表）
- **没有"从 source 详情页 → 引用我的 cards"反查链接**：service 已有 `listCardsBySource()`，UI 接入留待后续
- **CardForm 的 one-click 路径只支持 from-source / from-topic**：blank 模式无"快速生成"按钮
- **LLMProvider 是 mock**：所有"AI 摘要"内容是 hash 派生的模板字符串，切真实 LLM 时需要评估 prompt 模板

## 10. 接入真实后端

切到 Supabase 时只改 `lib/repos/research.ts` 的 `createResearchCard` / `updateResearchCard` / `deleteResearchCard` / `listResearchCards` / `getResearchCard` 函数体，service / actions / UI 零改动。

切到真实 LLM 时只改 `lib/providers/mock/llm.ts` → `lib/providers/openai/llm.ts`（或 anthropic），`CardDraft` 接口签名稳定即可。需要在 `lib/env.ts` 加 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 读取。
