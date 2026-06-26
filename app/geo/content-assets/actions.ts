'use server';

/**
 * ContentAsset 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createContentAsset,
  updateContentAsset,
  deleteContentAsset,
  ContentAssetServiceError,
  type CreateContentAssetInput,
  type UpdateContentAssetInput,
} from '@/lib/services/contentAssetService';
import { CONTENT_ASSET_TYPES } from '@/types';
import type {
  ContentAssetType,
  ContentAssetStructuredEvidence,
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
    throw new ContentAssetServiceError(`${fieldName} is required`);
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
    throw new ContentAssetServiceError(`${fieldName} is required`);
  }
  if ((allowed as readonly string[]).includes(s)) {
    return s as T;
  }
  throw new ContentAssetServiceError(
    `${fieldName} must be one of: ${allowed.join(', ')}`,
  );
}

function parseInteger(
  v: FormDataEntryValue | null,
  fieldName: string,
): number {
  const s = parseString(v);
  if (s === undefined) {
    throw new ContentAssetServiceError(`${fieldName} is required`);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) {
    throw new ContentAssetServiceError(`${fieldName} must be a number`);
  }
  return n;
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

function parseJsonEvidence(
  v: FormDataEntryValue | null,
): ContentAssetStructuredEvidence[] {
  if (v === null) return [];
  if (typeof v !== 'string') return [];
  const t = v.trim();
  if (!t) return [];
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter(
          (x): x is { claim: unknown; source?: unknown; quote?: unknown } =>
            typeof x === 'object' && x !== null,
        )
        .map((x) => {
          const out: ContentAssetStructuredEvidence = {
            claim: String(x.claim ?? ''),
          };
          if (typeof x.source === 'string' && x.source.trim()) {
            out.source = x.source.trim();
          }
          if (typeof x.quote === 'string' && x.quote.trim()) {
            out.quote = x.quote.trim();
          }
          return out;
        });
    } catch {
      return [];
    }
  }
  return [];
}

/** date input value `YYYY-MM-DD` → ISO 8601 datetime. */
function dateInputToIso(v: string | undefined): string {
  if (!v) {
    throw new ContentAssetServiceError('lastUpdated is required');
  }
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    throw new ContentAssetServiceError(
      'lastUpdated must be YYYY-MM-DD format',
    );
  }
  return `${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`;
}

function genContentId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `content_${Date.now().toString(36)}-${rand}`;
}

export async function createContentAssetAction(
  formData: FormData,
): Promise<void> {
  const lastUpdated = dateInputToIso(
    parseString(formData.get('lastUpdated')),
  );
  const input: CreateContentAssetInput = {
    id: genContentId(),
    brandEntityId: parseRequiredString(
      formData.get('brandEntityId'),
      'brandEntityId',
    ),
    title: parseRequiredString(formData.get('title'), 'title'),
    url: parseRequiredString(formData.get('url'), 'url'),
    type: parseEnum<ContentAssetType>(
      formData.get('type'),
      CONTENT_ASSET_TYPES,
      'type',
    ),
    summary: parseRequiredString(formData.get('summary'), 'summary'),
    targetQueryIds: parseJsonStringArray(formData.get('targetQueryIds')),
    structuredEvidence: parseJsonEvidence(formData.get('structuredEvidence')),
    lastUpdated,
    geoScore: parseInteger(formData.get('geoScore'), 'geoScore'),
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createContentAsset(input);
  revalidatePath('/geo/content-assets');
  revalidatePath(`/geo/content-assets/${created.id}`);
  revalidatePath(`/geo/brands/${created.brandEntityId}`);
  redirect(`/geo/content-assets/${created.id}`);
}

export async function updateContentAssetAction(
  formData: FormData,
): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const lastUpdatedRaw = parseString(formData.get('lastUpdated'));
  const patch: UpdateContentAssetInput = {
    brandEntityId: parseString(formData.get('brandEntityId')),
    title: parseString(formData.get('title')),
    url: parseString(formData.get('url')),
    type: (() => {
      const raw = formData.get('type');
      return raw === null
        ? undefined
        : parseEnum<ContentAssetType>(
            raw,
            CONTENT_ASSET_TYPES,
            'type',
          );
    })(),
    summary: parseString(formData.get('summary')),
    targetQueryIds: (() => {
      const raw = formData.get('targetQueryIds');
      return raw === null ? undefined : parseJsonStringArray(raw);
    })(),
    structuredEvidence: (() => {
      const raw = formData.get('structuredEvidence');
      return raw === null ? undefined : parseJsonEvidence(raw);
    })(),
    lastUpdated: lastUpdatedRaw ? dateInputToIso(lastUpdatedRaw) : undefined,
    geoScore: (() => {
      const raw = formData.get('geoScore');
      return raw === null ? undefined : parseInteger(raw, 'geoScore');
    })(),
    updatedAt: MOCK_NOW,
  };
  const updated = await updateContentAsset(id, patch);
  revalidatePath('/geo/content-assets');
  revalidatePath(`/geo/content-assets/${id}`);
  revalidatePath(`/geo/brands/${updated.brandEntityId}`);
}

export async function deleteContentAssetAction(
  id: string,
): Promise<void> {
  await deleteContentAsset(id);
  revalidatePath('/geo/content-assets');
  redirect('/geo/content-assets');
}
