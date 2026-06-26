'use server';

/**
 * PRD 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  generatePRDForMVP,
  updatePRD,
  deletePRD,
  PRDServiceError,
} from '@/lib/services/prdService';

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
    throw new PRDServiceError(`${fieldName} is required`);
  }
  return s;
}

function genPRDId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `prd_${Date.now().toString(36)}-${rand}`;
}

export async function createPRDDraftAction(formData: FormData): Promise<void> {
  const mvpProjectId = parseRequiredString(
    formData.get('mvpProjectId'),
    'mvpProjectId',
  );
  const created = await generatePRDForMVP(mvpProjectId, {
    draftId: genPRDId(),
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  });
  revalidatePath('/prd');
  revalidatePath(`/prd/${created.id}`);
  revalidatePath(`/mvp/${created.mvpProjectId}`);
  redirect(`/prd/${created.id}`);
}

export async function updatePRDAction(formData: FormData): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  await updatePRD(id, {
    title: parseString(formData.get('title')),
    productPositioning: parseString(formData.get('productPositioning')),
    targetUsers: parseString(formData.get('targetUsers')),
    corePainPoints: parseString(formData.get('corePainPoints')),
    mvpFeatureScope: parseString(formData.get('mvpFeatureScope')),
    pageStructure: parseString(formData.get('pageStructure')),
    dataModel: parseString(formData.get('dataModel')),
    apiDesign: parseString(formData.get('apiDesign')),
    acceptanceCriteria: parseString(formData.get('acceptanceCriteria')),
    devPlan: parseString(formData.get('devPlan')),
    updatedAt: MOCK_NOW,
  });
  revalidatePath('/prd');
  revalidatePath(`/prd/${id}`);
}

export async function deletePRDAction(id: string): Promise<void> {
  await deletePRD(id);
  revalidatePath('/prd');
  redirect('/prd');
}
