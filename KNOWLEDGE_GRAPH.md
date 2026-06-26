# Knowledge Graph

> Cognitive Venture OS 的知识图谱子模块。基于 2026-06-25 代码状态。

## 1. 目标

把"研究主题/资料/卡片"中提到的实体沉淀为可管理的图谱节点，支持：

- 实体 CRUD（创建 / 编辑 / 删除 / 列表 / 详情）
- 按 **type 筛选**（12 个 GraphEntityKind 之一）
- 按 **tag 搜索**（不区分大小写子串匹配）
- 把实体绑定到 **ResearchCard**（双向视图：card.graphEntityIds ↔ entity.linkedResearchCardIds）

下游模块（research cards、signals、opportunities）继续通过 `graphEntityIds` / `linkedResearchCardIds` 反查；本页是 operator 视角的"图谱节点工作台"。

**MVP 范围：实体 CRUD + 绑定卡片。关系边（GraphRelation）当前只读（mock 数据），不提供编辑 UI。**

## 2. 数据模型

复用 `types/graph.ts` 中的 `GraphEntity`，**扩展**而非新建：

| 字段 | 来源 | 说明 |
|---|---|---|
| `id` | 既有 | UUID |
| `name` | 既有 | 一句话实体名（列表 / 详情显示用），必填 1-200 字符 |
| `kind` | **扩展** | 12 个枚举值（见下） |
| `aliases` | 既有 | 别名 / 拼写变体（用于实体消歧），每项 ≤ 100 字符，≤ 10 项 |
| `description?` | 既有 | 业务描述（UI 直接显示） |
| `metadata` | 既有 | 自由属性，值限定为 `string \| number \| boolean`，key 匹配 `/^[a-zA-Z_][a-zA-Z0-9_]*$/` |
| `tags` | **新增** | 自由标签，service 规范化（lowercase / 空格→`-` / 截断 32 / 去重 / ≤ 20） |
| `linkedResearchCardIds` | **新增** | 反向引用：哪些 `ResearchCard.graphEntityIds` 包含本 `entity.id`。**由 service 在 read 时从 cards 派生**（mock 数据先填 `[]`） |
| `createdAt` / `updatedAt` | 既有 | ISO 8601 |

### 12 个 GraphEntityKind

| kind | 含义 | 例子 |
|---|---|---|
| `company` | 公司 | Perplexity / OpenAI / Anthropic / Google / CVO |
| `product` | 产品 | SearchGPT / Claude |
| `person` | 人物 | Krishna（论文一作） |
| `technology` | 技术 / 协议 | llms.txt / MCP |
| `ip` | 知识产权 / 方法论 | GEO / AARW 原则 |
| `market` | 市场 | GEO SaaS Market 2026 / AI Search Global |
| `trend` | 趋势 | Citation Economy / Zero-Click Search |
| `investor` | 投资方 | Sequoia / a16z |
| `character` | 角色 | Operator / Research Lead |
| `content_asset` | 内容资产 | GEO Paper (Krishna 2023) / AARW Blog |
| `platform` | 平台 | ChatGPT Platform / Perplexity App |
| `tool` | 工具 | Otterly / Profound |

**变化说明**：原有 `kind` 联合只有 6 个值（person / company / technology / concept / event / other）。扩展为 12 个值；原 2 个 `concept` 实体（entity_geo、entity_aarw）映射为 `ip`，原 5 个 `company` / 1 个 `person` / 2 个 `technology` 不变。`event` 和 `other` 已从联合中删除（mock 数据无使用）。

## 3. 分层

```
app/graph/entities/
  page.tsx               ← 列表 (RSC, ?type= ?q= query string)
  new/page.tsx           ← 创建表单
  [id]/page.tsx          ← 详情 + 编辑 + bind/unbind card
  actions.ts             ← 'use server' 入口

components/graph/        ← 表现层
  EntityTypeBadge.tsx    — 12 个 type 的 badge + KIND_LABEL_MAP
  EntityList.tsx         — 表格（Name / Type / Tags / Cards / Updated）
  EntityForm.tsx         — 'use client' 创建 / 编辑表单
  BindCardControl.tsx    — 'use client' bind/unbind card 操作

lib/services/
  graphEntityService.ts  ← 业务规则层
    listEntities() / getEntity() / listEntitiesByKind()
    searchEntitiesByTag(query)            — tag 子串匹配
    listEntitiesFiltered({ kind, tagQuery }) — 组合筛选
    createEntity(input) / updateEntity() / deleteEntity()
    bindCardToEntity(entityId, cardId)     — 一次性写两侧
    unbindCardFromEntity(entityId, cardId) — 一次性写两侧

lib/repos/
  knowledge-graph.ts     ← 数据访问层 (CRUD + listByKind + listRelationsByEntity)

mock-data/
  knowledge-graph.ts     ← 种子数据 (18 entities, 12 relations, 覆盖 12 kinds)
```

**关键约束：**

- UI / actions **只** import `lib/services/graphEntityService` 和 `app/graph/entities/actions`
- UI 永远 **不** 直接 import `lib/repos/*` 或 `mock-data/*`
- `linkedResearchCardIds` **不** 走 repo：service 在 read 时从 `ResearchCard.graphEntityIds` 派生；mock 数据里 `entity.linkedResearchCardIds = []` 占位
- AI 解析 / 抽取 / 图谱补全 = 走 `lib/providers/research.ts` 的 `expandGraph()`（不强制 service 使用）

## 4. 业务规则（service 层）

| 规则 | 行为 |
|---|---|
| name 必填 | 1-200 字符，trim 后判空 |
| kind 必填 | 必须 ∈ 12 个 GraphEntityKind 之一（service 兜底枚举校验） |
| aliases 规范化 | trim / 去空 / 去重 / 上限 10 / 单项 ≤ 100 字符 |
| tags 规范化 | lowercase / 空格→`-` / 截断 32 / 去重 / 上限 20 |
| metadata | key 匹配 `/^[a-zA-Z_][a-zA-Z0-9_]*$/`、≤ 64 字符；value 必须 `string \| number \| boolean` |
| linkedResearchCardIds | 不允许 patch 覆盖；read 时由 service 从 cards 派生 |
| bind card | 幂等：已绑定则 noop；同时更新 `card.graphEntityIds` 和 entity 反向视图 |
| unbind card | 幂等：未绑定则 noop；同步两侧 |
| 删除保护 | 当前未实现（entity 可被硬删，关联 cards 不会级联清理 graphEntityIds）—— 见 §9 TODO |

错误通过 `GraphEntityServiceError` 抛出，UI 在 `useTransition` 中捕获展示。

## 5. 页面

| 路由 | 类型 | 渲染 | 说明 |
|---|---|---|---|
| `/graph/entities` | ƒ Dynamic | RSC + GET form | 列表 + 12 个 type chip + tag 搜索（?q=） |
| `/graph/entities/new` | ○ Static | RSC + 客户端 form | 创建表单 |
| `/graph/entities/[id]` | ƒ Dynamic | RSC + 客户端 form + BindCardControl | 详情（只读 context 卡）+ 绑卡 UI + 编辑 + 删除 |

**Type 筛选模式**：每个 type chip 是 `<Link href="/graph/entities?type=...">`，active 态高亮。chip 数字显示该 type 的**全量**计数（与 tag 过滤无关），方便用户看到每个 type 有多少。

**Tag 搜索模式**：`<form method="get">` 提交 `?q=`，RSC 读 `searchParams.q` → 调 `listEntitiesFiltered({ tagQuery })`。type 过滤 + tag 搜索可叠加。

**绑卡模式**：详情页 "Bind research card" 卡片内：
- select 列出所有 **未绑** 的 card（按 topicId 过滤可作为后续 TODO）
- "Bind" 按钮 → `bindCardAction(entityId, cardId)` → `bindCardToEntity()` → `updateResearchCard({ graphEntityIds: [...prev, entityId] })`
- 已绑 card 列表每行有 "Unbind" 按钮 → `unbindCardAction(entityId, cardId)` → `unbindCardFromEntity()`

## 6. linkedResearchCardIds 派生策略

这是本模块的核心设计选择：**entity 字段存在但不允许通过 patch 写入**。

```
            ┌──────────────────────────────────────────┐
            │              ResearchCard                │
            │   graphEntityIds: string[]  ← source     │
            └────────────┬─────────────────────────────┘
                         │ (scan all cards on read)
                         ▼
            ┌──────────────────────────────────────────┐
            │              GraphEntity                 │
            │   linkedResearchCardIds: string[]        │
            │   （derived view，不存）                  │
            └──────────────────────────────────────────┘
```

- **写入方向**：UI / service 永远只 patch `card.graphEntityIds`；entity 字段不被 patch 接受
- **读取方向**：service 一次性 `Promise.all([_repoList(), listResearchCards()])`，用 `buildLinkedCardsIndex(cards)` 算出 `Map<entityId, cardId[]>`，再 map 回 entity
- **一致性**：永远一致，因为 entity 字段是 view，不可能 drift

切到 Supabase 时：
- repo 把 `updateGraphEntity` 改成 `UPDATE graph_entities SET ... WHERE id = ?`（不接受 `linkedResearchCardIds` 字段）
- service 的派生逻辑改为 `JOIN research_cards ON graph_entity_ids @> ARRAY[entity.id]`，或者定义 SQL view

## 7. 与 Research Card 模块的耦合

- `ResearchCard.graphEntityIds: string[]`（既有）
- `GraphEntity.linkedResearchCardIds: string[]`（新增，由 §6 策略派生）
- `bindCardToEntity` 走 `updateResearchCard` 写 `card.graphEntityIds`；**不**直接改 entity 字段
- 删 card 时**未**级联清理 entity 反查视图（service 策略：entity 派生是 view，cards 删了视图自然空）
- 删 entity 时**未**级联清理 card.graphEntityIds（见 §9 TODO）

## 8. 接入真实后端

切到 Supabase 时：

1. `lib/repos/knowledge-graph.ts` 函数体换成 Supabase 查询（保留签名）
2. `graph_entities` 表（id, name, kind, aliases, description, metadata jsonb, tags, created_at, updated_at）
3. `research_cards.graph_entity_ids text[]` 已存在；service 派生逻辑用 view 或 join 替代
4. service 的 `GraphEntityServiceError` 翻译 Supabase 错误
5. `mock-data/knowledge-graph.ts` 保留作为 seed / fixture

切到真实图谱后端（Neo4j / Memgraph / FalkorDB）时：

1. 把 `lib/repos/knowledge-graph.ts` 改写为对应 driver
2. `expandGraph()` 走 graph-native query（CYPHER 等）
3. service 接口签名稳定即可，UI 零改动
4. MVP 阶段不上 graph DB；保持 mock + JSON 数组

## 9. 已知限制 / TODO

- **没接图谱可视化**：当前只有列表 + 详情，没有 force-directed graph view（可后续用 react-force-graph 等）
- **没接 graph provider AI**：`ResearchProvider.expandGraph()` 接口已就位，service 暂未调用；后续可在 `bindCardToEntity` 后异步触发图谱补全
- **没有 GraphRelation 编辑 UI**：关系边在 mock 数据中，UI 只读
- **没有删除保护**：删除 entity 时**未**清理 `card.graphEntityIds` 中的引用（应后续加 service 级 "删 entity 前先把所有 card.graphEntityIds 里的此 id 移除"）
- **没有 metadata 类型强制**：当前 form 输入解析只支持 `string`（key:value 格式），UI 不支持 number / boolean 编辑（service 校验会拒绝）
- **没有按 alias / name 搜索**：当前 tag 搜索只匹配 `tags`，不匹配 `name` / `aliases`（UI 加输入框 + service 扩 search 即可）
- **没有 bulk import**：没有 CSV / JSON 批量导入
- **没有"从 ResearchCard 反向查 entity"列表**：card 详情页未显示"哪些 entities 引用了我"（数据层 `graphEntityIds` 可用，UI 待补）
- **`/graph/entities` 列表页是 Dynamic（ƒ）**：因为用了 `searchParams`。可改为 RSC + 客户端 form 切 static（`/research/sources` 用了同样模式保持 dynamic）


# Knowledge Graph — Relations

> Cognitive Venture OS 的关系边子模块。基于 2026-06-25 代码状态。

## 1. 目标

把图谱中两个 GraphEntity 之间的有向关系变成可管理工作流：每条关系有自己的类型、强度、证据、绑卡列表。

- 看列表（按 type 过滤 / 按 entity 过滤）
- 看详情（含 source/target 反查、strength、evidence、绑卡）
- 创建 / 编辑 / 删除
- 绑定 ResearchCard（手动管理，与 entity 派生策略不同）

下游模块（research cards）继续通过 `linkedResearchCardIds` 反查；本页是 operator 视角的"关系边工作台"。

**MVP 范围：关系 CRUD + 绑卡。没有 graph 可视化、bulk import、auto-inference。**

## 2. 数据模型

复用 `types/graph.ts` 中的 `GraphRelation`，**重构字段**而非新建：

| 字段 | 来源 | 说明 |
|---|---|---|
| `id` | 既有 | UUID |
| `sourceEntityId` | **重命名** | 源 GraphEntity.id（原 `fromId`） |
| `targetEntityId` | **重命名** | 目标 GraphEntity.id（原 `toId`） |
| `relationType` | **替换** | 12 个 GraphRelationKind 之一（原 `kind`） |
| `strength` | **替换** | 0..100 整数（原 `weight` 0..1） |
| `evidence?` | 既有 | 自然语言描述 / URL |
| `linkedResearchCardIds` | **新增** | 手动管理（与 entity 模块派生策略不同，详见 §7） |
| `createdAt` / `updatedAt` | 既有 | ISO 8601 |

### 12 个 GraphRelationKind

| kind | 语义（source → target） | 例子 |
|---|---|---|
| `competes_with` | 竞争 | perplexity → openai |
| `invested_by` | 被投资 | perplexity → sequoia |
| `built_by` | 由...构建 | mcp → anthropic |
| `uses` | 使用 | perplexity → llms_txt |
| `belongs_to` | 属于 | operator → cvo |
| `growing_in` | 在...中增长 | geo_saas_2026 → ai_search_global |
| `mentioned_in` | 被...提及 | aarw → geo_paper |
| `supports` | 支持 | aarw → geo_market_2026 |
| `contradicts` | 与...矛盾 | （mock 数据未覆盖） |
| `influences` | 影响 | citation_economy → zero_click |
| `similar_to` | 相似于 | openai → anthropic |
| `alternative_to` | 替代 | otterly → profound |

**重要变化**：
- 字段重命名：`fromId / toId / kind / weight` → `sourceEntityId / targetEntityId / relationType / strength`
- 旧 `GraphRelationKind` 10 个值全部被替换：`acquired / partners_with / invests_in / built_on / related_to / cites / authored_by / other` 全部删除或重映射
- 方向语义变化：`invests_in` 改为 `invested_by`（A→B = A 被 B 投资），mock 数据中所有 `invests_in` 关系的方向已翻转
- `built_on` 改为 `built_by`（A→B = A 由 B 构建，方向保留）
- `cites / authored_by / partners_with` 分别映射为 `mentioned_in / built_by / similar_to`

## 3. 分层

```
app/graph/relations/
  page.tsx               ← 列表 (RSC, ?type= ?entity= query string)
  new/page.tsx           ← 创建表单
  [id]/page.tsx          ← 详情 + 编辑 + bind/unbind card
  actions.ts             ← 'use server' 入口

components/graph/        ← 表现层
  RelationTypeBadge.tsx     — 12 个 relationType 的 badge + KIND_LABEL_MAP
  RelationStrengthBar.tsx   — 0-100 强度进度条
  RelationList.tsx          — 表格（Type / Source→Target / Strength / Cards / Updated）
  RelationForm.tsx          — 'use client' 创建 / 编辑表单（type select + source select + target select + strength slider/number + evidence + linked card IDs）
  RelationBindCardControl.tsx — 'use client' bind/unbind card 操作

lib/services/
  graphRelationService.ts   ← 业务规则层
    listRelations() / getRelation()
    listRelationsByType(type)
    listRelationsByEntity(entityId)
    listRelationsFiltered({ relationType, entityId, minStrength }) — 组合筛选
    createRelation(input) / updateRelation() / deleteRelation()
      校验 source/target 引用存在性、禁止 self-loop、约束 strength ∈ [0, 100]
    bindCardToRelation(relationId, cardId)     — 手动管理
    unbindCardFromRelation(relationId, cardId) — 手动管理

lib/repos/
  knowledge-graph.ts        ← 数据访问层（entity + relation CRUD + listBy* 全部塞这里）
mock-data/
  knowledge-graph.ts        ← 18 entities, 16 relations（覆盖 10 个 relationType）
```

**关键约束**：

- UI / actions **只** import `lib/services/graphRelationService` 和 `app/graph/relations/actions`
- UI 永远 **不** 直接 import `lib/repos/*` 或 `mock-data/*`
- `lib/repos/knowledge-graph.ts` 同时承担 entity + relation 两个聚合根的 CRUD——分文件会让 mock 层导入变冗余
- relation 创建 / 更新都要求 source ≠ target（self-loop 在 repo + service 双重拦截）
- `linkedResearchCardIds` **手动管理**（不派生）—— 详见 §7

## 4. 业务规则（service 层）

| 规则 | 行为 |
|---|---|
| sourceEntityId 必填 | 引用必须存在于 `GraphEntity`（service 校验） |
| targetEntityId 必填 | 引用必须存在于 `GraphEntity`（service 校验） |
| self-loop 禁止 | source === target 抛 `GraphRelationServiceError` |
| relationType 必填 | 必须 ∈ 12 个 GraphRelationKind 之一 |
| strength | 0..100 整数，自动 round（默认 50） |
| evidence optional | trim 后判空 → undefined；≤ 2000 字符 |
| linkedResearchCardIds | 手动管理；service 规范化（trim / 去空 / 去重 / ≤ 50） |
| bind card | 幂等；已绑定则 noop；直接写 relation 字段 |

错误通过 `GraphRelationServiceError` 抛出，UI 在 `useTransition` 中捕获展示。

## 5. 页面

| 路由 | 类型 | 渲染 | 说明 |
|---|---|---|---|
| `/graph/relations` | ƒ Dynamic | RSC | 列表 + 12 个 type chip + entity 过滤（?entity=） |
| `/graph/relations/new` | ○ Static | RSC + 客户端 form | 创建表单（type / source / target / strength / evidence / linked card IDs） |
| `/graph/relations/[id]` | ƒ Dynamic | RSC + 客户端 form + BindCardControl | 详情（只读 context + source/target 跳 entity）+ 绑卡 UI + 编辑 + 删除 |

**Type 筛选模式**：12 个 chip 之一点击后 `?type=...`，active 态高亮。chip 计数显示该 type 的**全量**计数（与 entity 过滤无关）。

**Entity 过滤模式**：`?entity=entity_xxx` 显示所有 source 或 target 包含该 entity 的关系。详情页里的 source/target 链接会带上这个参数，operator 可以从 entity 详情"看这个 entity 参与了哪些关系"。

**Strength 编辑器**：用 `<input type="range">` + 旁置数字输入框，双向同步。和 CardScoreBar 用同一套视觉（0-100 进度条，< 40 红色 / < 70 黄色 / ≥ 70 绿色）。

## 6. 与 Entity 模块的耦合

- 关系 source / target 都引用 `GraphEntity.id`；service 层在 create / update 时校验引用存在性
- 删除 entity 时**未**级联清理关系（service 策略：保留 orphan 关系，UI 用 `text-danger (missing)` 标记源/目标缺失的关系）
- entity 详情页未提供"我参与了哪些关系"反查链接（`/graph/relations?entity=xxx` 已经支持，entity 详情页加个跳转链接是后续 TODO）
- entity 列表 / 详情 / 关系列表 / 详情之间通过 4 个双向 Link 串联

## 7. linkedResearchCardIds：手动 vs 派生（关键差异）

Entity 模块和 Relation 模块都有 `linkedResearchCardIds: string[]` 字段，但**管理策略不同**：

| 模块 | 策略 | 原因 |
|---|---|---|
| `GraphEntity.linkedResearchCardIds` | **派生视图** | Service 在 read 时从 `ResearchCard.graphEntityIds` 计算，mock 数据里字段为 `[]` 占位；不可能 drift |
| `GraphRelation.linkedResearchCardIds` | **手动管理** | 关系"讨论"某张卡片的语义不显然（需要 source 和 target 都在 card 里才算？还是任一在？），索性让 operator 手动 bind；UI 提供 bind/unbind 控件直接写字段 |

**派生策略不用于关系的原因**：

1. 关系 vs 卡片的关系是"卡片是否讨论这条边"，与卡片 vs 实体的关系（"卡片是否提到该实体"）不同
2. 如果用"两端都在 card 里"作为派生规则，会丢失只引用一端的卡片（例如"card 只提到 perplexity，但讨论了 perplexity → openai 竞争关系"）
3. 如果用"任一端在 card 里"作为派生规则，会让几乎所有相关 card 都自动 link 上，operator 无法手动断开

**手动管理的一致性保证**：

- 字段直接存于 mockData（不是 view）
- 每次 bind/unbind 都走 `service.bindCardToRelation / unbindCardFromRelation`（幂等）
- UI 显示真实存储的字段，不派生

切到 Supabase 时：relation 表加 `linked_card_ids text[]` 列直接存。无需 view / trigger。

## 8. 接入真实后端

切到 Supabase 时：

1. `lib/repos/knowledge-graph.ts` 拆成 `entity-repo.ts` + `relation-repo.ts`（或保留同文件，函数体改 Supabase 调用）
2. `graph_relations` 表（id, source_entity_id, target_entity_id, relation_type, strength, evidence, linked_card_ids, created_at, updated_at）
3. source/target 引用 `graph_entities.id`，加 FK 约束
4. self-loop 约束：CHECK (source_entity_id != target_entity_id)
5. service 的 `GraphRelationServiceError` 翻译 Supabase 错误
6. mock-data 保留作为 seed / fixture

切到真实图谱后端（Neo4j / Memgraph / FalkorDB）时：

1. `lib/repos/knowledge-graph.ts` 改写为对应 driver
2. 关系边用 graph-native `(source)-[r:relationType]->(target)` 模式建模
3. `strength` 存为 edge property，`evidence` 存为 edge property
4. `linked_card_ids` 仍然是边 property（关系 ↔ 卡片是 M:N，但 mock 简化为 relation 上的列表）
5. service 接口签名稳定即可，UI 零改动

## 9. 已知限制 / TODO

- **没接图谱可视化**：列表是表格，没有 force-directed graph view（react-force-graph 之类）
- **没接 graph provider AI**：`ResearchProvider.expandGraph()` 接口已就位，service 暂未调用（mock 里有 stub 实现）
- **删除 entity 未级联清理关系**：删 entity 后关系可能变 orphan（UI 用红色 (missing) 标记）
- **没有 relation 搜索**：只支持 type chip + entity 过滤；没有按 evidence / strength range 搜索的 UI
- **没有"从 ResearchCard 反向查 relation"列表**：card 详情页未显示"哪些关系绑定了这张卡"（数据层 `relation.linkedResearchCardIds` 可用，UI 待补）
- **没有 bulk import**：没有 CSV / JSON 批量导入
- **bind card 接受任意 cardId 字符串**：UI 从卡片列表选，但 service / actions 没校验 cardId 必须存在于 `ResearchCard`（除了 actions 入口处多走了一次 `getResearchCard` 校验；mock 场景下不会 drift）
- **`graph-relations` 与 `graph-entities` 没合并侧边导航**：两个 list 页面各放一个 cross-link，operator 知道两边切换；后续可在 Sidebar 加一个"Graph"父项
- **`/graph/relations` 列表页是 Dynamic（ƒ）**：因为用了 `searchParams`，与 entity 列表一致

---

# Knowledge Graph — Simplified View (`/graph`)

## 1. 目标

提供一个**轻量级图谱视图**（卡片 + 列表 + 关系表），让用户从「实体 + 关系」两个维度快速浏览当前知识图谱，过滤后导出 Markdown。

不引入任何图谱可视化库（Cytoscape / vis-network / react-flow / d3-force 等）。
保留未来接入的接口位（`lib/visualization/index.ts` 的 `GraphVisualizationAdapter`）。

## 2. 页面

`/graph`（Dynamic — 依赖 `searchParams`）

URL 参数：
- `entityType` — 12 个 `GraphEntityKind` 之一
- `relationType` — 12 个 `GraphRelationKind` 之一
- `entityId` — 选中实体 id，触发右侧详情面板

## 3. 布局

```
Header
  [Knowledge graph · N entities · M relations · (filters)]    [Graph view · Entities · Relations | Export Markdown]
Filters card
  [Entity type: All(18) Company(3) Product(4) …]
  [Relation type: All(17) competes_with(3) …]
Graph canvas placeholder
  [data-graph-canvas — visualization adapter interface reserved]
Layout
  左 5/12                                         │  右 7/12
  ─────────────────────────────────────────────── │  ─────────────────────────────────────────
  Entities header (N)  [Clear focus]              │  (no entityId) 提示语
  Entity card grid (1 col mobile, 2 col sm+)      │  (entityId)  Entity header card
  • Card: name + type + relation count + tags     │              Outgoing relations table
  • Click → /graph?entityId=<id>                  │              Incoming relations table
```

## 4. 数据流

```
URL searchParams
  → app/graph/page.tsx (Server Component)
    → 解析 + 校验 entityType / relationType / entityId
    → listEntities() + listRelations()  (service 层)
    → server 端过滤：
        - filteredEntities: 按 entityType
        - filteredRelations: 按 relationType
        - relationCountByEntityId: 上述范围内每个实体的 outgoing+incoming
        - selected: entityId 对应实体
        - outgoing / incoming: 选中实体的两类关系（在 filteredRelations 内）
    → 把上述快照作为 props 传给 <GraphMarkdownExportButton />
    → 把过滤后数组传给 <EntityCardGrid /> 与 <EntityRelationsPanel />
```

**所有过滤在 server 端完成**。客户端组件只做点击跳转（`<Link>`）和
markdown 序列化（避免和 server 端过滤逻辑分叉）。

## 5. 组件

| 文件 | 类型 | 职责 |
|---|---|---|
| `app/graph/page.tsx` | Server | 顶层页面，过滤 + 数据装配 |
| `components/graph/GraphFilters.tsx` | Client | entity type chips + relation type chips（保持 `entityType` / `relationType` / `entityId` 在切换时一致） |
| `components/graph/EntityCard.tsx` | Server | 单张实体卡，点击 → `?entityId=` |
| `components/graph/EntityCardGrid.tsx` | Server | 卡片网格（grid 1col / 2col） |
| `components/graph/EntityRelationsPanel.tsx` | Server | selected entity 的 outgoing / incoming 关系表 |
| `components/graph/GraphMarkdownExportButton.tsx` | Client | 接收 server 端数据，生成 markdown Blob 并下载 |
| `components/graph/GraphCanvasPlaceholder.tsx` | Server | 视觉占位条，标注 `data-graph-canvas` 挂载点 |
| `lib/export/graphMarkdown.ts` | 纯函数 | `buildGraphMarkdown()` — 序列化器 |
| `lib/visualization/index.ts` | 接口 stub | `GraphVisualizationAdapter` + `NoopGraphVisualizationAdapter` |

## 6. Markdown 导出格式

`buildGraphMarkdown(input)` 输出结构：

```markdown
# Knowledge Graph Export

- Generated at: 2026-06-25T12:00:00.000Z
- Filters: entity type = company; relation type = competes_with
- Selected entity: **Anthropic** (ent_xxx)
- Total entities: 3
- Total relations: 8

## Selected entity
### Anthropic
- Type: Company
- Description: ...
- Tags: `ai`,`frontier`
- Updated: 2026-06-25

### Outgoing relations (3)
| Source | Relation | Target | Strength | Evidence |
| --- | --- | --- | --- | --- |
| Anthropic | built_by | Claude | 95 | — |

### Incoming relations (2)
...

## Entities (3)
### Company (2)
- **Anthropic** (Company) — ...
### Product (1)
- **Claude** (Product) — ...

## Relations (8)
### competes_with (3)
| Source | Relation | Target | Strength | Evidence |
| --- | --- | --- | --- | --- |
...
```

文件名格式：`graph-{entityType?}-{relationType?}-focused-2026-06-25.md`

## 7. 可视化接口位（未来扩展）

`lib/visualization/index.ts`：

```ts
export interface GraphVisualizationAdapter {
  readonly name: string;
  mount(container: HTMLElement): void;
  unmount(): void;
  setData(input: { entities: GraphEntity[]; relations: GraphRelation[] }): void;
  focusEntity(entityId: string): void;
  clearFocus(): void;
}

export class NoopGraphVisualizationAdapter implements GraphVisualizationAdapter { /* … */ }
```

接入新图谱库时：

1. 新建 `services/visualization/<provider>/index.ts`，实现 `GraphVisualizationAdapter`
2. 在 `app/graph/page.tsx` 里把 `<GraphCanvasPlaceholder />` 替换成 client
   组件，挂载时拿到 `data-graph-canvas` 容器 ref 并调用 `adapter.mount(ref.current)`
3. 数据从 service 传下去，调用 `adapter.setData({...})`
4. 卡片点击时调用 `adapter.focusEntity(id)` 实现高亮联动

## 8. 已知限制 / TODO

- **没有 force-directed 可视化**：当前仅卡片 + 列表 + 关系表；接口位已留
- **没有 relation 搜索**（按 evidence / strength range）
- **没有 entity 搜索**（按 name / alias）
- **没有「我的 relations」入口**：entity 详情页未显示"作为 source/target 的关系"反查（数据层可用，UI 待补）
- **导出 markdown 不包含 schema 字段**（id / createdAt 等）—— 输出聚焦人读友好；如需完整 JSON 备份，单独加一个 export 入口
- **导出按钮在 client 端生成 Blob**：mock 数据量小，O(N) 同步；接入真后端后需考虑 streaming 或 server-side download endpoint
- **`/graph` 是 Dynamic（ƒ）**：因为用 `searchParams`；如要 SSG 需要切到 client-side filter
- **筛选不串到 entity detail 页**：从 entity 卡片点进 `/graph/entities/<id>` 后再返回会丢失 graph 视图的筛选状态
