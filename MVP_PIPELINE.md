# MVP Pipeline

> Opportunity → MVPProject 的落地与执行系统。`/mvp` 路由族 + kanban 看板。
> 基于 2026-06-25 代码扫描。

## 1. 目标

把"高分 Opportunity" 变成可执行、可追踪、可复盘的 MVP 项目。
每次项目从 idea 走到 revenue / killed，都留下阶段、收入、成本、复盘的资产。

非目标：
- 自动从 Opportunity 派生 MVP（手动，从 ranking 高分 → /mvp/new?opportunityId=...）
- 财务自动化（revenue / cost 是手填数字，不接 Stripe / 银行）
- 多团队协作 / 权限（单人 founder 模型）
- 代码仓库 / 部署（repoUrl 字段在 v1/v2 已收敛，v3 不再保留）

## 2. 数据模型

`MVPProject`（types/mvp.ts，v3 字段口径）：

```ts
interface MVPProject {
  id: string;                       // 'mvp_' 前缀
  opportunityId: string;            // 必填；引用 Opportunity.id
  name: string;                     // 1-200 字符
  description: string;              // 1-4000 字符
  stage: MVPStage;                  // 7 选 1
  owner: string;                    // 1-100 字符（人名 / 角色 / 团队）
  startDate: string;                // YYYY-MM-DD，必填
  launchDate?: string;              // YYYY-MM-DD，stage ∈ launched/revenue/killed 时有意义
  revenue: number;                  // ≥ 0，2 位小数
  cost: number;                     // ≥ 0，2 位小数
  lessons: string;                  // ≤ 4000 字符；复盘结论
  createdAt: string;
  updatedAt: string;
}

type MVPStage =
  | 'idea'         // 还在写需求
  | 'research'     // 调研中
  | 'validation'   // 假设验证中
  | 'mvp'          // 在做 MVP
  | 'launched'     // 已上线
  | 'revenue'      // 产生收入
  | 'killed';      // 终止
```

### 字段策略

| 字段 | 策略 | 说明 |
|---|---|---|
| `opportunityId` | 手动管理 | service 校验引用存在；UI 提供"Spin off from opportunity"链接 |
| `launchDate` | 手动管理 | 由 stage 触发的隐含建议：进入 `launched` / `revenue` 时填 |
| `revenue` / `cost` | 手动数字 | 累计值；复盘时回填 |
| `lessons` | 手动文本 | ≤ 4000 字符，复盘记录 |
| `stage` | service 校验流转 | `killed` 是终态，不可切回其它 stage |

### 收敛历史

v1（types/mvp.ts 旧版）字段：`oneLiner / health / ownerId / repoUrl / launchResultIds / lessonIds` —— v3 全部删除。
- `oneLiner` → `description`（更自由）
- `health: MVPHealth` → 删除（健康度从财务字段推断）
- `ownerId: string` → `owner: string`（自由文本，不绑死 agent 表）
- `repoUrl` → 删除（不在 v3 范围）
- `launchResultIds: string[]` → 派生（LaunchResult.mvpProjectId 反查）
- `lessonIds: string[]` → 派生（LessonLearned.mvpProjectId 反查）

## 3. 阶段流转

7 个 stage 沿一条主流程推进，辅以 `killed` 终态：

```
idea → research → validation → mvp → launched → revenue
  └─────────────────────────────────────────────→ killed
```

**约束：**
- `killed` 不可切回其它 stage（service 抛 `MVPProjectServiceError`）
- 其它 stage 任意切换（含 backward 切换：launched → mvp 重做）
- launchDate 仅在 stage 包含 `launched` / `revenue` / `killed` 时有意义（form 不强制，其它 stage 留空）

## 4. 路由

| 路径 | 类型 | 说明 |
|---|---|---|
| `/mvp` | RSC | 列表视图 + 财务汇总 + stage 过滤 chip |
| `/mvp/new` | RSC + form | 创建 MVP；支持 `?opportunityId=...` 预选来源 |
| `/mvp/[id]` | RSC + form | 详情 + 财务 + lessons + launch history + 编辑 |
| `/mvp/kanban` | RSC | 7 列看板；每张卡含 "→ next stage" 按钮 |

## 5. 分层

```
UI (RSC + form client components)
  → app/mvp/{page,new,kanban}.tsx + app/mvp/[id]/page.tsx
  → app/mvp/actions.ts (server actions)
    → lib/services/mvpProjectService.ts (业务规则 + 财务聚合 + 阶段流转)
      → lib/repos/mvp.ts (内存 mock 存储)
        → mock-data/mvp-projects.ts
      → lib/services/opportunityService.ts (校验 opportunityId 引用)

Markdown 导出：
  → lib/export/mvpReportMarkdown.ts (buildMVPReport)
    → 客户端 Blob 下载 (MVPReportButton)
```

## 6. 业务规则（service 层）

详见 `lib/services/mvpProjectService.ts`：

1. `name` 1-200 字符
2. `description` 1-4000 字符
3. `owner` 1-100 字符
4. `opportunityId` 必填且引用存在
5. `stage` ∈ 7 个 MVPStage
6. `startDate` 必填 (YYYY-MM-DD)
7. `launchDate` 可选；若提供必须 `≥ startDate`
8. `revenue` / `cost` ≥ 0
9. `lessons` ≤ 4000 字符（可空字符串）
10. stage 流转：`killed` 不可切到其它
11. id 唯一性
12. createdAt / updatedAt 由调用方提供

## 7. 财务聚合

`computeFinancialSummary(projects?)` 计算：

```ts
{
  totalRevenue: number;       // 所有项目 revenue 之和
  totalCost: number;          // 所有项目 cost 之和
  netProfit: number;          // totalRevenue - totalCost
  roi: number | null;         // (net / cost) * 100，cost=0 时为 null
  revenueStageCount: number;  // 处于 revenue stage 的项目数
  killedStageCount: number;   // 处于 killed stage 的项目数
  projectCount: number;       // 总项目数
}
```

UI 渲染为 4 张卡片（Total revenue / Total cost / Net profit / ROI）。
MVP 详情页只显示项目自身（summaryFromProject([project])）；列表 / kanban 显示全量。

## 8. 与 Opportunity Radar 打通

- **从 Opportunity 创建 MVP**：Opportunity 详情页加 "Spin off MVP project →" 链接 → `/mvp/new?opportunityId=<id>` 表单预选。
- **从 Ranking 创建 MVP**：`/opportunities/ranking` 页底部说明 "高分 opportunity 可去 detail 页点 Spin off"；MVP pipeline 顶部互链。
- **数据反向可见**：MVPProject 详情页显示来源 Opportunity（`/opportunities/[id]` 链接 + 状态徽章）。
- **Opportunity 状态流转不联动 MVP**：MVP 是手动驱动的（与 evaluation 触发的 status 流转解耦）。

## 9. Kanban 看板

- 7 列按 `MVP_STAGES` 顺序固定
- 每张卡显示：name / stage badge / owner / start date / revenue:cost
- "→ next stage" 按钮走 `transitionStageAction` server action，把当前 stage 推后 1 步（自动跳过 `killed`）
- `killed` 列的卡片无"→ next"按钮（已是终态）

## 10. Markdown 报告

- 单项目：`MVPReportButton` 接收 server 端装配的 `{ project, opportunity?, launches[] }` → 调用 `buildMVPReport` → 下载 `mvp-<id>-<date>.md`
- 报告含：财务表、Description、Launch history（每次 launch 的 outcome / metrics / feedback）、Lessons
- 与 Opportunity / Ranking 报告风格保持一致（escapeMd / fmtDate / fmtMoney）

## 11. 已知限制 / TODO

- **没有 launch 事件 CRUD**：当前 LaunchResult 是 mock 数据，service 层只读；后续要建 `launchResultService` + `/mvp/[id]/launches` 路由。
- **没有 lesson 关联 UI**：LessonLearned 数据已存在（mock-data/learning.ts），但 MVPProject 详情页没有 "记录 lesson" 入口；后续把 `mvpProjectId` 作为 LessonLearned 的可填字段露出。
- **没有按 opportunity 反查 UI**：Opportunity 详情页未列出已派生的 MVPProject（`listMVPProjectsByOpportunity` 已可用，UI 待补）。
- **没有 bulk stage 推进**：kanban 一次只能推一张卡；批量操作待加。
- **没有自动 launchDate**：当 stage 切到 launched/revenue 时不会自动填今天的 launchDate（保留手动决定）。
- **没有项目时间线可视化**：startDate → launchDate → current stage 的进度条 / 时间线待加。
- **没有预警**：revenue < cost 持续 N 周 / stage 停留过久都不告警；适合加 rule engine。
- **没有导出整个 pipeline**：单项目可导出 markdown，全 pipeline 只能从 /mvp 截图（待加 `pipelineReportMarkdown`）。
- **killed 不可恢复**：service 硬约束；如要"复活"，先在外部修改 memory store（mock 阶段可手改文件），未来可加 admin override。
