/**
 * Task 域：Codex Task Board 的任务实体。
 *
 * 设计目标：把每一次 Codex 开发操作（命令、修改、测试、失败、复盘）变成可追踪资产。
 * 一个 Task = 一次具体的"做什么"原子 + 配套的产物。
 */

/** Task 在 venture 生命周期中的所属阶段。 */
export type TaskPhase = 'research' | 'scout' | 'build' | 'launch' | 'learn';

/** Task 的工作流状态。 */
export type TaskStatus = 'backlog' | 'doing' | 'review' | 'done' | 'failed';

/** Task 的优先级。 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * TestResult — 一次测试运行的快照。
 *
 * 记录在 Task 上，便于事后对照"修了什么 → 测了什么 → 哪些挂了"。
 * summary 存一行可读日志（截断即可），不需要存完整 stdout。
 */
export interface TestResult {
  /** 跑过的测试总数。 */
  total: number;
  /** 通过数。 */
  passed: number;
  /** 失败数。 */
  failed: number;
  /** 一行可读的日志摘要 / 错误片段。 */
  summary?: string;
}

/**
 * Task — 一次 Codex 开发任务。
 *
 * 字段约定：
 * - id / createdAt / updatedAt 必有
 * - title 必有；description 可选
 * - status 必有，默认 'backlog'
 * - priority 必有，默认 'medium'
 * - phase 可选（未分类任务可省略）
 * - codexCommand / changedFiles / testResult / failureReason / reviewNotes
 *   都是"执行后回填"字段，初始可为 undefined
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  phase?: TaskPhase;
  status: TaskStatus;
  priority: TaskPriority;
  /** 触发本次任务的 Codex 命令（如 'npm run build'）。 */
  codexCommand?: string;
  /** 本次任务修改的文件路径列表。 */
  changedFiles: string[];
  /** 测试运行结果。 */
  testResult?: TestResult;
  /** 失败原因（status='failed' 时回填）。 */
  failureReason?: string;
  /** 复盘结论 / 下一步行动。 */
  reviewNotes?: string;
  /** 由 Codex Task Generator 写入：本次任务由哪份 PRD 生成。 */
  sourcePRDid?: string;
  /** 由 Codex Task Generator 写入：归属的 run id（同一次 generate 的所有任务共享）。 */
  generatorRunId?: string;
  createdAt: string;
  updatedAt: string;
}
