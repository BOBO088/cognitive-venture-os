'use server';

/**
 * BrandEntityProfile 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createBrandEntityProfile,
  updateBrandEntityProfile,
  deleteBrandEntityProfile,
  GeoBrandServiceError,
  type CreateBrandEntityProfileInput,
  type UpdateBrandEntityProfileInput,
} from '@/lib/services/geoBrandService';
import { BRAND_ENTITY_CATEGORIES } from '@/types';
import type { BrandEntityCategory } from '@/types';

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
    throw new GeoBrandServiceError(`${fieldName} is required`);
  }
  return s;
}

function parseCategory(v: FormDataEntryValue | null): BrandEntityCategory {
  const s = parseString(v);
  if (s === undefined) {
    throw new GeoBrandServiceError('category is required');
  }
  if (BRAND_ENTITY_CATEGORIES.includes(s as BrandEntityCategory)) {
    return s as BrandEntityCategory;
  }
  throw new GeoBrandServiceError(
    `category must be one of: ${BRAND_ENTITY_CATEGORIES.join(', ')}`,
  );
}

function parseJsonStringArray(v: FormDataEntryValue | null): string[] {
  if (v === null) return [];
  if (typeof v !== 'string') return [];
  const t = v.trim();
  if (!t) return [];
  // 表单把多行字符串转成 JSON 数组（client 端 handleSubmit 已经做了）
  // 但若是裸多行文本，这里再 split 一次兜底
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x));
      }
    } catch {
      // fall through
    }
  }
  return t
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function genProfileId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `profile_${Date.now().toString(36)}-${rand}`;
}

export async function createBrandEntityProfileAction(
  formData: FormData,
): Promise<void> {
  const input: CreateBrandEntityProfileInput = {
    id: genProfileId(),
    name: parseRequiredString(formData.get('name'), 'name'),
    description: parseRequiredString(
      formData.get('description'),
      'description',
    ),
    category: parseCategory(formData.get('category')),
    targetAudience: parseRequiredString(
      formData.get('targetAudience'),
      'targetAudience',
    ),
    competitors: parseJsonStringArray(formData.get('competitors')),
    keyClaims: parseJsonStringArray(formData.get('keyClaims')),
    proofPoints: parseJsonStringArray(formData.get('proofPoints')),
    officialLinks: parseJsonStringArray(formData.get('officialLinks')),
    relatedProjectIds: parseJsonStringArray(formData.get('relatedProjectIds')),
    relatedEntityIds: parseJsonStringArray(formData.get('relatedEntityIds')),
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createBrandEntityProfile(input);
  revalidatePath('/geo/brands');
  revalidatePath(`/geo/brands/${created.id}`);
  // 跨实体：刷新关联 MVP / Entity 详情
  for (const pid of created.relatedProjectIds) {
    revalidatePath(`/mvp/${pid}`);
  }
  for (const eid of created.relatedEntityIds) {
    revalidatePath(`/graph/entities/${eid}`);
  }
  redirect(`/geo/brands/${created.id}`);
}

export async function updateBrandEntityProfileAction(
  formData: FormData,
): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const patch: UpdateBrandEntityProfileInput = {
    name: parseString(formData.get('name')),
    description: parseString(formData.get('description')),
    category: (() => {
      const raw = formData.get('category');
      return raw === null ? undefined : parseCategory(raw);
    })(),
    targetAudience: parseString(formData.get('targetAudience')),
    competitors: (() => {
      const raw = formData.get('competitors');
      return raw === null ? undefined : parseJsonStringArray(raw);
    })(),
    keyClaims: (() => {
      const raw = formData.get('keyClaims');
      return raw === null ? undefined : parseJsonStringArray(raw);
    })(),
    proofPoints: (() => {
      const raw = formData.get('proofPoints');
      return raw === null ? undefined : parseJsonStringArray(raw);
    })(),
    officialLinks: (() => {
      const raw = formData.get('officialLinks');
      return raw === null ? undefined : parseJsonStringArray(raw);
    })(),
    relatedProjectIds: (() => {
      const raw = formData.get('relatedProjectIds');
      return raw === null ? undefined : parseJsonStringArray(raw);
    })(),
    relatedEntityIds: (() => {
      const raw = formData.get('relatedEntityIds');
      return raw === null ? undefined : parseJsonStringArray(raw);
    })(),
    updatedAt: MOCK_NOW,
  };
  const updated = await updateBrandEntityProfile(id, patch);
  revalidatePath('/geo/brands');
  revalidatePath(`/geo/brands/${id}`);
  for (const pid of updated.relatedProjectIds) {
    revalidatePath(`/mvp/${pid}`);
  }
  for (const eid of updated.relatedEntityIds) {
    revalidatePath(`/graph/entities/${eid}`);
  }
}

export async function deleteBrandEntityProfileAction(
  id: string,
): Promise<void> {
  await deleteBrandEntityProfile(id);
  revalidatePath('/geo/brands');
  redirect('/geo/brands');
}
