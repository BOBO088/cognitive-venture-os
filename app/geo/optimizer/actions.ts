'use server';

/**
 * GEO Optimizer 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  runGEOAudit,
  GeoOptimizerServiceError,
} from '@/lib/services/geoOptimizerService';
import { OPTIMIZER_INPUT_TYPES } from '@/types';
import type { OptimizerInputType } from '@/types';

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
    throw new GeoOptimizerServiceError(`${fieldName} is required`);
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
    throw new GeoOptimizerServiceError(`${fieldName} is required`);
  }
  if ((allowed as readonly string[]).includes(s)) {
    return s as T;
  }
  throw new GeoOptimizerServiceError(
    `${fieldName} must be one of: ${allowed.join(', ')}`,
  );
}

export async function runGEOAuditAction(
  formData: FormData,
): Promise<void> {
  const assetId = parseRequiredString(formData.get('assetId'), 'assetId');
  const inputType = parseEnum<OptimizerInputType>(
    formData.get('inputType'),
    OPTIMIZER_INPUT_TYPES,
    'inputType',
  );
  await runGEOAudit({
    assetId,
    inputType,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  });
  revalidatePath('/geo/optimizer');
  revalidatePath(`/geo/content-assets/${assetId}`);
  redirect(`/geo/optimizer?assetId=${assetId}`);
}
