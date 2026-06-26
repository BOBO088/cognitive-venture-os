/**
 * Opportunity 仓储：Signal / Opportunity / OpportunityEvaluation 查询入口。
 *
 * Signal / Opportunity 的写入操作（create / update / delete）由 service 层管理，
 * 本文件只做查询 + 单条写入代理。Service 层负责校验 + linkedXxxIds 引用一致性。
 */

import {
  mockSignals,
  mockOpportunities,
  mockOpportunityEvaluations,
} from '@/mock-data/opportunities';
import type {
  Signal,
  SignalCategory,
  Opportunity,
  OpportunityStatus,
  OpportunityEvaluation,
} from '@/types';

/* ----------------- Signal ----------------- */

export async function listSignals(): Promise<Signal[]> {
  return mockSignals;
}

export async function getSignal(id: string): Promise<Signal | undefined> {
  return mockSignals.find((s) => s.id === id);
}

export async function listSignalsByCategory(
  category: SignalCategory,
): Promise<Signal[]> {
  return mockSignals.filter((s) => s.category === category);
}

/** 在内存中追加一条 signal。返回插入后的对象。 */
export async function insertSignal(signal: Signal): Promise<Signal> {
  mockSignals.push(signal);
  return signal;
}

/** 在内存中更新一条 signal。返回更新后的对象；找不到返回 undefined。 */
export async function updateSignalInStore(
  id: string,
  patch: Partial<Signal>,
): Promise<Signal | undefined> {
  const i = mockSignals.findIndex((s) => s.id === id);
  if (i < 0) return undefined;
  const next: Signal = { ...mockSignals[i]!, ...patch, id: mockSignals[i]!.id };
  mockSignals[i] = next;
  return next;
}

/** 在内存中删除一条 signal。返回是否成功。 */
export async function deleteSignalFromStore(id: string): Promise<boolean> {
  const i = mockSignals.findIndex((s) => s.id === id);
  if (i < 0) return false;
  mockSignals.splice(i, 1);
  return true;
}

/* ----------------- Opportunity ----------------- */

export async function listOpportunities(): Promise<Opportunity[]> {
  return mockOpportunities;
}

export async function getOpportunity(id: string): Promise<Opportunity | undefined> {
  return mockOpportunities.find((o) => o.id === id);
}

export async function listOpportunitiesByStatus(
  status: OpportunityStatus,
): Promise<Opportunity[]> {
  return mockOpportunities.filter((o) => o.status === status);
}

/** 在内存中追加一条 opportunity。返回插入后的对象。 */
export async function insertOpportunity(opp: Opportunity): Promise<Opportunity> {
  mockOpportunities.push(opp);
  return opp;
}

/** 在内存中更新一条 opportunity。返回更新后的对象；找不到返回 undefined。 */
export async function updateOpportunityInStore(
  id: string,
  patch: Partial<Opportunity>,
): Promise<Opportunity | undefined> {
  const i = mockOpportunities.findIndex((o) => o.id === id);
  if (i < 0) return undefined;
  const next: Opportunity = { ...mockOpportunities[i]!, ...patch, id: mockOpportunities[i]!.id };
  mockOpportunities[i] = next;
  return next;
}

/** 在内存中删除一条 opportunity。返回是否成功。 */
export async function deleteOpportunityFromStore(id: string): Promise<boolean> {
  const i = mockOpportunities.findIndex((o) => o.id === id);
  if (i < 0) return false;
  mockOpportunities.splice(i, 1);
  return true;
}

/* ----------------- OpportunityEvaluation ----------------- */

export async function listEvaluations(): Promise<OpportunityEvaluation[]> {
  return mockOpportunityEvaluations;
}

/** 按时间升序，便于画趋势线。 */
export async function listEvaluationsByOpportunity(
  opportunityId: string,
): Promise<OpportunityEvaluation[]> {
  return mockOpportunityEvaluations
    .filter((e) => e.opportunityId === opportunityId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** 按 id 取一条 evaluation；找不到返回 undefined。 */
export async function getEvaluation(
  id: string,
): Promise<OpportunityEvaluation | undefined> {
  return mockOpportunityEvaluations.find((e) => e.id === id);
}

/** 在内存中追加一条 evaluation。返回插入后的对象。 */
export async function insertEvaluation(
  evaluation: OpportunityEvaluation,
): Promise<OpportunityEvaluation> {
  mockOpportunityEvaluations.push(evaluation);
  return evaluation;
}

/** 在内存中更新一条 evaluation。返回更新后的对象；找不到返回 undefined。 */
export async function updateEvaluationInStore(
  id: string,
  patch: Partial<OpportunityEvaluation>,
): Promise<OpportunityEvaluation | undefined> {
  const i = mockOpportunityEvaluations.findIndex((e) => e.id === id);
  if (i < 0) return undefined;
  const next: OpportunityEvaluation = {
    ...mockOpportunityEvaluations[i]!,
    ...patch,
    id: mockOpportunityEvaluations[i]!.id,
  };
  mockOpportunityEvaluations[i] = next;
  return next;
}

/** 在内存中删除一条 evaluation。返回是否成功。 */
export async function deleteEvaluationFromStore(
  id: string,
): Promise<boolean> {
  const i = mockOpportunityEvaluations.findIndex((e) => e.id === id);
  if (i < 0) return false;
  mockOpportunityEvaluations.splice(i, 1);
  return true;
}
