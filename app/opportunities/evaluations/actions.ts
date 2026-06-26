'use server';

/**
 * Evaluation 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo / provider。
 */

import { revalidatePath } from 'next/cache';
import {
  createEvaluation,
  EvaluationServiceError,
  type CreateEvaluationInput,
} from '@/lib/services/evaluationService';
import {
  SCORE_MIN,
  SCORE_MAX,
  SCORING_WEIGHTS,
} from '@/types';
import type { ScoringDimension } from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

const DIMS: ScoringDimension[] = Object.keys(SCORING_WEIGHTS) as ScoringDimension[];

function parseString(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseInt0to100(v: FormDataEntryValue | null): number {
  const s = parseString(v);
  if (s === undefined) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  const r = Math.round(n);
  if (r < SCORE_MIN) return SCORE_MIN;
  if (r > SCORE_MAX) return SCORE_MAX;
  return r;
}

function parseRequiredString(
  v: FormDataEntryValue | null,
  fieldName: string,
): string {
  const s = parseString(v);
  if (s === undefined) {
    throw new EvaluationServiceError(`${fieldName} is required`);
  }
  return s;
}

function genEvaluationId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `eval_${Date.now().toString(36)}-${rand}`;
}

export async function createEvaluationAction(
  formData: FormData,
): Promise<void> {
  const opportunityId = parseRequiredString(
    formData.get('opportunityId'),
    'opportunityId',
  );
  const explanation = parseRequiredString(
    formData.get('explanation'),
    'explanation',
  );

  const scores = {} as Record<ScoringDimension, number>;
  for (const dim of DIMS) {
    scores[dim] = parseInt0to100(formData.get(dim));
  }

  const input: CreateEvaluationInput = {
    id: genEvaluationId(),
    opportunityId,
    ...scores,
    explanation,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };

  const result = await createEvaluation(input);
  revalidatePath('/opportunities/evaluations');
  revalidatePath('/opportunities/ranking');
  revalidatePath('/opportunities');
  revalidatePath(`/opportunities/${opportunityId}`);
  if (result.statusChangedTo) {
    revalidatePath(`/opportunities/${opportunityId}`);
  }
}
