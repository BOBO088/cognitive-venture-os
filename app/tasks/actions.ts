'use server';

/**
 * Task Board 的 server actions：create / update / delete。
 * UI 通过 form action 调用这里，避免在客户端直连 repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createTask,
  updateTask,
  deleteTask,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@/lib/repos/tasks';
import type { TaskPhase, TaskStatus, TaskPriority, TestResult } from '@/types';

/** FormData → typed input。把空字符串转 undefined。 */
function parseString(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseStatus(v: FormDataEntryValue | null): TaskStatus {
  const s = parseString(v);
  if (s === 'doing' || s === 'review' || s === 'done' || s === 'failed') return s;
  return 'backlog';
}

function parsePriority(v: FormDataEntryValue | null): TaskPriority {
  const s = parseString(v);
  if (s === 'low' || s === 'high' || s === 'urgent') return s;
  return 'medium';
}

function parsePhase(v: FormDataEntryValue | null): TaskPhase | undefined {
  const s = parseString(v);
  if (s === 'research' || s === 'scout' || s === 'build' || s === 'launch' || s === 'learn') return s;
  return undefined;
}

function parseChangedFiles(v: FormDataEntryValue | null): string[] {
  const s = parseString(v);
  if (!s) return [];
  return s
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseTestResult(v: FormDataEntryValue | null): TestResult | undefined {
  const s = parseString(v);
  if (!s) return undefined;
  // 接受 "passed/total" 形式，如 "3/3" 或 "12/15"
  const m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) {
    const passed = Number(m[1]);
    const total = Number(m[2]);
    return { total, passed, failed: Math.max(0, total - passed) };
  }
  return { total: 0, passed: 0, failed: 0, summary: s };
}

export async function createTaskAction(formData: FormData): Promise<void> {
  const input: CreateTaskInput = {
    title: parseString(formData.get('title')) ?? '',
    description: parseString(formData.get('description')),
    phase: parsePhase(formData.get('phase')),
    status: parseStatus(formData.get('status')),
    priority: parsePriority(formData.get('priority')),
    codexCommand: parseString(formData.get('codexCommand')),
    changedFiles: parseChangedFiles(formData.get('changedFiles')),
    testResult: parseTestResult(formData.get('testResult')),
    failureReason: parseString(formData.get('failureReason')),
    reviewNotes: parseString(formData.get('reviewNotes')),
  };
  const created = await createTask(input);
  revalidatePath('/tasks');
  redirect(`/tasks/${created.id}`);
}

export async function updateTaskAction(
  id: string,
  formData: FormData,
): Promise<void> {
  const patch: UpdateTaskInput = {
    title: parseString(formData.get('title')),
    description: parseString(formData.get('description')),
    phase: parsePhase(formData.get('phase')),
    status: parseStatus(formData.get('status')),
    priority: parsePriority(formData.get('priority')),
    codexCommand: parseString(formData.get('codexCommand')),
    changedFiles: parseChangedFiles(formData.get('changedFiles')),
    testResult: parseTestResult(formData.get('testResult')),
    failureReason: parseString(formData.get('failureReason')),
    reviewNotes: parseString(formData.get('reviewNotes')),
  };
  await updateTask(id, patch);
  revalidatePath('/tasks');
  revalidatePath(`/tasks/${id}`);
}

export async function deleteTaskAction(id: string): Promise<void> {
  await deleteTask(id);
  revalidatePath('/tasks');
  redirect('/tasks');
}
