# Learning Loop

> Cognitive Venture OS — 把每一次上线变成可复用的组织记忆。

## 1. The loop

```
  Opportunity ─────┐
      │           │ (高分 + 战略契合)
      ▼           │
  MVP Project ────┤
      │           │
      ▼           │
  Launch Result ──┤
      │           │ (人工复盘 / LLMProvider.generateLessons)
      ▼           │
  Lesson Learned ─┤
      │           │
      ├───────────┘ (影响下一轮 Opportunity 评估 + MVP 设计)
      │
      ▼
  Strategy Update
      │
      ▼
  Scoring Model Update (OpportunityEvaluation 9 维度权重 / 阈值)
```

`MVP Project → Launch Result → Lesson Learned` 是 learning loop 的最小单元。
Lesson 通过 `scoreModelSuggestion` 字段反馈到 `OpportunityEvaluation` 引擎，
形成**自进化**的评分模型。

关联关系（v2，2026-06-26）：
- `MVPProject.opportunityId → Opportunity.id`
- `LaunchResult.mvpProjectId → MVPProject.id`
- `LessonLearned.projectId → MVPProject.id`
- `LessonLearned.launchResultId? → LaunchResult.id`（可选：可从 launch 派生
  也可从自由复盘 / opportunity evaluation / GEO 观察产生）

下游实体通过外键反查上游；上游实体不持有下游 id 列表（避免双写不一致）。

## 2. LessonLearned schema

定义在 [`types/learning.ts`](types/learning.ts)。v2（2026-06-26）字段口径——
从"知识条目"型升级为"复盘报告"型：9 个结构化字段 + 2 个外键。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | `lesson_<timestamp36>-<rand8>` |
| `projectId` | `string` | 是 | 关联的 MVPProject.id |
| `launchResultId` | `string?` | 否 | 关联的 LaunchResult.id（可选） |
| `whatWorked` | `string` | 是 | 这次 launch 哪些做法有效（1-4000 字符） |
| `whatFailed` | `string` | 是 | 哪些做法失败 |
| `why` | `string` | 是 | 成功 / 失败背后的因果推断 |
| `customerInsight` | `string` | 是 | 用户洞察 |
| `marketInsight` | `string` | 是 | 市场洞察 |
| `productInsight` | `string` | 是 | 产品洞察 |
| `geoInsight` | `string` | 是 | GEO 洞察 |
| `nextAction` | `string` | 是 | 下一步行动（人 / 时限 / 验证方式） |
| `scoreModelSuggestion` | `string` | 是 | 评分模型改进建议 |
| `createdAt` | `string` | 是 | ISO 8601 |
| `updatedAt` | `string` | 是 | ISO 8601 |

### v1 → v2 字段映射

| 旧 (v1) | 新 (v2) |
| --- | --- |
| `title` | 删除（用 whatWorked / whatFailed 替代） |
| `category` (LessonCategory) | 删除（被 4 个 insight 轴 + nextAction 拆分） |
| `summary` | 删除（被 3 段式 outcome 替代） |
| `detail` | 删除（被 4 个 insight 替代） |
| `applicableWhen` | 删除（被 nextAction 替代） |
| `mvpProjectId` | `projectId`（保持语义，更名） |
| `launchResultId?` | 保留 |
| `opportunityId?` | 删除（通过 MVPProject.opportunityId 反查） |
| `sourceIds[]` | 删除（引用由 insight 内嵌 markdown link 表达） |
| — | 新增 9 个结构化字段 |

### LaunchResult schema 回顾

[`types/mvp.ts`](types/mvp.ts)。13 个字段，全部 top-level（不再嵌套 `metrics.*`），
便于从 Stripe / Plausible / Mixpanel 等外部系统的扁平字段直接映射。详见
[LEARNING_LOOP §2 from previous version](#) 或 [`LEARNING_LOOP.md` git history]。

## 3. resultStatus 语义（LaunchResult）

| 状态 | 含义 | 触发场景 |
| --- | --- | --- |
| `success` | 关键指标健康 | `conversionRate ≥ 5` 且 `retentionRate ≥ 30` |
| `failed` | 关键指标不达标 | `conversionRate < 1` 或 `retentionRate < 10` |
| `unknown` | 数据不足以下结论 | `signups === 0` 且 `conversionRate === 0` |
| `neutral` | 介于以上之间 | 走完前三个判定都没命中 |

阈值来自 `types/mvp.ts` 的 `inferLaunchResultStatus()` 工具函数。
service 层的 `createLaunchResult()` 在调用方未指定 `resultStatus` 时**自动**调用此函数；
调用方也可显式覆盖（手动判定）。

## 4. Manual workflow — Lessons

### 4.1 录入（三种入口）

1. **从 MVP 详情**： `/mvp/[id]` 右上 → "Write retro →" → `/learning/lessons/new?projectId=<id>`
2. **从 Launch 详情**： `/learning/launch-results/[id]` 右上 → "Write retro from this launch →" → `/learning/lessons/new?launchId=<id>&prefill=1`
3. **自由录入**： `/learning/lessons/new` → 手填 9 字段

### 4.2 AI 预填（仅从 launch 入口）

`?prefill=1` 时调用 `LLMProvider.generateLessons(launchResult)`，由 `resultStatus`
决定 whatWorked / whatFailed 的初始语气。9 个字段全部预填（其它 7 个标注
"（待人工补充）"），用户大幅改写后提交。

### 4.3 浏览

`/learning/lessons` — 全部 lessons，按 `updatedAt desc` 排
- `?projectId=<mvpId>` — 限定到某 MVP
- `?launchId=<resultId>` — 限定到某 launch

### 4.4 详情 / 编辑 / 删除

`/learning/lessons/[id]` — 9 字段分组展示（Outcome / Insights / Action），
底部 `LessonForm` 可编辑。删除会同步刷新 `/mvp/[id]` 上的 Lessons 区块。

### 4.5 导出 Markdown

详情页右上 "Export retro" 按钮 → 下载 `lesson-<id>-<YYYY-MM-DD>.md`，
包含 9 字段 + 元信息。便于在 Notion / GitHub / 团队 wiki 二次分享。

## 5. Strategy Update → Scoring Model Update

`LessonLearned.scoreModelSuggestion` 字段是**自进化评分模型**的反馈入口。
当前为自由文本（1-4000 字符），由人工编辑。

### 5.1 当前 OpportunityEvaluation 引擎

[`lib/services/evaluationService.ts`](lib/services/evaluationService.ts) 9 维度：
- `market_size` (15%) / `pain_intensity` (15%) / `competition` (10%) /
  `technical_feasibility` (10%) / `monetization` (15%) / `speed_to_market` (10%) /
  `founder_fit` (5%) / `geo_potential` (10%) / `ip_potential` (10%)

### 5.2 Lesson 反馈路径

1. 复盘时在 `scoreModelSuggestion` 字段写入建议（例："GEO 维度的评分可加入
   '结构化数据覆盖度'子项"）
2. 季度回顾时人工汇总多条 lesson 的建议
3. 更新 `lib/services/evaluationService.ts` 的权重 / 阈值
4. 重新跑 ranking；高分 opportunity 进入 MVP pipeline

### 5.3 mock 数据中的反馈实例

`mock-data/learning.ts` 中 8 条 lesson 的 `scoreModelSuggestion` 字段已经展示了
几种典型反馈模式：

| lesson | 反馈建议 |
| --- | --- |
| `lesson_geo_lag` | `timing` 维度加入"GEO 周期对齐"子项（权重 +5%） |
| `lesson_brand_clarity` | GEO 维度加入"结构化数据覆盖度"子项（-10 分/缺项） |
| `lesson_paid_acquisition_geo` | `go_to_market` 维度惩罚"靠付费广告"的机会 |
| `lesson_query_intent` | `market_size` 维度引入"intent mix"修正（commercial > 50% × 1.5） |
| `lesson_mvp_under_spec` | `founder_fit` 维度惩罚"只做半边解决方案" |
| `lesson_killed_aarw` | `monetization` 维度 rule-out（ARPU < $500 且复购 < 20%） |
| `lesson_iteration_speed` | `speed_to_market` 维度重新校准（2 周 = 10 分，6 周 = 4 分） |
| `lesson_citation_decay` | GEO 维度 decay 风险评估（5% 权重） |

未来 1-2 个迭代可以做：
- 把 `scoreModelSuggestion` 字段升级为结构化（指向具体维度 / 权重变化 / 阈值）
- 在 `evaluationService` 加 `applyLessonSuggestions(lessonIds)` 方法
- 在 dashboard 上显示"评分模型最近 N 次更新来源"溯源链

## 6. LaunchResult 的 connector 集成（回顾）

[`lib/providers/connectors/launch-metrics.ts`](lib/providers/connectors/launch-metrics.ts)
定义了 3 个 fetch 方法，每个返回**单一标量**，由 service 负责拼装。
LessonLearned 与 connector 是**间接**关系：launch result 来自 connector 集成
→ lesson 是对 launch 的人工复盘；connector 拉数据后**仍然需要人工**写 lesson。

## 7. Mock data

[`mock-data/learning.ts`](mock-data/learning.ts) 内置 8 条 LessonLearned，
全部按 v2 schema 填齐 9 个结构化字段。来源横跨：MVP launch、opportunity
评估、GEO 观察、kill decision。每条都展示了一种 feedback 模式。

## 8. Open questions

- **`scoreModelSuggestion` 是否升级为结构化？** 自由文本好用但难批量应用；
  建议下一轮迭代加 `dimension: enum` + `weightDelta: number` + `thresholdDelta: number`
  三个子字段，自由文本保留为 `detail` 描述。
- **Lesson 是否要周期性 review？** 当前 LessonLearned 没有 review 状态；建议加
  `reviewedAt` / `appliedTo: 'scoring' | 'mvp' | 'other'` 等元数据。
- **跨 Opportunity 的 lesson 复用** — 当前 lesson 绑 project，不绑 opportunity；
  跨项目的 lesson 检索只能全文搜索，未来可加 `tags[]` + 全文索引。

## 9. Iteration Layer — Prompt / Loop / Improvement

学习闭环真正落地后，会发现驱动它的不是单次 lesson，而是**被反复改进的 prompt /
循环工程 / 评分模型**。所以 learning loop 之上又加一层 **iteration layer**，
把"AI 工作流本身的资产"也版本化、可对比、可改进。

### 9.1 三类资产

| 资产 | 类型 | 典型例子 |
|---|---|---|
| Prompt | `PromptVersion` | `GEO Pulse PRD generator` v1 → v2 → v3 |
| Loop | `LoopVersion` | `Weekly review loop` v1（无 lesson 步骤）→ v2（加 lesson 步骤） |
| Improvement | `ImprovementLog` | 指向某 prompt / loop / 评分模型的一条 problem + suggestion + result |

`PromptVersion` 的 `type` 枚举直接对应 `LLMProvider` 的方法：
`summarize_source` / `research_card` / `opportunity_score` / `geo_suggestion` /
`lesson_generate` / `opportunity_draft` / `prd_draft` / `codex_task_list` / `other`。
这是因为每种能力背后都对应一份 prompt 模板，模板本身需要迭代。

### 9.2 关联到 4 个 AI 模块

`PromptVersion.type` 枚举是连接 iteration layer 与 4 个下游 AI 模块的桥：

| `PromptVersion.type` | 调用的 AI 能力 | 跨版本 score 对比 |
|---|---|---|
| `prd_draft` | `LLMProvider.generatePRDDraft`（PRD Generator） | v1=52 → v2=71 → v3=80 |
| `opportunity_score` | `LLMProvider.scoreOpportunity`（Opportunity Eval） | v1=? 后续评测 |
| `geo_suggestion` | `LLMProvider.generateGEOSuggestions`（GEO Optimizer） | v1=65 → v2=78 |
| `research_card` | `LLMProvider.generateResearchCard`（Research Card） | 待评测 |
| `lesson_generate` | `LLMProvider.generateLessons`（Lesson Module） | 待评测 |
| `codex_task_list` | `LLMProvider.generateCodexTaskList`（Codex Task Gen） | 待评测 |
| `summarize_source` | `LLMProvider.summarizeSource` | 待评测 |
| `opportunity_draft` | `LLMProvider.generateOpportunityDraft` | 待评测 |
| `other` | 自由备注 | 自由使用 |

当一个 `PromptVersion.score` 提升，对应的下游模块就吃到了"更聪明的 AI"。
iteration layer 是**让 AI 系统本身可被 A/B 测试**的基础设施。

### 9.3 闭环：Prompt / Loop → Improvement → v+1

```
某 Prompt v3 输出不够好
   ↓
 写一条 ImprovementLog(targetType=prompt, targetId=v3.id)
   problem: "v3 缺少对 prior launch feedback 的显式引用"
   suggestion: "v4 显式加入 prior launch 字段，并要求引用至少 1 句客户原话"
   result: "" (pending)
   ↓
 采纳 → /learning/prompts/new?name=X&type=Y  (service 自动递增到 v4)
   ↓
 v4 跑几轮 → 人工评分
   ↓
 回填 ImprovementLog.result = "v4 score 升到 80，比 v3 高 5 分"
   ↓
 ImprovementLog 状态从 Pending → Applied
   ↓
 现在能看到完整因果链：v3 不好 → 改 v4 → 涨 5 分
```

`LoopVersion` 走同一闭环：`steps` / `stopCondition` / `evaluationCriteria`
迭代 → 写 ImprovementLog → 升级 v+1。

### 9.4 评分模型 (score_model) 的特殊路径

`ImprovementLog.targetType='score_model'` 不指向具体实体，而是用
`targetId` 持有 sentinel 字符串（如 `'opportunity_score_model'`）。
service 看到 `score_model` / `other` 时**不校验 targetId 是否存在**——它是
指向"评分模型概念"的占位符。

把"评分模型升级建议"也存进同一个 ImprovementLog 表，**好处**：
- 不为"评分模型"再开一个 entity（一个 enum 就够）
- 跟 prompt/loop 改进走同一个时间线 / 同一个状态机
- 后续做"评分模型最近 N 次更新"溯源链时**只用查一张表**

### 9.5 Mock 数据

[`mock-data/iteration.ts`](mock-data/iteration.ts)：
- 6 条 `PromptVersion`：覆盖 `prd_draft` (3) / `geo_suggestion` (2) /
  `opportunity_score` (1) 三个 type；展示 v1 → v2 → v3 迭代轨迹
- 3 条 `LoopVersion`：覆盖 2 个不同 name；`Weekly review loop` v1 → v2
  （加 lesson review 步骤，score 60 → 75）
- 5 条 `ImprovementLog`：4 条指向具体 prompt/loop，1 条指向 score_model
  sentinel；其中 3 条已 applied（有 result 文本），2 条 pending

### 9.6 页面入口

| 路由 | 用途 |
|---|---|
| `/learning/prompts` | 全部 prompt 列表（含 type 过滤） |
| `/learning/prompts/new` | 新建 prompt；支持 `?name=&type=` 预填"v+1" |
| `/learning/prompts/[id]` | 详情 + 编辑 + 删除 + "Create v+1" 链接 + "Log improvement" 链接 |
| `/learning/loops` | 全部 loop 列表 |
| `/learning/loops/new` | 新建 loop；支持 `?name=` 预填"v+1" |
| `/learning/loops/[id]` | 详情 + 编辑 + 删除 + "Create v+1" + "Log improvement" |
| `/learning/improvements` | 全部 improvement log 列表（按 targetType / targetId 过滤） |
| `/learning/improvements/new` | 新建 improvement；支持 `?targetType=&targetId=` 预填 |
| `/learning/improvements/[id]` | 详情 + 编辑 + 删除 + "Open target" 跳到对应 prompt/loop 详情 |

### 9.7 LLMProvider.suggestImprovement

新增的 `LLMProvider.suggestImprovement(target)` 方法接收一个
`{ kind: 'prompt' | 'loop', prompt | loop }`，返回 `{ problem, suggestion }`
草稿（不含 id / 时间戳 / targetType / targetId —— 这些由 service 补齐）。
对应 mock 实现写死一段中文建议（prompt 加 prior launch 引用 / loop 加量化
evaluationCriteria），后续切真实 LLM 时只换实现，service 与 UI 不动。

### 9.8 Open questions

- **跨实体的 improvement 搜索**：当前 `listImprovementLogsByTarget(targetId)`
  只支持精确匹配，无法"找出所有提到 'score_model' 的 improvement"。
  后续可加 `tags[]` + 全文搜索。
- **Prompt ↔ Loop 的引用关系**：当前两者互相独立，但实际工作里
  某个 loop 会**调用**某组 prompt。建议加 `LoopVersion.referencedPromptIds`。
- **ImprovementLog → 实际版本的回链**：当 improvement 被采纳并创建了 v+1
  后，没有"哪条 improvement 触发了 v+1"的反向链接。建议加
  `ImprovementLog.appliedVersionId`（指向新创建的 prompt/loop）。
