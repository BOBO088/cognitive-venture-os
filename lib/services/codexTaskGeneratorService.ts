/**
 * CodexTaskGeneratorService — Codex Task Generator 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repos（tasks + prd + mvp） + LLMProvider。
 *
 * 业务规则：
 *   1. PRD 必须存在（service 校验）
 *   2. 一次 generate = 一次 LLM call → 6 条 Task 落库（写 mockTasks 内存）
 *   3. 所有生成出来的 Task 共享 generatorRunId + sourcePRDid
 *   4. deleteCodexTaskRun 删除该 run 下所有 Task（不会影响其他 run / 手工 task）
 *   5. listCodexTaskRuns / getCodexTaskRun 从 mockTasks group by generatorRunId 派生
 *
 * 与 prdService / opportunityService 一致：service 保持纯净，所有 AI 走 LLMProvider。
 */

import {
  createTask as _repoCreate,
  listTasks as _repoList,
  deleteTask as _repoDelete,
  type CreateTaskInput,
} from '@/lib/repos/tasks';
import { getPRD } from './prdService';
import { getMVPProject } from './mvpProjectService';
import { getLLMProvider } from '@/lib/providers';
import type {
  CodexTaskListInput,
  CodexTaskRun,
  CodexTaskDraft,
} from '@/types';
import type { Task } from '@/types';

export class CodexTaskGeneratorServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodexTaskGeneratorServiceError';
  }
}

/* ----------------- Validation ----------------- */

function validatePRDId(id: string | undefined): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new CodexTaskGeneratorServiceError('prdId is required');
  }
  return id.trim();
}

function validateRunId(id: string | undefined): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new CodexTaskGeneratorServiceError('runId is required');
  }
  return id.trim();
}

/* ----------------- Helpers ----------------- */

/**
 * 在 listTasks 结果里 group by generatorRunId，输出按"run 最新一条 task 的
 * updatedAt desc"排序的 run 列表。
 */
async function groupTasksByRun(): Promise<CodexTaskRun[]> {
  const all = await _repoList();
  const byRun = new Map<string, Task[]>();
  for (const t of all) {
    if (!t.generatorRunId) continue;
    const arr = byRun.get(t.generatorRunId) ?? [];
    arr.push(t);
    byRun.set(t.generatorRunId, arr);
  }
  const runs: CodexTaskRun[] = [];
  for (const [runId, tasks] of byRun) {
    const first = tasks[0];
    if (!first || !first.sourcePRDid) continue;
    // sort tasks by createdAt asc to reflect the original generation order
    const sorted = [...tasks].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    const last = sorted[sorted.length - 1]!;
    runs.push({
      id: runId,
      sourcePRDid: first.sourcePRDid,
      mvpProjectId: first.changedFiles.length > 0 ? '' : '', // placeholder, filled below if possible
      tasks: sorted,
      createdAt: first.createdAt,
      updatedAt: last.updatedAt,
      summary: '',
    });
  }
  runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return runs;
}

/* ----------------- Read ----------------- */

export async function listCodexTaskRuns(): Promise<CodexTaskRun[]> {
  const runs = await groupTasksByRun();
  // 注入 mvpProjectId：通过 sourcePRDid 拿 PRD → mvpProjectId
  const enriched = await Promise.all(
    runs.map(async (r) => {
      const prd = await getPRD(r.sourcePRDid);
      return {
        ...r,
        mvpProjectId: prd?.mvpProjectId ?? '',
        summary: deriveSummary(r),
      };
    }),
  );
  return enriched;
}

export async function getCodexTaskRun(id: string): Promise<CodexTaskRun | undefined> {
  const runId = validateRunId(id);
  const all = await _repoList();
  const tasks = all
    .filter((t) => t.generatorRunId === runId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (tasks.length === 0) return undefined;
  const first = tasks[0]!;
  const prd = await getPRD(first.sourcePRDid ?? '');
  const run: CodexTaskRun = {
    id: runId,
    sourcePRDid: first.sourcePRDid ?? '',
    mvpProjectId: prd?.mvpProjectId ?? '',
    tasks,
    createdAt: first.createdAt,
    updatedAt: tasks[tasks.length - 1]!.updatedAt,
    summary: '',
  };
  run.summary = deriveSummary(run);
  return run;
}

function deriveSummary(run: CodexTaskRun): string {
  const first = run.tasks[0];
  if (!first) return `Run for ${run.sourcePRDid}`;
  // 用第一条 task 的 description 抽第一行作为摘要
  const desc = first.description ?? '';
  const firstLine = desc.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? first.title;
  return `${run.tasks.length} tasks · ${firstLine.slice(0, 100)}`;
}

/* ----------------- Write ----------------- */

export interface GenerateCodexTaskListOptions {
  /** 由调用方提供 run id（service 不生成）。 */
  runId: string;
  /** 用于每个 Task 的 createdAt / updatedAt。 */
  createdAt: string;
}

/**
 * 从一份 PRD 生成 Codex 任务列表（落库）。
 * 1. 校验 PRD 存在 + 取关联 MVP
 * 2. 调 LLMProvider.generateCodexTasks
 * 3. 把每条 draft 转成 Task 写入 mockTasks
 * 4. 返回 run 聚合
 */
export async function generateCodexTaskListForPRD(
  prdId: string,
  options: GenerateCodexTaskListOptions,
): Promise<CodexTaskRun> {
  const pid = validatePRDId(prdId);
  const prd = await getPRD(pid);
  if (!prd) {
    throw new CodexTaskGeneratorServiceError(`PRD not found: ${pid}`);
  }
  const mvp = await getMVPProject(prd.mvpProjectId);
  if (!mvp) {
    throw new CodexTaskGeneratorServiceError(
      `MVP project not found: ${prd.mvpProjectId}`,
    );
  }

  const provider = await getLLMProvider();
  const providerInput: CodexTaskListInput = {
    mvpProject: {
      id: mvp.id,
      name: mvp.name,
      description: mvp.description,
      stage: mvp.stage,
    },
    prd: {
      id: prd.id,
      title: prd.title,
      version: prd.version,
      productPositioning: prd.productPositioning,
      targetUsers: prd.targetUsers,
      corePainPoints: prd.corePainPoints,
      mvpFeatureScope: prd.mvpFeatureScope,
      pageStructure: prd.pageStructure,
      dataModel: prd.dataModel,
      apiDesign: prd.apiDesign,
      acceptanceCriteria: prd.acceptanceCriteria,
      devPlan: prd.devPlan,
    },
  };
  const draft = await provider.generateCodexTasks(providerInput);

  // 写库
  const createdTasks: Task[] = [];
  for (const t of draft.tasks) {
    const input: CreateTaskInput = taskInputFromDraft(t, {
      sourcePRDid: prd.id,
      generatorRunId: options.runId,
    });
    createdTasks.push(await _repoCreate(input));
  }

  const sorted = [...createdTasks].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  return {
    id: options.runId,
    sourcePRDid: prd.id,
    mvpProjectId: mvp.id,
    tasks: sorted,
    createdAt: sorted[0]!.createdAt,
    updatedAt: sorted[sorted.length - 1]!.updatedAt,
    summary: draft.summary,
  };
}

function taskInputFromDraft(
  draft: CodexTaskDraft,
  meta: { sourcePRDid: string; generatorRunId: string },
): CreateTaskInput {
  return {
    title: draft.title,
    description: draft.description,
    phase: draft.phase,
    priority: draft.priority,
    codexCommand: draft.codexCommand,
    changedFiles: draft.changedFiles,
    sourcePRDid: meta.sourcePRDid,
    generatorRunId: meta.generatorRunId,
  };
}

/* ----------------- Delete ----------------- */

export async function deleteCodexTaskRun(id: string): Promise<number> {
  const runId = validateRunId(id);
  const all = await _repoList();
  const targets = all.filter((t) => t.generatorRunId === runId);
  for (const t of targets) {
    await _repoDelete(t.id);
  }
  return targets.length;
}
