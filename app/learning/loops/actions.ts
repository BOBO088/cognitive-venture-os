'use server';

/**
 * Loop Version 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createLoopVersion,
  updateLoopVersion,
  deleteLoopVersion,
  LoopVersionServiceError,
  type CreateLoopVersionInput,
  type UpdateLoopVersionInput,
} from '@/lib/services/loopVersionService';

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
    throw new LoopVersionServiceError(`${fieldName} is required`);
  }
  return s;
}

function parseSteps(v: FormDataEntryValue | null): string[] {
  const s = parseString(v);
  if (s === undefined) {
    throw new LoopVersionServiceError('steps is required');
  }
  // 服务端再 split 一次，避免依赖 client 把 JSON 反序列化。
  // 表单可能传 JSON 数组（client 编码）或 newline 文本（直接 raw）。
  const t = s.trim();
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x));
      }
    } catch {
      // fall through to newline split
    }
  }
  return t.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
}

function parseScoreOrNull(v: FormDataEntryValue | null): number | null | undefined {
  if (v === null) return undefined;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

function genLoopVersionId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `loop_${Date.now().toString(36)}-${rand}`;
}

export async function createLoopVersionAction(
  formData: FormData,
): Promise<void> {
  const input: CreateLoopVersionInput = {
    id: genLoopVersionId(),
    name: parseRequiredString(formData.get('name'), 'name'),
    steps: parseSteps(formData.get('steps')),
    stopCondition: parseRequiredString(
      formData.get('stopCondition'),
      'stopCondition',
    ),
    evaluationCriteria: parseRequiredString(
      formData.get('evaluationCriteria'),
      'evaluationCriteria',
    ),
    score: parseScoreOrNull(formData.get('score')) ?? null,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createLoopVersion(input);
  revalidatePath('/learning/loops');
  revalidatePath(`/learning/loops/${created.id}`);
  redirect(`/learning/loops/${created.id}`);
}

export async function updateLoopVersionAction(
  formData: FormData,
): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const patch: UpdateLoopVersionInput = {
    name: parseString(formData.get('name')),
    steps: (() => {
      const raw = formData.get('steps');
      return raw === null ? undefined : parseSteps(raw);
    })(),
    stopCondition: parseString(formData.get('stopCondition')),
    evaluationCriteria: parseString(formData.get('evaluationCriteria')),
    score: parseScoreOrNull(formData.get('score')),
    updatedAt: MOCK_NOW,
  };
  await updateLoopVersion(id, patch);
  revalidatePath('/learning/loops');
  revalidatePath(`/learning/loops/${id}`);
}

export async function deleteLoopVersionAction(id: string): Promise<void> {
  await deleteLoopVersion(id);
  revalidatePath('/learning/loops');
  redirect('/learning/loops');
}
