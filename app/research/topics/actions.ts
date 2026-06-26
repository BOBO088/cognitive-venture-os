'use server';

/**
 * Research Topic 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createTopic,
  updateTopic,
  deleteTopic,
  ResearchTopicServiceError,
} from '@/lib/services/researchTopicService';
import type {
  ResearchTopicStatus,
  ResearchCategory,
  ResearchPriority,
} from '@/types';

const STATUS_VALUES: ResearchTopicStatus[] = ['active', 'completed', 'archived'];
const CATEGORY_VALUES: ResearchCategory[] = [
  'ai', 'ip', 'geo', 'short_video', 'saas', 'investment', 'other',
];
const PRIORITY_VALUES: ResearchPriority[] = ['low', 'medium', 'high'];

function parseString(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseStatus(v: FormDataEntryValue | null): ResearchTopicStatus {
  const s = parseString(v);
  return STATUS_VALUES.includes(s as ResearchTopicStatus)
    ? (s as ResearchTopicStatus)
    : 'active';
}

function parseCategory(v: FormDataEntryValue | null): ResearchCategory | undefined {
  const s = parseString(v);
  return CATEGORY_VALUES.includes(s as ResearchCategory)
    ? (s as ResearchCategory)
    : undefined;
}

function parsePriority(v: FormDataEntryValue | null): ResearchPriority {
  const s = parseString(v);
  return PRIORITY_VALUES.includes(s as ResearchPriority)
    ? (s as ResearchPriority)
    : 'medium';
}

function parseTags(v: FormDataEntryValue | null): string[] {
  const s = parseString(v);
  if (!s) return [];
  return s.split(/[,\n]/).map((t) => t.trim()).filter((t) => t.length > 0);
}

export async function createTopicAction(formData: FormData): Promise<void> {
  try {
    const created = await createTopic({
      title: parseString(formData.get('title')) ?? '',
      description: parseString(formData.get('description')),
      category: parseCategory(formData.get('category')),
      priority: parsePriority(formData.get('priority')),
      tags: parseTags(formData.get('tags')),
      status: parseStatus(formData.get('status')),
      question: parseString(formData.get('question')),
      scope: parseString(formData.get('scope')),
    });
    revalidatePath('/research/topics');
    redirect(`/research/topics/${created.id}`);
  } catch (err) {
    if (err instanceof ResearchTopicServiceError) {
      throw err;
    }
    throw err;
  }
}

export async function updateTopicAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await updateTopic(id, {
    title: parseString(formData.get('title')),
    description: parseString(formData.get('description')),
    category: parseCategory(formData.get('category')),
    priority: parsePriority(formData.get('priority')),
    tags: parseTags(formData.get('tags')),
    status: parseStatus(formData.get('status')),
    question: parseString(formData.get('question')),
    scope: parseString(formData.get('scope')),
  });
  revalidatePath('/research/topics');
  revalidatePath(`/research/topics/${id}`);
}

export async function deleteTopicAction(id: string): Promise<void> {
  await deleteTopic(id);
  revalidatePath('/research/topics');
  redirect('/research/topics');
}
