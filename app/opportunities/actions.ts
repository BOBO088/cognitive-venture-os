'use server';

/**
 * Opportunity 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo / provider。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  bindSignalToOpportunity,
  unbindSignalFromOpportunity,
  bindCardToOpportunity,
  unbindCardFromOpportunity,
  bindEntityToOpportunity,
  unbindEntityFromOpportunity,
  OpportunityServiceError,
} from '@/lib/services/opportunityService';
import { getLLMProvider } from '@/lib/providers';
import { OPPORTUNITY_STATUSES } from '@/types';
import type { OpportunityStatus } from '@/types';
import type { OpportunityDraft } from '@/lib/providers/llm';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

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

function parseStatus(v: FormDataEntryValue | null): OpportunityStatus {
  const s = parseString(v);
  return OPPORTUNITY_STATUSES.includes(s as OpportunityStatus)
    ? (s as OpportunityStatus)
    : 'draft';
}

function genOpportunityId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `opp_${Date.now().toString(36)}-${rand}`;
}

export async function createOpportunityAction(formData: FormData): Promise<void> {
  try {
    const created = await createOpportunity({
      id: genOpportunityId(),
      title: parseString(formData.get('title')) ?? '',
      description: parseString(formData.get('description')) ?? '',
      targetUser: parseString(formData.get('targetUser')) ?? '',
      painPoint: parseString(formData.get('painPoint')) ?? '',
      solutionIdea: parseString(formData.get('solutionIdea')) ?? '',
      status: parseStatus(formData.get('status')),
      relatedSignalIds: parseMultiline(formData.get('relatedSignalIds')),
      relatedResearchCardIds: parseMultiline(formData.get('relatedResearchCardIds')),
      relatedEntityIds: parseMultiline(formData.get('relatedEntityIds')),
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    revalidatePath('/opportunities');
    redirect(`/opportunities/${created.id}`);
  } catch (err) {
    if (err instanceof OpportunityServiceError) throw err;
    throw err;
  }
}

export async function updateOpportunityAction(formData: FormData): Promise<void> {
  const id = parseString(formData.get('id'));
  if (!id) {
    throw new OpportunityServiceError('id is required for update');
  }
  await updateOpportunity(id, {
    title: parseString(formData.get('title')),
    description: parseString(formData.get('description')),
    targetUser: parseString(formData.get('targetUser')),
    painPoint: parseString(formData.get('painPoint')),
    solutionIdea: parseString(formData.get('solutionIdea')),
    status: parseStatus(formData.get('status')),
    relatedSignalIds: parseMultiline(formData.get('relatedSignalIds')),
    relatedResearchCardIds: parseMultiline(formData.get('relatedResearchCardIds')),
    relatedEntityIds: parseMultiline(formData.get('relatedEntityIds')),
    updatedAt: MOCK_NOW,
  });
  revalidatePath('/opportunities');
  revalidatePath(`/opportunities/${id}`);
}

export async function deleteOpportunityAction(id: string): Promise<void> {
  await deleteOpportunity(id);
  revalidatePath('/opportunities');
  redirect('/opportunities');
}

export async function bindSignalAction(
  opportunityId: string,
  signalId: string,
): Promise<void> {
  await bindSignalToOpportunity(opportunityId, signalId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function unbindSignalAction(
  opportunityId: string,
  signalId: string,
): Promise<void> {
  await unbindSignalFromOpportunity(opportunityId, signalId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function bindCardAction(
  opportunityId: string,
  cardId: string,
): Promise<void> {
  await bindCardToOpportunity(opportunityId, cardId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function unbindCardAction(
  opportunityId: string,
  cardId: string,
): Promise<void> {
  await unbindCardFromOpportunity(opportunityId, cardId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function bindEntityAction(
  opportunityId: string,
  entityId: string,
): Promise<void> {
  await bindEntityToOpportunity(opportunityId, entityId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function unbindEntityAction(
  opportunityId: string,
  entityId: string,
): Promise<void> {
  await unbindEntityFromOpportunity(opportunityId, entityId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

/* ----------------- AI draft ----------------- */

export async function generateOpportunityDraftAction(input: {
  signalIds: string[];
  researchCardIds: string[];
}): Promise<OpportunityDraft> {
  const llm = await getLLMProvider();
  return llm.generateOpportunityDraft({
    signalIds: input.signalIds,
    researchCardIds: input.researchCardIds,
  });
}
