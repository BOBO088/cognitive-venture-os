'use server';

/**
 * Graph Relation 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createRelation,
  updateRelation,
  deleteRelation,
  bindCardToRelation,
  unbindCardFromRelation,
  GraphRelationServiceError,
} from '@/lib/services/graphRelationService';
import { getResearchCard } from '@/lib/repos/research';
import type { GraphRelationKind } from '@/types';

const KIND_VALUES: GraphRelationKind[] = [
  'competes_with', 'invested_by', 'built_by', 'uses',
  'belongs_to', 'growing_in', 'mentioned_in', 'supports',
  'contradicts', 'influences', 'similar_to', 'alternative_to',
];

function parseString(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseMultiline(v: FormDataEntryValue | null): string[] {
  const s = parseString(v);
  if (!s) return [];
  return s.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}

function parseKind(v: FormDataEntryValue | null): GraphRelationKind {
  const s = parseString(v);
  return KIND_VALUES.includes(s as GraphRelationKind) ? (s as GraphRelationKind) : 'competes_with';
}

function parseStrength(v: FormDataEntryValue | null): number {
  const s = parseString(v);
  if (s === undefined) return 50;
  const n = Number(s);
  return Number.isFinite(n) ? n : 50;
}

export async function createRelationAction(formData: FormData): Promise<void> {
  try {
    const created = await createRelation({
      sourceEntityId: parseString(formData.get('sourceEntityId')) ?? '',
      targetEntityId: parseString(formData.get('targetEntityId')) ?? '',
      relationType: parseKind(formData.get('relationType')),
      strength: parseStrength(formData.get('strength')),
      evidence: parseString(formData.get('evidence')),
      linkedResearchCardIds: parseMultiline(formData.get('linkedResearchCardIds')),
    });
    revalidatePath('/graph/relations');
    revalidatePath('/graph/entities');
    redirect(`/graph/relations/${created.id}`);
  } catch (err) {
    if (err instanceof GraphRelationServiceError) throw err;
    throw err;
  }
}

export async function updateRelationAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await updateRelation(id, {
    sourceEntityId: parseString(formData.get('sourceEntityId')),
    targetEntityId: parseString(formData.get('targetEntityId')),
    relationType: parseKind(formData.get('relationType')),
    strength: parseStrength(formData.get('strength')),
    evidence: parseString(formData.get('evidence')),
    linkedResearchCardIds: parseMultiline(formData.get('linkedResearchCardIds')),
  });
  revalidatePath('/graph/relations');
  revalidatePath(`/graph/relations/${id}`);
  revalidatePath('/graph/entities');
}

export async function deleteRelationAction(id: string): Promise<void> {
  await deleteRelation(id);
  revalidatePath('/graph/relations');
  revalidatePath('/graph/entities');
  redirect('/graph/relations');
}

export async function bindCardAction(relationId: string, cardId: string): Promise<void> {
  // 验证 card 存在（防止引用悬空）
  const card = await getResearchCard(cardId);
  if (!card) {
    throw new GraphRelationServiceError(`card not found: ${cardId}`);
  }
  await bindCardToRelation(relationId, cardId);
  revalidatePath(`/graph/relations/${relationId}`);
}

export async function unbindCardAction(relationId: string, cardId: string): Promise<void> {
  await unbindCardFromRelation(relationId, cardId);
  revalidatePath(`/graph/relations/${relationId}`);
}
