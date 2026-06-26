'use server';

/**
 * Launch Result 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createLaunchResult,
  updateLaunchResult,
  deleteLaunchResult,
  getLaunchResult,
  LaunchResultServiceError,
  type CreateLaunchResultInput,
  type UpdateLaunchResultInput,
} from '@/lib/services/launchResultService';
import { LAUNCH_RESULT_STATUSES } from '@/types';
import type { LaunchResultStatus } from '@/types';

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
    throw new LaunchResultServiceError(`${fieldName} is required`);
  }
  return s;
}

function parseNonNegativeInt(v: FormDataEntryValue | null): number {
  const s = parseString(v);
  if (s === undefined) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function parsePercent(v: FormDataEntryValue | null): number {
  const s = parseString(v);
  if (s === undefined) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function parseStatus(v: FormDataEntryValue | null): LaunchResultStatus | undefined {
  const s = parseString(v);
  if (s === undefined) return undefined;
  if (LAUNCH_RESULT_STATUSES.includes(s as LaunchResultStatus)) {
    return s as LaunchResultStatus;
  }
  return undefined;
}

function genLaunchResultId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `result_${Date.now().toString(36)}-${rand}`;
}

export async function createLaunchResultAction(
  formData: FormData,
): Promise<void> {
  const input: CreateLaunchResultInput = {
    id: genLaunchResultId(),
    mvpProjectId: parseRequiredString(
      formData.get('mvpProjectId'),
      'mvpProjectId',
    ),
    launchDate: parseRequiredString(
      formData.get('launchDate'),
      'launchDate',
    ),
    users: parseNonNegativeInt(formData.get('users')),
    signups: parseNonNegativeInt(formData.get('signups')),
    revenue: parseNonNegativeInt(formData.get('revenue')),
    traffic: parseNonNegativeInt(formData.get('traffic')),
    conversionRate: parsePercent(formData.get('conversionRate')),
    retentionRate: parsePercent(formData.get('retentionRate')),
    feedbackSummary: parseString(formData.get('feedbackSummary')),
    resultStatus: parseStatus(formData.get('resultStatus')),
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createLaunchResult(input);
  revalidatePath('/learning/launch-results');
  revalidatePath(`/learning/launch-results/${created.id}`);
  revalidatePath(`/mvp/${created.mvpProjectId}`);
  redirect(`/learning/launch-results/${created.id}`);
}

export async function updateLaunchResultAction(
  formData: FormData,
): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const patch: UpdateLaunchResultInput = {
    mvpProjectId: parseString(formData.get('mvpProjectId')),
    launchDate: parseString(formData.get('launchDate')),
    users: (() => {
      const raw = formData.get('users');
      return raw === null ? undefined : parseNonNegativeInt(raw);
    })(),
    signups: (() => {
      const raw = formData.get('signups');
      return raw === null ? undefined : parseNonNegativeInt(raw);
    })(),
    revenue: (() => {
      const raw = formData.get('revenue');
      return raw === null ? undefined : parseNonNegativeInt(raw);
    })(),
    traffic: (() => {
      const raw = formData.get('traffic');
      return raw === null ? undefined : parseNonNegativeInt(raw);
    })(),
    conversionRate: (() => {
      const raw = formData.get('conversionRate');
      return raw === null ? undefined : parsePercent(raw);
    })(),
    retentionRate: (() => {
      const raw = formData.get('retentionRate');
      return raw === null ? undefined : parsePercent(raw);
    })(),
    feedbackSummary: parseString(formData.get('feedbackSummary')),
    resultStatus: parseStatus(formData.get('resultStatus')),
    updatedAt: MOCK_NOW,
  };
  const updated = await updateLaunchResult(id, patch);
  revalidatePath('/learning/launch-results');
  revalidatePath(`/learning/launch-results/${id}`);
  revalidatePath(`/mvp/${updated.mvpProjectId}`);
}

export async function deleteLaunchResultAction(id: string): Promise<void> {
  const existing = await getLaunchResult(id);
  await deleteLaunchResult(id);
  revalidatePath('/learning/launch-results');
  if (existing) {
    revalidatePath(`/mvp/${existing.mvpProjectId}`);
  }
  redirect('/learning/launch-results');
}
