'use server';

/**
 * Prompt Version 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createPromptVersion,
  updatePromptVersion,
  deletePromptVersion,
  getPromptVersion,
  PromptVersionServiceError,
  type CreatePromptVersionInput,
  type UpdatePromptVersionInput,
} from '@/lib/services/promptVersionService';
import { PROMPT_TYPES } from '@/types';
import type { PromptType } from '@/types';

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
    throw new PromptVersionServiceError(`${fieldName} is required`);
  }
  return s;
}

function parsePromptType(v: FormDataEntryValue | null): PromptType {
  const s = parseString(v);
  if (s === undefined) {
    throw new PromptVersionServiceError('type is required');
  }
  if (PROMPT_TYPES.includes(s as PromptType)) {
    return s as PromptType;
  }
  throw new PromptVersionServiceError(
    `type must be one of: ${PROMPT_TYPES.join(', ')}`,
  );
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

function genPromptVersionId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `prompt_${Date.now().toString(36)}-${rand}`;
}

export async function createPromptVersionAction(
  formData: FormData,
): Promise<void> {
  const input: CreatePromptVersionInput = {
    id: genPromptVersionId(),
    name: parseRequiredString(formData.get('name'), 'name'),
    type: parsePromptType(formData.get('type')),
    content: parseRequiredString(formData.get('content'), 'content'),
    usedFor: parseRequiredString(formData.get('usedFor'), 'usedFor'),
    score: parseScoreOrNull(formData.get('score')) ?? null,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createPromptVersion(input);
  revalidatePath('/learning/prompts');
  revalidatePath(`/learning/prompts/${created.id}`);
  redirect(`/learning/prompts/${created.id}`);
}

export async function updatePromptVersionAction(
  formData: FormData,
): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const patch: UpdatePromptVersionInput = {
    name: parseString(formData.get('name')),
    type: (() => {
      const raw = formData.get('type');
      return raw === null ? undefined : parsePromptType(raw);
    })(),
    content: parseString(formData.get('content')),
    usedFor: parseString(formData.get('usedFor')),
    score: parseScoreOrNull(formData.get('score')),
    updatedAt: MOCK_NOW,
  };
  await updatePromptVersion(id, patch);
  revalidatePath('/learning/prompts');
  revalidatePath(`/learning/prompts/${id}`);
}

export async function deletePromptVersionAction(id: string): Promise<void> {
  await deletePromptVersion(id);
  revalidatePath('/learning/prompts');
  redirect('/learning/prompts');
}

export async function getPromptVersionMeta(id: string) {
  return getPromptVersion(id);
}
