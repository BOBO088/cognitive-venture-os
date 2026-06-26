/**
 * Codex Task Generator 域类型。
 *
 * 一次"生成" = 一份 PRD → 一组 Codex 任务草稿 → 落入 Codex Task Board
 * （types/task.ts 的 Task 实体 + generatorRunId 字段）。
 *
 * 本文件不存运行时数据；仅定义 LLMProvider 输入/输出 + service 层 run 聚合。
 */

import type { Task, TaskPhase, TaskPriority } from './task';

/**
 * 生成任务的 6 大分类。与 `CodexTaskDraft.category` / service 的任务标题前缀一致。
 *
 * 顺序即"项目执行顺序"，便于 mock 拼接生成命令时按序输出。
 */
export type CodexTaskCategory =
  | 'architecture'
  | 'data_model'
  | 'page'
  | 'api'
  | 'test'
  | 'deploy';

export const CODEX_TASK_CATEGORIES: CodexTaskCategory[] = [
  'architecture',
  'data_model',
  'page',
  'api',
  'test',
  'deploy',
];

export const CODEX_TASK_CATEGORY_LABEL: Record<CodexTaskCategory, string> = {
  architecture: '技术架构',
  data_model: '数据模型',
  page: '页面开发',
  api: 'API 开发',
  test: '测试',
  deploy: '部署',
};

/** LLMProvider 的输入。service 层装配好再传。 */
export interface CodexTaskListInput {
  mvpProject: {
    id: string;
    name: string;
    description: string;
    stage: string;
  };
  prd: {
    id: string;
    title: string;
    version: number;
    /** 9 个 section 完整内容；LLM 用来派生具体任务。 */
    productPositioning: string;
    targetUsers: string;
    corePainPoints: string;
    mvpFeatureScope: string;
    pageStructure: string;
    dataModel: string;
    apiDesign: string;
    acceptanceCriteria: string;
    devPlan: string;
  };
}

/**
 * LLMProvider 的单条任务草稿。
 *
 * 字段语义对应 Task 实体的：
 *   - title         → Task.title
 *   - description   → Task.description（含 acceptance 行）
 *   - category      → 不落 Task（用于 markdown 分组 + 排序）
 *   - phase         → Task.phase
 *   - priority      → Task.priority
 *   - codexCommand  → Task.codexCommand（必须可直接复制给 Codex）
 *   - changedFiles  → Task.changedFiles
 *
 * 不含 id / 时间戳 / generatorRunId / sourcePRDid — 由 service / repo 补。
 */
export interface CodexTaskDraft {
  title: string;
  description: string;
  category: CodexTaskCategory;
  phase: TaskPhase;
  priority: TaskPriority;
  codexCommand: string;
  changedFiles: string[];
}

/** LLMProvider 一次生成的完整结果。 */
export interface CodexTaskListDraft {
  tasks: CodexTaskDraft[];
  /** 一句话总结，用于 markdown export header / run 列表预览。 */
  summary: string;
}

/**
 * 服务层 run 聚合：同一次 generate 的所有任务共享 generatorRunId。
 *
 * service 不在内存里持久化 run 实体；listCodexTaskRuns / getCodexTaskRun 都
 * 是从 Task[] 里按 generatorRunId group by 出来的。
 */
export interface CodexTaskRun {
  id: string;
  sourcePRDid: string;
  mvpProjectId: string;
  /** 6 个分类按 service 排序后输出。 */
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
  /** 来自第一次生成时的 LLMProvider summary；同 run 内共享。 */
  summary: string;
}
