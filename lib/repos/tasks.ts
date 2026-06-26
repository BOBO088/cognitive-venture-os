/**
 * Task 仓储：list / get / create / update / delete。
 *
 * 当前实现 = 进程内数组（mutation 不会持久化，dev server 重启即丢）。
 * 切到 Supabase 时只改函数体，UI 零改动。
 *
 * 时间字段统一用字面量 ISO（不调 new Date），避免 SSR hydration mismatch。
 */

import { mockTasks } from '@/mock-data/tasks';
import type { Task, TaskStatus, TaskPriority, TaskPhase } from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

/** 简化版 UUID：够用即可，不依赖 crypto（保持 SSR / test 稳定）。 */
function newId(): string {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 新建任务的最小输入。id / 时间由仓储补。 */
export interface CreateTaskInput {
  title: string;
  description?: string;
  phase?: TaskPhase;
  status?: TaskStatus;
  priority?: TaskPriority;
  codexCommand?: string;
  changedFiles?: string[];
  testResult?: Task['testResult'];
  failureReason?: string;
  reviewNotes?: string;
  /** 由 Codex Task Generator 写入：来源 PRD.id。 */
  sourcePRDid?: string;
  /** 由 Codex Task Generator 写入：归属 run id。 */
  generatorRunId?: string;
}

/** 更新任务的 patch。 */
export type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'title'>> & {
  title?: string;
};

export async function listTasks(): Promise<Task[]> {
  // 列表按 updatedAt 倒序，最新的在前
  return [...mockTasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTask(id: string): Promise<Task | undefined> {
  return mockTasks.find((t) => t.id === id);
}

/** 简单的 filter helper，UI 可以复用。 */
export async function listTasksByStatus(status: TaskStatus): Promise<Task[]> {
  return mockTasks.filter((t) => t.status === status);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  if (!input.title || input.title.trim() === '') {
    throw new Error('[tasks repo] title is required');
  }
  const task: Task = {
    id: newId(),
    title: input.title.trim(),
    description: input.description,
    phase: input.phase,
    status: input.status ?? 'backlog',
    priority: input.priority ?? 'medium',
    codexCommand: input.codexCommand,
    changedFiles: input.changedFiles ?? [],
    testResult: input.testResult,
    failureReason: input.failureReason,
    reviewNotes: input.reviewNotes,
    sourcePRDid: input.sourcePRDid,
    generatorRunId: input.generatorRunId,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  mockTasks.unshift(task);
  return task;
}

export async function updateTask(id: string, patch: UpdateTaskInput): Promise<Task> {
  const idx = mockTasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error(`[tasks repo] task not found: ${id}`);
  }
  const existing = mockTasks[idx]!;
  const next: Task = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: MOCK_NOW,
  };
  mockTasks[idx] = next;
  return next;
}

export async function deleteTask(id: string): Promise<void> {
  const idx = mockTasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error(`[tasks repo] task not found: ${id}`);
  }
  mockTasks.splice(idx, 1);
}
