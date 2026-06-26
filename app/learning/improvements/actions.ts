'use server';

/**
 * Improvement Log 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createImprovementLog,
  updateImprovementLog,
  deleteImprovementLog,
  ImprovementLogServiceError,
  type CreateImprovementLogInput,
  type UpdateImprovementLogInput,
} from '@/lib/services/improvementLogService';
import { IMPROVEMENT_TARGET_TYPES } from '@/types';
import type { ImprovementTargetType } from '@/types';

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
    throw new ImprovementLogServiceError(`${fieldName} is required`);
  }
  return s;
}

function parseTargetType(v: FormDataEntryValue | null): ImprovementTargetType {
  const s = parseString(v);
  if (s === undefined) {
    throw new ImprovementLogServiceError('targetType is required');
  }
  if (IMPROVEMENT_TARGET_TYPES.includes(s as ImprovementTargetType)) {
    return s as ImprovementTargetType;
  }
  throw new ImprovementLogServiceError(
    `targetType must be one of: ${IMPROVEMENT_TARGET_TYPES.join(', ')}`,
  );
}

function genImprovementLogId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `imp_${Date.now().toString(36)}-${rand}`;
}

export async function createImprovementLogAction(
  formData: FormData,
): Promise<void> {
  const input: CreateImprovementLogInput = {
    id: genImprovementLogId(),
    targetType: parseTargetType(formData.get('targetType')),
    targetId: parseRequiredString(formData.get('targetId'), 'targetId'),
    problem: parseRequiredString(formData.get('problem'), 'problem'),
    suggestion: parseRequiredString(formData.get('suggestion'), 'suggestion'),
    result: parseString(formData.get('result')) ?? '',
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createImprovementLog(input);
  revalidatePath('/learning/improvements');
  revalidatePath(`/learning/improvements/${created.id}`);
  redirect(`/learning/improvements/${created.id}`);
}

export async function updateImprovementLogAction(
  formData: FormData,
): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const patch: UpdateImprovementLogInput = {
    targetType: (() => {
      const raw = formData.get('targetType');
      return raw === null ? undefined : parseTargetType(raw);
    })(),
    targetId: parseString(formData.get('targetId')),
    problem: parseString(formData.get('problem')),
    suggestion: parseString(formData.get('suggestion')),
    result: parseString(formData.get('result')),
    updatedAt: MOCK_NOW,
  };
  await updateImprovementLog(id, patch);
  revalidatePath('/learning/improvements');
  revalidatePath(`/learning/improvements/${id}`);
}

export async function deleteImprovementLogAction(id: string): Promise<void> {
  await deleteImprovementLog(id);
  revalidatePath('/learning/improvements');
  redirect('/learning/improvements');
}
