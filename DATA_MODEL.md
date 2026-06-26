# DATA_MODEL — Cognitive Venture OS

> 全局类型系统说明。所有类型定义在 `types/` 目录，barrel 入口 `types/index.ts`。
> 强约束：**类型间通过 `id` 关联，禁止深度嵌套**。

## 1. 域划分（5 个 + 4 个既有）

| 域 | 文件 | 核心类型 |
|---|---|---|
| **Research** | `types/research.ts` | ResearchTopic, SourceItem, ResearchCard |
| **Graph** | `types/graph.ts` | GraphEntity, GraphRelation |
| **Opportunity** | `types/opportunity.ts` | Signal, Opportunity, OpportunityEvaluation |
| **MVP** | `types/mvp.ts` | MVPProject, LaunchResult, LessonLearned |
| **GEO** | `types/geo.ts` | GEOBrandEntity, GEOContentAsset, AIQuery, CitationCheckResult |
| 既有 · Venture | `types/venture.ts` | Venture |
| 既有 · Agent | `types/agent.ts` | Agent |
| 既有 · Integration | `types/integration.ts` | Integration |
| 既有 · Activity | `types/activity.ts` | ActivityEvent |

## 2. 核心数据流

### 2.1 主链路：研究 → 机会 → 落地

```
┌────────────────┐    提炼     ┌─────────────────┐
│  SourceItem    │────────────►│ ResearchCard    │
│ (外部资料)     │  sourceIds  │ (单条结论)       │
└────────────────┘             └─────────────────┘
        │                              │
        │ topicIds             researchCardIds
        ▼                              ▼
┌────────────────┐             ┌─────────────────┐
│ ResearchTopic  │             │   Opportunity   │ ◄──── 触发信号 Signal[]
│ (研究主题)     │             │   (商业机会)    │
└────────────────┘             └─────────────────┘
        │                              │ evaluationIds
        │ signalIds                   ▼
        ▼                      ┌─────────────────┐
┌────────────────┐             │ OpportunityEval │ (多轮评估)
│    Signal      │────────────►│ (评估快照)      │
│ (市场信号)     │ signalIds   └─────────────────┘
└────────────────┘
                                        │ mvpProjectIds
                                        ▼
                                ┌─────────────────┐
                                │   MVPProject    │
                                │  (MVP 项目)     │
                                └─────────────────┘
                                        │ launchResultIds
                                        ▼
                                ┌─────────────────┐
                                │  LaunchResult   │
                                │ (上线结果)      │
                                └─────────────────┘
                                        │ lessonIds
                                        ▼
                                ┌─────────────────┐
                                │ LessonLearned   │
                                │ (经验沉淀)      │
                                └─────────────────┘
```

### 2.2 GEO 监控回路（独立轨道）

```
┌──────────────────┐   assetIds   ┌─────────────────┐
│ GEOBrandEntity   │─────────────►│ GEOContentAsset │
│ (品牌实体)       │   queryIds   │ (内容资产)      │
└──────────────────┘              └─────────────────┘
        │                                │ citedAssetIds
        │                                ▼
        │ brandId              ┌──────────────────────┐
        │                      │ CitationCheckResult  │
        │                      │ (引用检查快照)        │
        │                      └──────────────────────┘
        │                                ▲
        ▼                                │ queryId
┌──────────────────┐                     │
│    AIQuery       │─────────────────────┘
│ (监控问题)       │  citationCheckIds
└──────────────────┘
```

### 2.3 知识图谱（横切关注点）

`GraphEntity` / `GraphRelation` 不属于主链路，是横切的能力层：
- `ResearchCard.graphEntityIds` — 卡片涉及哪些实体
- `CitationCheckResult.citedEntityIds` — AI 回答中出现了哪些实体（可能含竞品）

## 3. 关联矩阵

> 行 → 列，表示"行类型引用了列类型的 id"

|  | SourceItem | ResearchCard | GraphEntity | Signal | Opportunity | OpportunityEval | MVPProject | LaunchResult | LessonLearned | GEOContentAsset | AIQuery | CitationCheck |
|--|--|--|--|--|--|--|--|--|--|--|--|--|
| **ResearchTopic** | sourceIds | cardIds | — | signalIds | — | — | — | — | — | — | — | — |
| **SourceItem** | — | cardIds ¹ | — | — | — | — | — | — | — | — | — | — |
| **ResearchCard** | sourceIds | — | graphEntityIds | signalId | — | — | — | — | — | — | — | — |
| **Signal** | sourceIds | — | — | — | — | — | — | — | — | — | — | — |
| **Opportunity** | — | researchCardIds | — | signalIds | — | evaluationIds | mvpProjectIds | — | — | — | — | — |
| **OpportunityEval** | — | — | — | — | opportunityId | — | — | — | — | — | — | — |
| **MVPProject** | — | — | — | — | opportunityId | — | — | launchResultIds | lessonIds | — | — | — |
| **LaunchResult** | — | — | — | — | — | — | mvpProjectId | — | — | — | — | — |
| **LessonLearned** | sourceIds | — | — | — | opportunityId | — | mvpProjectId | launchResultId | — | — | — | — |
| **GEOBrandEntity** | — | — | — | — | — | — | — | — | — | assetIds | queryIds | — |
| **GEOContentAsset** | — | — | — | — | — | — | — | — | — | — | — | — |
| **AIQuery** | — | — | — | — | — | — | — | — | — | — | — | citationCheckIds |
| **CitationCheck** | — | — | citedEntityIds | — | — | — | — | — | — | citedAssetIds | queryId | — |
| **GraphEntity** | — | — | (fromId / toId) | — | — | — | — | — | — | — | — | — |
| **GraphRelation** | — | — | ✓ | — | — | — | — | — | — | — | — | — |

> ¹ SourceItem.topicIds / cardIds 是反向冗余，便于"哪些卡片引用了这条资料"查询。

## 4. 铁律

1. **每个类型必有 `id` / `createdAt` / `updatedAt`**
   - `id: string`（UUID）
   - `createdAt` / `updatedAt: string`（ISO 8601）

2. **类型间只通过 `id` 关联**
   - 反向关系用 `xxxIds: string[]` 表示
   - **禁止**把对象内嵌（如 `Opportunity.signals: Signal[]`）

3. **时间用字符串，不用 `Date` 对象**
   - 序列化友好（JSON 不丢精度）
   - mock 文件**禁止在模块顶层用 `new Date()`**（见 R0-3）

4. **metadata 字段用 `Record<string, string | number | boolean>`**
   - 不允许 `any`
   - 限定基本类型保证可序列化

5. **类型与 mock 解耦**
   - `types/` 永远是被引用方
   - `mock-data/` 引用 `types/`，但反之不行

## 5. 既有类型的边界

新增 5 个域与既有 4 个类型**不强制耦合**。当前没有任何新类型引用 Venture / Agent / Integration / ActivityEvent.id。

未来扩展点（不在本次范围）：
- `Venture.id` 可以被 `MVPProject` 引用，表示"这个 MVP 服务于哪个 venture"
- `ActivityEvent.kind` 可以扩展为 `'research' | 'opportunity' | 'geo' | ...`，把 telemetry 串起来
- `Agent.id` 可以是 `ResearchTopic.ownerId` / `MVPProject.ownerId` 的实际指向

## 6. 状态机

需要业务层校验的转换：

```
ResearchTopicStatus:    open → in_progress → closed → archived
OpportunityStatus:      candidate → validating → pursuing → parked
                                       ↓
                                     killed
MVPStage:               idea → scoping → building → beta → launched → iterating
                                                                    ↓
                                                                 killed
GEOAssetStatus:         draft → published → updated → retired
```

## 7. 文件索引

```
types/
├── index.ts                barrel
├── venture.ts              Venture + Stage / Health
├── agent.ts                Agent + Status / Provider
├── integration.ts          Integration + Status / Kind
├── activity.ts             ActivityEvent + Kind
├── research.ts             ResearchTopic / SourceItem / ResearchCard
├── graph.ts                GraphEntity / GraphRelation
├── opportunity.ts          Signal / Opportunity / OpportunityEvaluation
├── mvp.ts                  MVPProject / LaunchResult / LessonLearned
└── geo.ts                  GEOBrandEntity / GEOContentAsset / AIQuery / CitationCheckResult
```

合计 **10 文件 / 33 个类型**（15 主类型 + 18 辅助枚举 / 接口）。
