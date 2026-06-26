'use server';

/**
 * Research Card 的 server actions。
 *
 * UI 只 import 这里暴露的函数，从不直接 import service / repo / provider。
 * AI 草稿生成走 LLMProvider（service 编排），UI 拿到的是已规范化的 CardDraft。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createCard,
  updateCard,
  deleteCard,
  createCardFromSource,
  createCardFromTopic,
  generateCardDraftFromSource,
  generateCardDraftFromTopic,
  ResearchCardServiceError,
} from '@/lib/services/researchCardService';
import { getResearchTopic, getSourceItem } from '@/lib/repos/research';
import type { CardDraft } from '@/lib/providers/llm';

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
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseTags(v: FormDataEntryValue | null): string[] {
  const s = parseString(v);
  if (!s) return [];
  return s
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function parseScore(v: FormDataEntryValue | null): number | undefined {
  const s = parseString(v);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function createCardAction(formData: FormData): Promise<void> {
  try {
    const created = await createCard({
      topicId: parseString(formData.get('topicId')) ?? '',
      sourceIds: parseMultiline(formData.get('sourceIds')),
      title: parseString(formData.get('title')) ?? '',
      summary: parseString(formData.get('summary')) ?? '',
      keyInsights: parseMultiline(formData.get('keyInsights')),
      evidence: parseMultiline(formData.get('evidence')),
      risks: parseMultiline(formData.get('risks')),
      tags: parseTags(formData.get('tags')),
      score: parseScore(formData.get('score')),
    });
    revalidatePath('/research/cards');
    revalidatePath('/research/topics');
    redirect(`/research/cards/${created.id}`);
  } catch (err) {
    if (err instanceof ResearchCardServiceError) throw err;
    throw err;
  }
}

export async function updateCardAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await updateCard(id, {
    topicId: parseString(formData.get('topicId')),
    sourceIds: parseMultiline(formData.get('sourceIds')),
    title: parseString(formData.get('title')),
    summary: parseString(formData.get('summary')),
    keyInsights: parseMultiline(formData.get('keyInsights')),
    evidence: parseMultiline(formData.get('evidence')),
    risks: parseMultiline(formData.get('risks')),
    tags: parseTags(formData.get('tags')),
    score: parseScore(formData.get('score')),
  });
  revalidatePath('/research/cards');
  revalidatePath(`/research/cards/${id}`);
  revalidatePath('/research/topics');
}

export async function deleteCardAction(id: string): Promise<void> {
  await deleteCard(id);
  revalidatePath('/research/cards');
  revalidatePath('/research/topics');
  redirect('/research/cards');
}

/**
 * 调 LLMProvider 生成卡片草稿（不写入数据库）。
 * UI 拿到草稿后预填表单，operator 修改后再点 Save。
 */
export async function generateCardDraftAction(args: {
  sourceId?: string;
  topicId?: string;
}): Promise<CardDraft | null> {
  if (args.sourceId) {
    const source = await getSourceItem(args.sourceId);
    if (!source) {
      throw new ResearchCardServiceError(`source not found: ${args.sourceId}`);
    }
    return generateCardDraftFromSource(source);
  }
  if (args.topicId) {
    const topic = await getResearchTopic(args.topicId);
    if (!topic) {
      throw new ResearchCardServiceError(`topic not found: ${args.topicId}`);
    }
    return generateCardDraftFromTopic(topic, topic.sourceIds);
  }
  return null;
}

/**
 * 一步式：从 source 生成 + 入库，返回新卡片 id。
 * UI 拿到 id 后跳详情。
 */
export async function createCardFromSourceAction(args: {
  sourceId: string;
  topicId: string;
}): Promise<{ id: string } | null> {
  const source = await getSourceItem(args.sourceId);
  if (!source) {
    throw new ResearchCardServiceError(`source not found: ${args.sourceId}`);
  }
  const created = await createCardFromSource(source, args.topicId);
  revalidatePath('/research/cards');
  revalidatePath('/research/topics');
  return { id: created.id };
}

/**
 * 一步式：从 topic 生成 + 入库，返回新卡片 id。
 */
export async function createCardFromTopicAction(args: {
  topicId: string;
  sourceIds: string[];
}): Promise<{ id: string } | null> {
  const topic = await getResearchTopic(args.topicId);
  if (!topic) {
    throw new ResearchCardServiceError(`topic not found: ${args.topicId}`);
  }
  const created = await createCardFromTopic(topic, args.sourceIds);
  revalidatePath('/research/cards');
  revalidatePath('/research/topics');
  return { id: created.id };
}
