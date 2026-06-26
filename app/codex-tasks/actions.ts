'use server';

/**
 * Codex Task Generator 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  generateCodexTaskListForPRD,
  deleteCodexTaskRun,
  CodexTaskGeneratorServiceError,
} from '@/lib/services/codexTaskGeneratorService';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function parseString(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseRequiredString(
  v: FormDataEntryValue | null,
  fieldName: string,
): string {
  const s = parseString(v);
  if (s === undefined) {
    throw new CodexTaskGeneratorServiceError(`${fieldName} is required`);
  }
  return s;
}

function genRunId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `run_${Date.now().toString(36)}-${rand}`;
}

export async function generateCodexTaskListAction(
  formData: FormData,
): Promise<void> {
  const prdId = parseRequiredString(formData.get('prdId'), 'prdId');
  const run = await generateCodexTaskListForPRD(prdId, {
    runId: genRunId(),
    createdAt: MOCK_NOW,
  });
  revalidatePath('/codex-tasks');
  revalidatePath(`/codex-tasks/${run.id}`);
  revalidatePath('/tasks');
  revalidatePath(`/prd/${prdId}`);
  redirect(`/codex-tasks/${run.id}`);
}

export async function deleteCodexTaskRunAction(id: string): Promise<void> {
  await deleteCodexTaskRun(id);
  revalidatePath('/codex-tasks');
  revalidatePath('/tasks');
  redirect('/codex-tasks');
}
