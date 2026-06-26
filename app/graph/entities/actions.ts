'use server';

/**
 * Graph Entity 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createEntity,
  updateEntity,
  deleteEntity,
  bindCardToEntity,
  unbindCardFromEntity,
  GraphEntityServiceError,
} from '@/lib/services/graphEntityService';
import type { GraphEntityKind } from '@/types';

const KIND_VALUES: GraphEntityKind[] = [
  'company', 'product', 'person', 'technology',
  'market', 'trend', 'investor', 'ip',
  'character', 'content_asset', 'platform', 'tool',
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

function parseTags(v: FormDataEntryValue | null): string[] {
  const s = parseString(v);
  if (!s) return [];
  return s.split(/[,\n]/).map((t) => t.trim()).filter((t) => t.length > 0);
}

function parseKind(v: FormDataEntryValue | null): GraphEntityKind {
  const s = parseString(v);
  return KIND_VALUES.includes(s as GraphEntityKind) ? (s as GraphEntityKind) : 'company';
}

function parseMetadata(v: FormDataEntryValue | null): Record<string, string> | undefined {
  const s = parseString(v);
  if (!s) return undefined;
  // 接受 "k=v\nk=v" 格式
  const out: Record<string, string> = {};
  for (const line of s.split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*(.+)$/);
    if (m) out[m[1]!] = m[2]!.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function createEntityAction(formData: FormData): Promise<void> {
  try {
    const created = await createEntity({
      name: parseString(formData.get('name')) ?? '',
      kind: parseKind(formData.get('kind')),
      aliases: parseMultiline(formData.get('aliases')),
      description: parseString(formData.get('description')),
      tags: parseTags(formData.get('tags')),
      metadata: parseMetadata(formData.get('metadata')),
    });
    revalidatePath('/graph/entities');
    redirect(`/graph/entities/${created.id}`);
  } catch (err) {
    if (err instanceof GraphEntityServiceError) throw err;
    throw err;
  }
}

export async function updateEntityAction(
  id: string,
  formData: FormData,
): Promise<void> {
  await updateEntity(id, {
    name: parseString(formData.get('name')),
    kind: parseKind(formData.get('kind')),
    aliases: parseMultiline(formData.get('aliases')),
    description: parseString(formData.get('description')),
    tags: parseTags(formData.get('tags')),
    metadata: parseMetadata(formData.get('metadata')),
  });
  revalidatePath('/graph/entities');
  revalidatePath(`/graph/entities/${id}`);
}

export async function deleteEntityAction(id: string): Promise<void> {
  await deleteEntity(id);
  revalidatePath('/graph/entities');
  redirect('/graph/entities');
}

export async function bindCardAction(entityId: string, cardId: string): Promise<void> {
  await bindCardToEntity(entityId, cardId);
  revalidatePath(`/graph/entities/${entityId}`);
}

export async function unbindCardAction(entityId: string, cardId: string): Promise<void> {
  await unbindCardFromEntity(entityId, cardId);
  revalidatePath(`/graph/entities/${entityId}`);
}
