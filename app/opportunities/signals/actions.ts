'use server';

/**
 * Signal 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createSignal,
  updateSignal,
  deleteSignal,
  bindEntityToSignal,
  unbindEntityFromSignal,
  bindCardToSignal,
  unbindCardFromSignal,
  SignalServiceError,
} from '@/lib/services/signalService';
import type { SignalCategory } from '@/types';

const CATEGORY_VALUES: SignalCategory[] = [
  'funding',
  'product_launch',
  'github_trend',
  'hiring_signal',
  'customer_pain',
  'regulation',
  'technology_breakthrough',
  'content_trend',
  'geo_trend',
  'ip_trend',
  'short_video_trend',
];

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function parseString(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseMultiline(v: FormDataEntryValue | null): string[] {
  const s = parseString(v);
  if (!s) return [];
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function parseCategory(v: FormDataEntryValue | null): SignalCategory {
  const s = parseString(v);
  return CATEGORY_VALUES.includes(s as SignalCategory)
    ? (s as SignalCategory)
    : 'geo_trend';
}

function parseConfidence(v: FormDataEntryValue | null): number {
  const s = parseString(v);
  if (s === undefined) return 70;
  const n = Number(s);
  return Number.isFinite(n) ? n : 70;
}

function genSignalId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `sig_${Date.now().toString(36)}-${rand}`;
}

export async function createSignalAction(formData: FormData): Promise<void> {
  try {
    const created = await createSignal({
      id: genSignalId(),
      title: parseString(formData.get('title')) ?? '',
      source: parseString(formData.get('source')) ?? '',
      category: parseCategory(formData.get('category')),
      description: parseString(formData.get('description')) ?? '',
      evidence: parseString(formData.get('evidence')),
      confidence: parseConfidence(formData.get('confidence')),
      linkedEntityIds: parseMultiline(formData.get('linkedEntityIds')),
      linkedResearchCardIds: parseMultiline(formData.get('linkedResearchCardIds')),
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    revalidatePath('/opportunities/signals');
    revalidatePath('/graph');
    redirect(`/opportunities/signals/${created.id}`);
  } catch (err) {
    if (err instanceof SignalServiceError) throw err;
    throw err;
  }
}

export async function updateSignalAction(formData: FormData): Promise<void> {
  const id = parseString(formData.get('id'));
  if (!id) {
    throw new SignalServiceError('id is required for update');
  }
  await updateSignal(id, {
    title: parseString(formData.get('title')),
    source: parseString(formData.get('source')),
    category: parseCategory(formData.get('category')),
    description: parseString(formData.get('description')),
    evidence: parseString(formData.get('evidence')),
    confidence: parseConfidence(formData.get('confidence')),
    linkedEntityIds: parseMultiline(formData.get('linkedEntityIds')),
    linkedResearchCardIds: parseMultiline(formData.get('linkedResearchCardIds')),
    updatedAt: MOCK_NOW,
  });
  revalidatePath('/opportunities/signals');
  revalidatePath(`/opportunities/signals/${id}`);
  revalidatePath('/graph');
}

export async function deleteSignalAction(id: string): Promise<void> {
  await deleteSignal(id);
  revalidatePath('/opportunities/signals');
  revalidatePath('/graph');
  redirect('/opportunities/signals');
}

export async function bindEntityAction(
  signalId: string,
  entityId: string,
): Promise<void> {
  await bindEntityToSignal(signalId, entityId);
  revalidatePath(`/opportunities/signals/${signalId}`);
  revalidatePath('/graph');
}

export async function unbindEntityAction(
  signalId: string,
  entityId: string,
): Promise<void> {
  await unbindEntityFromSignal(signalId, entityId);
  revalidatePath(`/opportunities/signals/${signalId}`);
  revalidatePath('/graph');
}

export async function bindCardAction(
  signalId: string,
  cardId: string,
): Promise<void> {
  await bindCardToSignal(signalId, cardId);
  revalidatePath(`/opportunities/signals/${signalId}`);
  revalidatePath('/graph');
}

export async function unbindCardAction(
  signalId: string,
  cardId: string,
): Promise<void> {
  await unbindCardFromSignal(signalId, cardId);
  revalidatePath(`/opportunities/signals/${signalId}`);
  revalidatePath('/graph');
}
