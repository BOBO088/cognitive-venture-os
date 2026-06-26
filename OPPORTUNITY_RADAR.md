# Opportunity Radar

> Signal Engine MVP 文档。`/opportunities/signals/*` 路由族。
> 基于 2026-06-25 代码扫描。

## 1. 目标

把外部世界的市场信号（融资、产品发布、监管、招聘、GitHub trending、用户痛点……）结构化录入，支撑后续的：

- 机会识别（多 Signal 提炼为 Opportunity）
- 评估（ScoringProvider 喂入）
- GEO/竞品研究（与 GraphEntity 关联）
- 论文/报告引用（与 ResearchCard 关联）

非目标：
- 自动从外部源拉数据（保留 connector 接口位，由未来的 GitHub / RSS / News / MCP 实现）
- Signal → Opportunity 的自动转化（手动，由人/agent 完成）

## 2. 数据模型

`Signal`（types/opportunity.ts）：

```ts
interface Signal {
  id: string;
  title: string;             // 1-200 字符
  source: string;            // 1-500 字符；URL / connector name / "manual"
  category: SignalCategory;  // 11 个枚举值
  description: string;       // ≤ 4000 字符
  evidence: string;          // ≤ 2000 字符
  confidence: number;        // 0-100 整数
  linkedEntityIds: string[];     // 手动绑定 GraphEntity，引用必须存在
  linkedResearchCardIds: string[]; // 手动绑定 ResearchCard，引用必须存在
  createdAt: string;
  updatedAt: string;
}

type SignalCategory =
  | 'funding'
  | 'product_launch'
  | 'github_trend'
  | 'hiring_signal'
  | 'customer_pain'
  | 'regulation'
  | 'technology_breakthrough'
  | 'content_trend'
  | 'geo_trend'
  | 'ip_trend'
  | 'short_video_trend';
```

### 字段策略

| 字段 | 策略 | 说明 |
|---|---|---|
| `linkedEntityIds` | **手动管理** | UI 提供 bind/unbind 控件；service 校验引用存在；与 GraphRelation 同策略 |
| `linkedResearchCardIds` | **手动管理** | 同上 |
| `evidence` | 自由文本 | 不解析为 SourceItem；如需结构化引用，关联 ResearchCard |
| `source` | 字符串 | 不强制 URL 格式；允许 "manual"、"github-trending-connector" 等 |

## 3. 分层

```
UI (RSC + form client components)
  → app/opportunities/signals/actions.ts (server actions)
    → lib/services/signalService.ts (业务规则)
      → lib/repos/opportunities.ts (内存 mock 存储)
        → mock-data/opportunities.ts
      → lib/repos/knowledge-graph.ts (校验 linkedEntityIds 引用)
      → lib/repos/research.ts (校验 linkedResearchCardIds 引用)

外部数据源接入（未来）：
  → lib/providers/connectors/signal-source.ts (SignalSourceConnector 接口)
    → lib/providers/mock/connectors/signal-source.ts (mock 实现)
    → 未来：services/signals/github/index.ts, services/signals/rss/index.ts, ...
```

## 4. 业务规则（service 层）

详见 `lib/services/signalService.ts`：

1. `title` 1-200 字符，必填
2. `source` 1-500 字符，必填
3. `category` ∈ 11 个 `SignalCategory` 之一
4. `description` 必填，≤ 4000 字符
5. `evidence` 可选，≤ 2000 字符
6. `confidence` ∈ [0, 100] 整数
7. `linkedEntityIds` / `linkedResearchCardIds` 各自去重 + 上限 50 + 引用必须存在
8. `id` 唯一性由 service 校验
9. `createdAt` / `updatedAt` 由调用方提供（service 不主动生成）

错误抛出 `SignalServiceError`（继承 `Error`）。

## 5. 页面

| 路由 | 类型 | 功能 |
|---|---|---|
| `/opportunities/signals` | ƒ Dynamic | 列表 + 11 分类 chip + min confidence 过滤 |
| `/opportunities/signals/new` | ○ Static | 创建表单 |
| `/opportunities/signals/[id]` | ƒ Dynamic | 详情（只读 context + bind 控件 + 编辑表单） |

## 6. SignalSourceConnector 接口

`lib/providers/connectors/signal-source.ts`：

```ts
export interface SignalSourceConnector {
  readonly name: string;
  health(): Promise<{ ok: boolean; provider: string; detail?: string }>;
  fetchSignals(filter?: SignalFetchFilter): Promise<Signal[]>;
  normalizeData(raw: unknown): Promise<Signal[]>;
}
```

**未来接入路径**：

1. 新建 `lib/providers/connectors/<provider>-signal-source.ts`（如 `github-signal-source.ts`），实现 `SignalSourceConnector`
2. 配套 mock：`lib/providers/mock/connectors/<provider>-signal-source.ts`
3. UI 入口（`/opportunities/signals/connectors`）展示 provider 列表 + health + last fetch time
4. scoring 等下游模块无任何改动（仍只读 `Signal[]`）

MVP 阶段：唯一实现是 `createMockSignalSourceConnector()`，从 `mock-data/opportunities.ts` 的 `mockSignals` 读出并按 filter 过滤。

## 7. 联动

- **/graph ↔ /opportunities/signals**：signal 的 `linkedEntityIds` 指向 graph entity。`/graph` 顶部 cross-link 已加。
- **/research/cards ↔ /opportunities/signals**：signal 的 `linkedResearchCardIds` 指向 research card。详情页的 bound list 直接跳到 `/research/cards/[id]`。
- **scoring 喂入**：当 Opportunity 存在时，`ScoringProvider.scoreOpportunity` 用关联的 Signal 列表做权重——`confidence` 数值经 `confidence/100 * 0.5` 归一化后叠加。

## 8. 已知限制 / TODO

- **connector 是 mock**：`/opportunities/signals` 列表显示的是 mock-data 里的条目，外部数据源接入尚未实现（接口已就位）。
- **无 connector management UI**：health、provider 列表、最后抓取时间等没有专门页面。
- **无 signal 搜索**：仅 category chip + min confidence 数字过滤；没有按 title / description 文本搜索。
- **无 signal → opportunity 一键转**：从 Signal 提炼为 Opportunity 是手动操作（未来可加一个 "Create opportunity from signals" 按钮）。
- **evidence 是自由文本**：不解析成 structured SourceItem；如要更精细的引用追踪，应在 service 层接 SourceItem。
- **`source` 字段是字符串**：没有枚举约束；未来可加 `SignalSourceKind` 枚举（url / api / manual / connector name）。
- **min confidence 用 form GET 提交**：刷新页面会丢 `category` 之外的其它 URL 状态；后续可切到 client-side filter。
- **删除 signal 不级联清理 Opportunity.signalIds**：mock 场景下会留下悬空引用；production 应在 service 层做级联。
- **bind controls 用 select + Bind 按钮**：没有"快速搜索 entity/card"；entity 数量大时下拉过长。

---

# Opportunity Radar — Opportunity Module

## 1. 目标

把「Signal + ResearchCard」提炼为一个可执行 Opportunity。Opportunity 是
Signal → MVP 中间的核心节点：包含 description / painPoint / solutionIdea
的语义结构，挂载三个域的 evidence（Signal / Card / Entity），并支撑
后续的 OpportunityEvaluation 多次评估 + MVPProject 派生。

核心流向：
```
Signal  ──┐
          ├──►  Opportunity  ──►  OpportunityEvaluation
Card    ──┘                        （ScoringProvider，多次）
Entity  ──┘
```

非目标：
- 自动从 Signal 提炼为 Opportunity（保留 LLMProvider.generateOpportunityDraft 入口，按按钮触发）
- 自动派生 MVPProject（手动，从 mvp 模块）
- Evaluation 时间序列画图（数据层就绪，UI 后续）

## 2. 数据模型

`Opportunity`（types/opportunity.ts）：

```ts
interface Opportunity {
  id: string;
  title: string;                  // 1-200
  description: string;            // 1-2000
  targetUser: string;             // 1-500
  painPoint: string;              // 1-2000
  solutionIdea: string;           // 1-2000
  status: OpportunityStatus;      // 6 个值
  relatedSignalIds: string[];          // 手动管理
  relatedResearchCardIds: string[];    // 手动管理
  relatedEntityIds: string[];          // 手动管理
  createdAt: string;
  updatedAt: string;
}

type OpportunityStatus =
  | 'draft'        // 刚识别
  | 'evaluating'   // 正在做多轮评估
  | 'validated'    // 假设已被证据支持
  | 'mvp'          // 在做 MVP
  | 'archived'     // 归档（暂缓但不放弃）
  | 'killed';      // 已放弃
```

### 字段策略

| 字段 | 策略 | 说明 |
|---|---|---|
| `relatedSignalIds` | **手动管理** | UI bind/unbind；service 校验引用存在 |
| `relatedResearchCardIds` | **手动管理** | 同上 |
| `relatedEntityIds` | **手动管理** | 同上 |
| `evaluationIds` | **已删除**（v2） | 旧版在 Opportunity 上冗余存 evaluation 列表；现在通过 `OpportunityEvaluation.opportunityId` 反查 |
| `mvpProjectIds` | **已删除**（v2） | 同上，通过 MVPProject.sourceOpportunityId 反查 |
| `hypothesis` | **已删除**（v2） | 旧版单字段；拆为 `description` + `painPoint` + `solutionIdea` 三个更细粒度字段 |

## 3. LLMProvider.generateOpportunityDraft

新增方法到 `lib/providers/llm.ts`：

```ts
generateOpportunityDraft(input: {
  signalIds: string[];
  researchCardIds: string[];
}): Promise<OpportunityDraft>
```

`OpportunityDraft`（位于 `lib/providers/llm.ts`，与 `CardDraft` 同位）：

```ts
interface OpportunityDraft {
  title: string;
  description: string;
  targetUser: string;
  painPoint: string;
  solutionIdea: string;
}
```

**不**包含 id / status / createdAt / updatedAt / relatedXxxIds —— 这些由
service / UI 在提交时补齐。

### UI 流程

1. 用户在 `/opportunities/new?signalId=<id>` 进入创建页
2. 表单的 `relatedSignalIds` textarea 已预填该 signal id
3. 点击 "Generate AI draft" 按钮 → `generateOpportunityDraftAction` →
   `LLMProvider.generateOpportunityDraft` → 拿到 draft
4. ref 写入表单的 title / description / targetUser / painPoint / solutionIdea
5. 用户审阅后调整，点击 "Create opportunity" 提交

**关键约束**：AI 段放在主 `<form>` **外部**（沿用 CardForm / RelationForm 约定），
通过 ref 而非 DOM query 通信。生成逻辑不写在 UI 里，全部走 LLMProvider。

## 4. 分层

```
UI (RSC + form client components)
  → app/opportunities/actions.ts (server actions)
    → lib/services/opportunityService.ts (业务规则)
      → lib/repos/opportunities.ts (内存 mock 存储)
        → mock-data/opportunities.ts
      → lib/repos/opportunities.ts (校验 relatedSignalIds 引用)
      → lib/repos/research.ts (校验 relatedResearchCardIds 引用)
      → lib/repos/knowledge-graph.ts (校验 relatedEntityIds 引用)

AI 生成：
  → app/opportunities/actions.ts:generateOpportunityDraftAction
    → lib/providers (getLLMProvider)
      → lib/providers/mock/llm.ts (mock 实现)
      → 未来：lib/providers/openai/llm.ts (真实实现)
```

## 5. 业务规则（service 层）

详见 `lib/services/opportunityService.ts`：

1. `title` 1-200 字符
2. `description` 1-2000 字符
3. `painPoint` 1-2000 字符
4. `solutionIdea` 1-2000 字符
5. `targetUser` 1-500 字符
6. `status` ∈ 6 个 `OpportunityStatus`
7. 三个 `relatedXxxIds` 各自去重 + 上限 50 + 引用必须存在
8. `id` 唯一性

错误抛出 `OpportunityServiceError`。

## 6. 页面

| 路由 | 类型 | 功能 |
|---|---|---|
| `/opportunities` | ƒ Dynamic | 列表 + 6 状态 chip 过滤 |
| `/opportunities/new` | ƒ Dynamic | 创建（`?signalId=<id>` 预填 + AI draft 按钮） |
| `/opportunities/[id]` | ƒ Dynamic | 详情（只读 context + 3 个 bind 控件 + 编辑表单 + 导出报告） |

## 7. Markdown 报告导出

`lib/export/opportunityMarkdown.ts` 暴露 `buildOpportunityReport(input)`。
`OpportunityReportButton` 客户端组件接收 server 端装配好的快照 → Blob 下载。

输出结构：

```markdown
# Opportunity report — GEO 监控 SaaS

- Generated at: 2026-06-25T12:00:00.000Z
- Status: MVP
- Created: 2026-05-18
- Updated: 2026-06-22
- ID: opp_geo_monitor

## Summary
- Target user: ...
- Pain point: ...

### Description
...

### Solution idea
...

## Related signals (3)
| Title | Category | Confidence | Updated |
| --- | --- | --- | --- |

## Supporting research cards (3)
| Title | Topic | Score | Updated |
| --- | --- | --- | --- |

## Related entities (2)
- Anthropic (company) — ...
- ...

---
_Auto-generated report. Edit source fields in /opportunities/<id>._
```

文件名格式：`opportunity-<id>-<YYYY-MM-DD>.md`

## 8. 联动

- **/opportunities/signals/[id] → /opportunities/new?signalId=...**：详情页有 "Create opportunity from this →" 链接。
- **/opportunities ↔ /opportunities/signals**：列表 header 互链。
- **scoring 喂入**：`ScoringProvider.scoreOpportunity(opportunity, { signals, cards })` 仍可用。signals 列表可由 `opportunity.relatedSignalIds` 解析得到。

## 9. 已知限制 / TODO

- **没有 OpportunityEvaluation UI**：OpportunityEvaluation 类型已定义（types/opportunity.ts），repo 层有 `listEvaluationsByOpportunity` 接口，但详情页未渲染评估时间序列。
- **没有 status 自动流转**：status 由用户手动改；未来可加 "Validate" 按钮（基于 scoring 结果自动 evaluating → validated）。
- **AI draft 仅在 new 页面**：edit 页面没有 "regenerate" 按钮（避免覆盖人工编辑内容）。
- **AI draft 不读 signal / card 内容**：mock 实现仅基于 id 计数 + hash 生成伪内容。真实 LLMProvider 实现会先 fetch signal + card summary 再生成。
- **没有 status 过滤 ↔ signal 过滤的联合**：列表页是 status 过滤，signal 过滤在 /opportunities/signals；两个 list 互相跳转但不共享 URL 状态。
- **没有 bulk action**：无批量 status 变更。
- **没有 Opportunity ↔ MVPProject 派生 UI**：MVPProject 引用 `sourceOpportunityId`（types/mvp.ts），但 Opportunity 详情页未显示已派生的 MVPProject 列表（数据层可用，UI 待补）。
- **没有"快速从 signal 创建"快捷入口**：除 ?signalId= 链接外，signal 列表页无 "→ Opportunity" 行内按钮。
- **`painPoint` 是必填**：MVP 场景下可能没有清晰 pain point（如 hypothesis-driven opportunities）；未来可改为 optional，description 仍必填。

## 10. Evaluation Engine

> 9 维 0-100 评分 + 加权总分 + 自动 status 流转。`/opportunities/evaluations` 与
> `/opportunities/ranking` 路由族。基于 2026-06-25 代码扫描。

### 10.1 目标

把"机会 → 评分 → 进 MVP / 归档"这一段变成可追踪、可重放、可对比的流程。
每次评分都生成一条 `OpportunityEvaluation`，可观察时间序列与口径变化。

非目标：
- 自动选 opportunity（仅评分，不决策）
- 引入真实 ML 模型（当前用规则 + mock provider；接口位已留好）

### 10.2 数据模型

`OpportunityEvaluation`（types/opportunity.ts）：

```ts
interface OpportunityEvaluation {
  id: string;
  opportunityId: string;
  marketSize: number;             // 0-100 整数
  painIntensity: number;          // 0-100 整数
  competition: number;            // 0-100 整数（极性反转：100=竞争少）
  technicalFeasibility: number;
  monetization: number;
  speedToMarket: number;
  founderFit: number;
  geoPotential: number;
  ipPotential: number;
  totalScore: number;             // 0-100 浮点（1 位小数），service 重算
  explanation: string;            // 1-2000 字符
  createdAt: string;
  updatedAt: string;
}
```

### 10.3 评分权重

`SCORING_WEIGHTS`（types/opportunity.ts，与 provider 共享）：

| 维度 | 权重 | 极性 |
|---|---|---|
| marketSize | 15% | 高=好 |
| painIntensity | 15% | 高=好 |
| competition | 10% | **反转**（高=竞争少=好） |
| technicalFeasibility | 10% | 高=好 |
| monetization | 15% | 高=好 |
| speedToMarket | 10% | 高=好 |
| founderFit | 5% | 高=好 |
| geoPotential | 10% | 高=好 |
| ipPotential | 10% | 高=好 |
| **合计** | **100%** | |

### 10.4 自动 status 流转

`PROMOTE_THRESHOLD = 70`，`DEMOTE_THRESHOLD = 40`（types/opportunity.ts）。

- `totalScore >= 70` → `opportunity.status = 'mvp'`（不进 validated）
- `totalScore <  40` → `opportunity.status = 'archived'`
- 其它 → status 不变

`service.createEvaluation` / `service.updateEvaluation` 在写入后**幂等**地检查并
通过 `updateOpportunity` 改 status。`killed` 状态被排除在自动归档外（人工 kill
不会被自动覆盖回 archived）。手动在 opportunity 详情页改 status 仍可走，仅当
后续 evaluation 再次跨越阈值时才会被再次覆盖。

### 10.5 分层

```
UI (RSC + form client components)
  → app/opportunities/evaluations/actions.ts (server actions)
  → app/opportunities/ranking/page.tsx (RSC)
    → lib/services/evaluationService.ts (业务规则 + status 流转)
      → lib/repos/opportunities.ts (内存 mock 存储)
        → mock-data/opportunities.ts
      → lib/services/opportunityService.ts (跨域 status 更新)
      → lib/providers/evaluation.ts (EvaluationProvider 接口)
        → lib/providers/mock/evaluation.ts (createMockEvaluationProvider)

Ranking report 导出：
  → lib/export/evaluationRankingMarkdown.ts (buildRankingReport)
    → 客户端 Blob 下载 (RankingReportButton)
```

### 10.6 关键决策

- **service 始终重算 totalScore**：不信任 provider 的返回值。`SCORING_WEIGHTS`
  与 provider 共享同一份 `as const` 字面量，避免漂移。
- **id 由 server action 生成**：service 不做随机 id 决策；与其它 service 保持
  一致。
- **聚合按 opportunity 分组**：`listEvaluationsGroupedByOpportunity()` 返回
  `Array<{ opportunity, evaluations[] }>`，每组内 `createdAt` 升序，便于
  dashboard 画时间线。
- **未评估的 opportunity 也上榜**：`rankOpportunities()` 末尾追加
  `__placeholder__` evaluation（totalScore=0），避免 ranking 表空白，但视觉
  上用"not evaluated"区分。
- **competition 极性反转**：UI 用 hint 文案明确告诉用户"higher = less
  competition"；不要重命名为 friendliness（保持 competition 与既有 mock / docs
  对齐）。

### 10.7 未来接入真实 AI 评分

`EvaluationProvider.score()` 是评分能力**唯一**入口。接真实 LLM 评分时：

1. 改写 `lib/providers/evaluation.ts` 旁的真实实现（参考 LLMProvider 切真实
   SDK 的流程）。
2. 改写 `lib/providers/index.ts` 的 `getEvaluationProvider()` factory 即可；
   service / UI 零改动。
3. `totalScore` 仍由 service 按 `SCORING_WEIGHTS` 重算，避免 provider 与规则
   漂移。

### 10.8 已知限制 / TODO

- **没有 evaluation 详情页 `/opportunities/evaluations/[id]`**：列表内每条
  evaluation 还没有独立的 edit / delete UI；`EvaluationList` 的
  `showDetailLink` 已留接口位（默认 false）。
- **没有 evaluation 趋势图**：mock 数据已用 `opp_geo_monitor` 写了 3 个时间点，
  UI 仅以列表展示，未画折线。
- **没有 evaluation update / delete server action**：当前只暴露
  `createEvaluationAction`；update / delete 待 detail 页落地后补。
- **权重是 hard-coded `as const`**：未来如果需要可调权重，需引入 Settings 页 +
  service 读取（当前不做）。
- **没有"评分建议"UI**：prompt `EvaluationForm` 显示的"estimated total"只是
  加权预演，不调 provider。
