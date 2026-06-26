'use server';

/**
 * Citation Monitor 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  runCitationCheck,
  CitationMonitorServiceError,
} from '@/lib/services/citationMonitorService';
import { CITATION_PLATFORMS } from '@/types';
import type { CitationPlatform } from '@/types';

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
    throw new CitationMonitorServiceError(`${fieldName} is required`);
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
    throw new CitationMonitorServiceError(`${fieldName} is required`);
  }
  if ((allowed as readonly string[]).includes(s)) {
    return s as T;
  }
  throw new CitationMonitorServiceError(
    `${fieldName} must be one of: ${allowed.join(', ')}`,
  );
}

export async function runCitationCheckAction(
  formData: FormData,
): Promise<void> {
  const queryId = parseRequiredString(formData.get('queryId'), 'queryId');
  const platform = parseEnum<CitationPlatform>(
    formData.get('platform'),
    CITATION_PLATFORMS,
    'platform',
  );
  const checkedAt = parseRequiredString(formData.get('checkedAt'), 'checkedAt');
  const created = await runCitationCheck({
    queryId,
    platform,
    checkedAt,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  });
  revalidatePath('/geo/citation-monitor');
  revalidatePath(`/geo/citation-monitor/${created.id}`);
  revalidatePath('/geo/reports');
  redirect(`/geo/citation-monitor/${created.id}`);
}
