'use server';

/**
 * Citation Monitor 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  runCitationCheck,
  recordCitationCheck,
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


/**
 * recordCitationCheckAction — 人工录入一次 AI 引用检查。
 *
 * 与 `runCitationCheckAction` 平行（两条写路径）：
 *   - runCitationCheckAction：UI 只填 query / platform / time；结果由 connector 给
 *   - recordCitationCheckAction：UI 把完整答案填进来（mentioned / citedUrl /
 *     competitorMentions / answerSummary / geoScore）；不调 connector
 *
 * FormData 字段：
 *   - queryId: required
 *   - platform: required, must be in CITATION_PLATFORMS
 *   - checkedAt: required, ISO 8601
 *   - mentioned: "true" | "false"
 *   - citedUrl: optional string (http/https)
 *   - competitorMentions: JSON string array (≤20)
 *   - answerSummary: required string (1-2000)
 *   - geoScore: integer string (0-100)
 */
export async function recordCitationCheckAction(
  formData: FormData,
): Promise<void> {
  const queryId = parseRequiredString(formData.get('queryId'), 'queryId');
  const platform = parseEnum<CitationPlatform>(
    formData.get('platform'),
    CITATION_PLATFORMS,
    'platform',
  );
  const checkedAt = parseRequiredString(formData.get('checkedAt'), 'checkedAt');
  const mentionedRaw = parseString(formData.get('mentioned')) ?? 'false';
  const mentioned = mentionedRaw === 'true' || mentionedRaw === '1';
  const citedUrl = parseString(formData.get('citedUrl'));
  const competitorsRaw =
    parseString(formData.get('competitorMentions')) ?? '[]';
  let competitorMentions: string[];
  try {
    const parsed: unknown = JSON.parse(competitorsRaw);
    if (!Array.isArray(parsed) || !parsed.every((s) => typeof s === 'string')) {
      throw new CitationMonitorServiceError(
        'competitorMentions must be a JSON array of strings',
      );
    }
    competitorMentions = parsed as string[];
  } catch (err) {
    if (err instanceof CitationMonitorServiceError) throw err;
    throw new CitationMonitorServiceError(
      'competitorMentions must be valid JSON',
    );
  }
  const answerSummary = parseRequiredString(
    formData.get('answerSummary'),
    'answerSummary',
  );
  const geoScoreRaw = parseString(formData.get('geoScore')) ?? '0';
  const geoScore = Number.parseInt(geoScoreRaw, 10);
  if (!Number.isFinite(geoScore)) {
    throw new CitationMonitorServiceError('geoScore must be an integer');
  }

  const created = await recordCitationCheck({
    queryId,
    platform,
    checkedAt,
    mentioned,
    ...(citedUrl ? { citedUrl } : {}),
    competitorMentions,
    answerSummary,
    geoScore,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  });
  revalidatePath('/geo/citation-monitor');
  revalidatePath(`/geo/citation-monitor/${created.id}`);
  revalidatePath('/geo/reports');
  revalidatePath('/geo/metrics');
  redirect(`/geo/citation-monitor/${created.id}`);
}
