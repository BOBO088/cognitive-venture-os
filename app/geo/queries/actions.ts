'use server';

/**
 * AI Query Bank 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createAIQueryBankItem,
  updateAIQueryBankItem,
  deleteAIQueryBankItem,
  generateAIQueryBankForBrand,
  AIQueryServiceError,
  type CreateAIQueryBankItemInput,
  type UpdateAIQueryBankItemInput,
  type GenerateAIQueryBankInput,
} from '@/lib/services/aiQueryService';
import {
  AI_QUERY_BANK_INTENTS,
  AI_QUERY_BANK_PLATFORMS,
  AI_QUERY_BANK_PRIORITIES,
  AI_QUERY_BANK_STATUSES,
} from '@/types';
import type {
  AIQueryBankIntent,
  AIQueryBankPlatform,
  AIQueryBankPriority,
  AIQueryBankStatus,
} from '@/types';

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
    throw new AIQueryServiceError(`${fieldName} is required`);
  }
  return s;
}

function parseEnum<T extends string>(
  v: FormDataEntryValue | null,
  allowed: readonly T[],
  fieldName: string,
): T {
  const s = parseString(v);
  if (s === undefined) {
    throw new AIQueryServiceError(`${fieldName} is required`);
  }
  if ((allowed as readonly string[]).includes(s)) {
    return s as T;
  }
  throw new AIQueryServiceError(
    `${fieldName} must be one of: ${allowed.join(', ')}`,
  );
}

function parseJsonStringArray(v: FormDataEntryValue | null): string[] {
  if (v === null) return [];
  if (typeof v !== 'string') return [];
  const t = v.trim();
  if (!t) return [];
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.map((x) => String(x));
    } catch {
      // fall through
    }
  }
  return t
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function genBankItemId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `bank_${Date.now().toString(36)}-${rand}`;
}

export async function createAIQueryBankItemAction(
  formData: FormData,
): Promise<void> {
  const input: CreateAIQueryBankItemInput = {
    id: genBankItemId(),
    brandEntityId: parseRequiredString(
      formData.get('brandEntityId'),
      'brandEntityId',
    ),
    query: parseRequiredString(formData.get('query'), 'query'),
    intent: parseEnum<AIQueryBankIntent>(
      formData.get('intent'),
      AI_QUERY_BANK_INTENTS,
      'intent',
    ),
    platform: parseEnum<AIQueryBankPlatform>(
      formData.get('platform'),
      AI_QUERY_BANK_PLATFORMS,
      'platform',
    ),
    priority: parseEnum<AIQueryBankPriority>(
      formData.get('priority'),
      AI_QUERY_BANK_PRIORITIES,
      'priority',
    ),
    status: parseEnum<AIQueryBankStatus>(
      formData.get('status'),
      AI_QUERY_BANK_STATUSES,
      'status',
    ),
    linkedAssetIds: parseJsonStringArray(formData.get('linkedAssetIds')),
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createAIQueryBankItem(input);
  revalidatePath('/geo/queries');
  revalidatePath(`/geo/queries/${created.id}`);
  revalidatePath(`/geo/brands/${created.brandEntityId}`);
  redirect(`/geo/queries/${created.id}`);
}

export async function updateAIQueryBankItemAction(
  formData: FormData,
): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const patch: UpdateAIQueryBankItemInput = {
    brandEntityId: parseString(formData.get('brandEntityId')),
    query: parseString(formData.get('query')),
    intent: (() => {
      const raw = formData.get('intent');
      return raw === null
        ? undefined
        : parseEnum<AIQueryBankIntent>(
            raw,
            AI_QUERY_BANK_INTENTS,
            'intent',
          );
    })(),
    platform: (() => {
      const raw = formData.get('platform');
      return raw === null
        ? undefined
        : parseEnum<AIQueryBankPlatform>(
            raw,
            AI_QUERY_BANK_PLATFORMS,
            'platform',
          );
    })(),
    priority: (() => {
      const raw = formData.get('priority');
      return raw === null
        ? undefined
        : parseEnum<AIQueryBankPriority>(
            raw,
            AI_QUERY_BANK_PRIORITIES,
            'priority',
          );
    })(),
    status: (() => {
      const raw = formData.get('status');
      return raw === null
        ? undefined
        : parseEnum<AIQueryBankStatus>(
            raw,
            AI_QUERY_BANK_STATUSES,
            'status',
          );
    })(),
    linkedAssetIds: (() => {
      const raw = formData.get('linkedAssetIds');
      return raw === null ? undefined : parseJsonStringArray(raw);
    })(),
    updatedAt: MOCK_NOW,
  };
  const updated = await updateAIQueryBankItem(id, patch);
  revalidatePath('/geo/queries');
  revalidatePath(`/geo/queries/${id}`);
  revalidatePath(`/geo/brands/${updated.brandEntityId}`);
}

export async function deleteAIQueryBankItemAction(
  id: string,
): Promise<void> {
  await deleteAIQueryBankItem(id);
  revalidatePath('/geo/queries');
  redirect('/geo/queries');
}

export async function generateAIQueryBankForBrandAction(
  formData: FormData,
): Promise<void> {
  const input: GenerateAIQueryBankInput = {
    brandEntityId: parseRequiredString(
      formData.get('brandEntityId'),
      'brandEntityId',
    ),
    intent: parseEnum<AIQueryBankIntent>(
      formData.get('intent'),
      AI_QUERY_BANK_INTENTS,
      'intent',
    ),
    platform: parseEnum<AIQueryBankPlatform>(
      formData.get('platform'),
      AI_QUERY_BANK_PLATFORMS,
      'platform',
    ),
    count: Number(formData.get('count') ?? '3'),
    defaultPriority: parseEnum<AIQueryBankPriority>(
      formData.get('defaultPriority') ?? 'medium',
      AI_QUERY_BANK_PRIORITIES,
      'defaultPriority',
    ),
    defaultStatus: parseEnum<AIQueryBankStatus>(
      formData.get('defaultStatus') ?? 'active',
      AI_QUERY_BANK_STATUSES,
      'defaultStatus',
    ),
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await generateAIQueryBankForBrand(input);
  revalidatePath('/geo/queries');
  revalidatePath(`/geo/brands/${input.brandEntityId}`);
  // 跳到第一条新生成的详情，让用户立刻看到结果
  if (created.length > 0) {
    redirect(`/geo/queries/${created[0]!.id}`);
  } else {
    redirect('/geo/queries');
  }
}
