/**
 * MVP 域：MVPProject + LaunchResult。
 *
 * 落地链路：Opportunity → MVPProject → LaunchResult → LessonLearned。
 * 一个 Opportunity 可派生多个 MVPProject 平行试错。
 *
 * MVPProject（v3 字段口径，2026-06-25）：
 *   - 7 个 stage：idea / research / validation / mvp / launched / revenue / killed
 *   - 必含字段：id, opportunityId, name, description, stage, owner, startDate,
 *     launchDate?, revenue?, cost?, lessons?, createdAt, updatedAt
 *
 * 注：v1/v2 的 oneLiner / health / ownerId / repoUrl / launchResultIds /
 * lessonIds 字段已统一收敛到 description / owner / startDate&launchDate /
 * revenue&cost / lessons；MVPProject 与 LaunchResult / LessonLearned 不再互相
 * 引用 id 列表，所有关联通过 opportunityId / mvpProjectId 反查。
 *
 * LessonLearned 已迁出到 types/learning.ts（v2 字段口径，2026-06-26）。
 */

/** MVP 项目的生命周期阶段。 */
export type MVPStage =
  | 'idea'         // 还在写需求
  | 'research'     // 调研中
  | 'validation'   // 假设验证中
  | 'mvp'          // 在做 MVP
  | 'launched'     // 已上线
  | 'revenue'      // 产生收入
  | 'killed';      // 终止

/** 全部 stage 顺序（用于 kanban 列顺序 + 状态流转校验）。 */
export const MVP_STAGES: MVPStage[] = [
  'idea',
  'research',
  'validation',
  'mvp',
  'launched',
  'revenue',
  'killed',
];

/** stage 在 kanban 上的列名 / 进度提示。 */
export const MVP_STAGE_LABEL: Record<MVPStage, string> = {
  idea: 'Idea',
  research: 'Research',
  validation: 'Validation',
  mvp: 'MVP',
  launched: 'Launched',
  revenue: 'Revenue',
  killed: 'Killed',
};

/**
 * MVPProject — 一个 MVP 项目。
 *
 * 把 Opportunity 落地为一个最小可行产品的开发项目。与 Venture 是不同层级：
 * Venture 是商业实体，MVPProject 是为验证假设的实验单元。
 *
 * 字段约束（service 层强制）：
 *   - name 1-200 字符
 *   - description 1-4000 字符
 *   - owner 1-100 字符（自由文本：人名 / 角色 / 团队）
 *   - opportunityId 必须存在于 Opportunity 域
 *   - startDate 必填（ISO 8601 date，YYYY-MM-DD）
 *   - launchDate 可选（仅 stage 到达 launched / revenue 时填）
 *   - revenue ≥ 0
 *   - cost ≥ 0
 *   - lessons ≤ 4000 字符
 *   - stage ∈ MVPStage
 */
export interface MVPProject {
  id: string;
  /** 来源 Opportunity.id。手动选择 / 从 ranking 高分派生。 */
  opportunityId: string;
  /** 项目名。1-200 字符。 */
  name: string;
  /** 项目说明。1-4000 字符。 */
  description: string;
  stage: MVPStage;
  /** 负责人 / 团队（自由文本）。1-100 字符。 */
  owner: string;
  /** 立项日期，YYYY-MM-DD。 */
  startDate: string;
  /** 上线日期，YYYY-MM-DD。可选。 */
  launchDate?: string;
  /** 累计收入，≥ 0。 */
  revenue: number;
  /** 累计成本，≥ 0。 */
  cost: number;
  /** 复盘结论，自由文本。≤ 4000 字符。 */
  lessons: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * LaunchResult — 一次 MVP 发布的结果。
 *
 * 一次具体的 launch 事件（一个 MVPProject 可有多次 re-launch，每次记一条）。
 * 注：MVPProject 不再持有 launchResultIds 列表；本实体通过 mvpProjectId 反查。
 *
 * 字段约束（service 层强制）：
 *   - mvpProjectId 必须存在（service 校验）
 *   - launchDate 必填（YYYY-MM-DD）
 *   - users / signups / traffic / revenue ≥ 0
 *   - conversionRate / retentionRate ∈ [0, 100]（百分比）
 *   - resultStatus ∈ RESULT_STATUSES
 *   - feedbackSummary ≤ 4000 字符（可选）
 *
 * 设计取舍（v2，2026-06-25）：把所有量化字段拍平到 top-level（之前在
 * `metrics.{signups,revenue,custom}` 嵌套），便于前端表单录入与 connector
 * 拉取后的字段映射（Stripe / Analytics / DB 的字段都是 top-level 标量）。
 */
export interface LaunchResult {
  id: string;
  /** 关联的 MVPProject.id。 */
  mvpProjectId: string;
  /** 上线日期，YYYY-MM-DD。 */
  launchDate: string;
  /** 总触达用户数（uv / 注册前流量）。≥ 0。 */
  users: number;
  /** 注册数。≥ 0。 */
  signups: number;
  /** 累计收入。≥ 0。 */
  revenue: number;
  /** 总流量（PV / sessions）。≥ 0。 */
  traffic: number;
  /** 转化率（signups / users × 100），0-100。 */
  conversionRate: number;
  /** 7 日留存率（百分比），0-100。 */
  retentionRate: number;
  /** 用户反馈摘要。可选，≤ 4000 字符。 */
  feedbackSummary?: string;
  /** 整体结果判定。 */
  resultStatus: LaunchResultStatus;
  createdAt: string;
  updatedAt: string;
}

/** LaunchResult.resultStatus 的全部取值。 */
export type LaunchResultStatus = 'success' | 'neutral' | 'failed' | 'unknown';

export const LAUNCH_RESULT_STATUSES: LaunchResultStatus[] = [
  'success',
  'neutral',
  'failed',
  'unknown',
];

export const LAUNCH_RESULT_STATUS_LABEL: Record<LaunchResultStatus, string> = {
  success: 'Success',
  neutral: 'Neutral',
  failed: 'Failed',
  unknown: 'Unknown',
};

/**
 * 评估 resultStatus 的辅助规则。
 *
 * 真实判定可能结合多个指标 + 主观判断；这里给一个简单的 mock 阈值。
 * 接入真实 LLM 后，由 LLMProvider 走更复杂的判断。
 */
export function inferLaunchResultStatus(input: {
  conversionRate: number;
  retentionRate: number;
  signups: number;
}): LaunchResultStatus {
  if (input.signups === 0 && input.conversionRate === 0) return 'unknown';
  if (input.conversionRate >= 5 && input.retentionRate >= 30) return 'success';
  if (input.conversionRate < 1 || input.retentionRate < 10) return 'failed';
  return 'neutral';
}
