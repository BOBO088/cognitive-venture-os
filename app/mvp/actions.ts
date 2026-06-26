'use server';

/**
 * MVP 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createMVPProject,
  updateMVPProject,
  deleteMVPProject,
  MVPProjectServiceError,
  type CreateMVPProjectInput,
  type UpdateMVPProjectInput,
} from '@/lib/services/mvpProjectService';
import { MVP_STAGES } from '@/types';
import type { MVPStage } from '@/types';

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
    throw new MVPProjectServiceError(`${fieldName} is required`);
  }
  return s;
}

function parseStage(v: FormDataEntryValue | null): MVPStage {
  const s = parseString(v);
  if (s && MVP_STAGES.includes(s as MVPStage)) {
    return s as MVPStage;
  }
  return 'idea';
}

function parseMoney(v: FormDataEntryValue | null): number {
  const s = parseString(v);
  if (s === undefined) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function genMVPProjectId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `mvp_${Date.now().toString(36)}-${rand}`;
}

export async function createMVPProjectAction(
  formData: FormData,
): Promise<void> {
  const input: CreateMVPProjectInput = {
    id: genMVPProjectId(),
    opportunityId: parseRequiredString(
      formData.get('opportunityId'),
      'opportunityId',
    ),
    name: parseRequiredString(formData.get('name'), 'name'),
    description: parseRequiredString(formData.get('description'), 'description'),
    stage: parseStage(formData.get('stage')),
    owner: parseRequiredString(formData.get('owner'), 'owner'),
    startDate: parseRequiredString(formData.get('startDate'), 'startDate'),
    launchDate: parseString(formData.get('launchDate')),
    revenue: parseMoney(formData.get('revenue')),
    cost: parseMoney(formData.get('cost')),
    lessons: parseString(formData.get('lessons')) ?? '',
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createMVPProject(input);
  revalidatePath('/mvp');
  revalidatePath('/mvp/kanban');
  revalidatePath(`/opportunities/${created.opportunityId}`);
  redirect(`/mvp/${created.id}`);
}

export async function updateMVPProjectAction(
  formData: FormData,
): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const launchDateRaw = formData.get('launchDate');
  // form 中 launchDate 字段若为 "" 表示清空，传 null 让 service 走清空分支
  // launchDate 字段策略：未提供（无字段）→ undefined (跳过)；显式空字符串 → null (清空)；其它 → string
  const launchDatePatch: string | null | undefined =
    launchDateRaw === null
      ? undefined
      : typeof launchDateRaw === 'string' && launchDateRaw.trim() === ''
        ? null
        : (parseString(launchDateRaw) ?? null);

  const patch: UpdateMVPProjectInput = {
    opportunityId: parseString(formData.get('opportunityId')),
    name: parseString(formData.get('name')),
    description: parseString(formData.get('description')),
    stage: (() => {
      const s = parseString(formData.get('stage'));
      if (s && MVP_STAGES.includes(s as MVPStage)) return s as MVPStage;
      return undefined;
    })(),
    owner: parseString(formData.get('owner')),
    startDate: parseString(formData.get('startDate')),
    launchDate: launchDatePatch,
    revenue: (() => {
      const raw = formData.get('revenue');
      return raw === null ? undefined : parseMoney(raw);
    })(),
    cost: (() => {
      const raw = formData.get('cost');
      return raw === null ? undefined : parseMoney(raw);
    })(),
    lessons: parseString(formData.get('lessons')) ?? '',
    updatedAt: MOCK_NOW,
  };
  await updateMVPProject(id, patch);
  revalidatePath('/mvp');
  revalidatePath('/mvp/kanban');
  revalidatePath(`/mvp/${id}`);
}

export async function deleteMVPProjectAction(id: string): Promise<void> {
  await deleteMVPProject(id);
  revalidatePath('/mvp');
  revalidatePath('/mvp/kanban');
  redirect('/mvp');
}

export async function transitionStageAction(
  id: string,
  toStage: string,
): Promise<void> {
  if (!MVP_STAGES.includes(toStage as MVPStage)) {
    throw new MVPProjectServiceError(`invalid stage: ${toStage}`);
  }
  const { transitionStage } = await import('@/lib/services/mvpProjectService');
  await transitionStage(id, toStage as MVPStage, MOCK_NOW);
  revalidatePath('/mvp');
  revalidatePath('/mvp/kanban');
  revalidatePath(`/mvp/${id}`);
}
