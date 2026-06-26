'use server';

/**
 * Source Library 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createSource,
  updateSource,
  deleteSource,
  SourceServiceError,
} from '@/lib/services/sourceService';
import type { SourceType } from '@/types';

const TYPE_VALUES: SourceType[] = [
  'article', 'paper', 'video', 'website', 'note', 'report', 'book', 'podcast',
];

function parseString(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseType(v: FormDataEntryValue | null): SourceType {
  const s = parseString(v);
  return TYPE_VALUES.includes(s as SourceType) ? (s as SourceType) : 'website';
}

function parseNumber(v: FormDataEntryValue | null): number | undefined {
  const s = parseString(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseTags(v: FormDataEntryValue | null): string[] {
  const s = parseString(v);
  if (!s) return [];
  return s.split(/[,\n]/).map((t) => t.trim()).filter((t) => t.length > 0);
}

export async function createSourceAction(formData: FormData): Promise<void> {
  try {
    const created = await createSource({
      title: parseString(formData.get('title')) ?? '',
      type: parseType(formData.get('type')),
      topicId: parseString(formData.get('topicId')),
      url: parseString(formData.get('url')),
      summary: parseString(formData.get('summary')),
      credibilityScore: parseNumber(formData.get('credibilityScore')),
      tags: parseTags(formData.get('tags')),
      notes: parseString(formData.get('notes')),
      author: parseString(formData.get('author')),
      publishedAt: parseString(formData.get('publishedAt')),
    });
    revalidatePath('/research/sources');
    revalidatePath('/research/topics');
    redirect(`/research/sources/${created.id}`);
  } catch (err) {
    if (err instanceof SourceServiceError) throw err;
    throw err;
  }
}

export async function updateSourceAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await updateSource(id, {
    title: parseString(formData.get('title')),
    type: parseType(formData.get('type')),
    topicId: parseString(formData.get('topicId')),
    url: parseString(formData.get('url')),
    summary: parseString(formData.get('summary')),
    credibilityScore: parseNumber(formData.get('credibilityScore')),
    tags: parseTags(formData.get('tags')),
    notes: parseString(formData.get('notes')),
    author: parseString(formData.get('author')),
    publishedAt: parseString(formData.get('publishedAt')),
  });
  revalidatePath('/research/sources');
  revalidatePath(`/research/sources/${id}`);
  revalidatePath('/research/topics');
}

export async function deleteSourceAction(id: string): Promise<void> {
  await deleteSource(id);
  revalidatePath('/research/sources');
  revalidatePath('/research/topics');
  redirect('/research/sources');
}
