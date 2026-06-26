/**
 * EvaluationService — Opportunity 多维评分的业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ opportunityRepo（校验 opportunityId 引用 + status 流转）
 *                            ↘ evaluationProvider（生成 explanation；totalScore 不信任）
 *
 * 业务规则：
 *   1. 9 个维度每个 ∈ [0, 100] 整数
 *   2. explanation 1-2000 字符
 *   3. opportunityId 必须存在（service 校验）
 *   4. id 唯一性
 *   5. totalScore 由 service 按 SCORING_WEIGHTS 重算（不信任 provider）
 *   6. 写入 evaluation 后：
 *        totalScore >= PROMOTE_THRESHOLD  → opportunity.status = 'mvp'
 *        totalScore <  DEMOTE_THRESHOLD   → opportunity.status = 'archived'
 *        其它                              → status 不变
 *   7. evaluation 与 opportunity 的 status 自动流转是**幂等**的（仅在跨越阈值时改）
 *   8. createdAt / updatedAt 由调用方提供
 *
 * 与 signalService / opportunityService 一致：手动管理字段引用一致性，
 * service 只校验 + 流转；不主动做"派生"逻辑。
 */

import {
  listEvaluations as _repoList,
  getEvaluation as _repoGet,
  listEvaluationsByOpportunity as _repoListByOpp,
  insertEvaluation as _repoInsert,
  updateEvaluationInStore as _repoUpdate,
  deleteEvaluationFromStore as _repoDelete,
} from '@/lib/repos/opportunities';
import { getOpportunity, updateOpportunity } from './opportunityService';
import {
  SCORING_WEIGHTS,
  SCORE_MIN,
  SCORE_MAX,
  PROMOTE_THRESHOLD,
  DEMOTE_THRESHOLD,
  OPPORTUNITY_STATUSES,
} from '@/types';
import type {
  OpportunityEvaluation,
  ScoringDimension,
  Opportunity,
  OpportunityStatus,
} from '@/types';
import { computeWeightedTotal } from '@/lib/providers/evaluation';

const EXPLANATION_MAX = 2000;
const EXPLANATION_MIN = 1;

export class EvaluationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationServiceError';
  }
}

const SCORING_DIMENSIONS: ScoringDimension[] = Object.keys(
  SCORING_WEIGHTS,
) as ScoringDimension[];

/* ----------------- 校验 helpers ----------------- */

function validateScore(
  value: number | undefined,
  dim: ScoringDimension,
): number {
  if (value === undefined || value === null) {
    throw new EvaluationServiceError(`${dim} is required`);
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new EvaluationServiceError(`${dim} must be a number`);
  }
  if (value < SCORE_MIN || value > SCORE_MAX) {
    throw new EvaluationServiceError(
      `${dim} must be in [${SCORE_MIN}, ${SCORE_MAX}]`,
    );
  }
  if (!Number.isInteger(value)) {
    throw new EvaluationServiceError(`${dim} must be an integer`);
  }
  return value;
}

function validateExplanation(explanation: string | undefined): string {
  if (typeof explanation !== 'string') {
    throw new EvaluationServiceError('explanation is required');
  }
  const v = explanation.trim();
  if (v.length < EXPLANATION_MIN) {
    throw new EvaluationServiceError('explanation cannot be empty');
  }
  if (v.length > EXPLANATION_MAX) {
    throw new EvaluationServiceError(
      `explanation must be ≤ ${EXPLANATION_MAX} characters`,
    );
  }
  return v;
}

function validateOpportunityId(id: string | undefined): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new EvaluationServiceError('opportunityId is required');
  }
  return id.trim();
}

async function validateOpportunityExists(id: string): Promise<Opportunity> {
  const opp = await getOpportunity(id);
  if (!opp) {
    throw new EvaluationServiceError(`opportunity not found: ${id}`);
  }
  return opp;
}

/**
 * 根据 totalScore 决定目标 status；不改时返回 undefined。
 * 跨越 PROMOTE → 'mvp'；低于 DEMOTE → 'archived'；中间不动。
 */
function decideNextStatus(
  total: number,
  current: OpportunityStatus,
): OpportunityStatus | undefined {
  if (total >= PROMOTE_THRESHOLD) {
    return current === 'mvp' ? undefined : 'mvp';
  }
  if (total < DEMOTE_THRESHOLD) {
    if (current === 'archived' || current === 'killed') return undefined;
    return 'archived';
  }
  return undefined;
}

/* ----------------- Read ----------------- */

export async function listEvaluations(): Promise<OpportunityEvaluation[]> {
  const all = await _repoList();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEvaluation(
  id: string,
): Promise<OpportunityEvaluation | undefined> {
  return _repoGet(id);
}

export async function listEvaluationsByOpportunity(
  opportunityId: string,
): Promise<OpportunityEvaluation[]> {
  return _repoListByOpp(opportunityId);
}

export async function getLatestEvaluationForOpportunity(
  opportunityId: string,
): Promise<OpportunityEvaluation | undefined> {
  const list = await _repoListByOpp(opportunityId);
  if (list.length === 0) return undefined;
  return list[list.length - 1];
}

/**
 * 按 opportunity 分组返回所有 evaluations（每组按 createdAt 升序）。
 * ranking / 列表展示用。
 */
export interface EvaluationGroup {
  opportunity: Opportunity;
  evaluations: OpportunityEvaluation[];
}

export async function listEvaluationsGroupedByOpportunity(): Promise<EvaluationGroup[]> {
  const [allEvals, opps] = await Promise.all([_repoList(), listAllOpportunities()]);
  const byOpp = new Map<string, OpportunityEvaluation[]>();
  for (const e of allEvals) {
    const arr = byOpp.get(e.opportunityId) ?? [];
    arr.push(e);
    byOpp.set(e.opportunityId, arr);
  }
  const out: EvaluationGroup[] = [];
  for (const [oppId, evals] of byOpp) {
    const opp = opps.find((o) => o.id === oppId);
    if (!opp) continue;
    evals.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    out.push({ opportunity: opp, evaluations: evals });
  }
  return out;
}

async function listAllOpportunities(): Promise<Opportunity[]> {
  // 走 opportunityService.listOpportunities 保持分层一致
  const { listOpportunities: ls } = await import('./opportunityService');
  return ls();
}

/* ----------------- Write ----------------- */

export interface CreateEvaluationInput {
  id: string;
  opportunityId: string;
  marketSize: number;
  painIntensity: number;
  competition: number;
  technicalFeasibility: number;
  monetization: number;
  speedToMarket: number;
  founderFit: number;
  geoPotential: number;
  ipPotential: number;
  explanation: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateEvaluationInput {
  marketSize?: number;
  painIntensity?: number;
  competition?: number;
  technicalFeasibility?: number;
  monetization?: number;
  speedToMarket?: number;
  founderFit?: number;
  geoPotential?: number;
  ipPotential?: number;
  explanation?: string;
  updatedAt: string;
}

export interface CreateEvaluationResult {
  evaluation: OpportunityEvaluation;
  /** 若因本次 evaluation 跨越阈值导致 status 变化，记录新 status；否则 undefined。 */
  statusChangedTo?: OpportunityStatus;
}

export async function createEvaluation(
  input: CreateEvaluationInput,
): Promise<CreateEvaluationResult> {
  const opportunityId = validateOpportunityId(input.opportunityId);
  const opp = await validateOpportunityExists(opportunityId);

  const scores: Record<ScoringDimension, number> = {
    marketSize: validateScore(input.marketSize, 'marketSize'),
    painIntensity: validateScore(input.painIntensity, 'painIntensity'),
    competition: validateScore(input.competition, 'competition'),
    technicalFeasibility: validateScore(
      input.technicalFeasibility,
      'technicalFeasibility',
    ),
    monetization: validateScore(input.monetization, 'monetization'),
    speedToMarket: validateScore(input.speedToMarket, 'speedToMarket'),
    founderFit: validateScore(input.founderFit, 'founderFit'),
    geoPotential: validateScore(input.geoPotential, 'geoPotential'),
    ipPotential: validateScore(input.ipPotential, 'ipPotential'),
  };
  const explanation = validateExplanation(input.explanation);
  const totalScore = computeWeightedTotal(scores);

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new EvaluationServiceError(
      `evaluation with id "${input.id}" already exists`,
    );
  }

  const created: OpportunityEvaluation = {
    id: input.id,
    opportunityId,
    ...scores,
    totalScore,
    explanation,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  await _repoInsert(created);

  // status auto-transition
  const nextStatus = decideNextStatus(totalScore, opp.status);
  if (nextStatus && OPPORTUNITY_STATUSES.includes(nextStatus)) {
    await updateOpportunity(opp.id, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  }
  return { evaluation: created, statusChangedTo: nextStatus };
}

export async function updateEvaluation(
  id: string,
  patch: UpdateEvaluationInput,
): Promise<CreateEvaluationResult> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new EvaluationServiceError(`evaluation not found: ${id}`);
  }
  const opp = await validateOpportunityExists(existing.opportunityId);

  const scores: Record<ScoringDimension, number> = {
    marketSize:
      patch.marketSize !== undefined
        ? validateScore(patch.marketSize, 'marketSize')
        : existing.marketSize,
    painIntensity:
      patch.painIntensity !== undefined
        ? validateScore(patch.painIntensity, 'painIntensity')
        : existing.painIntensity,
    competition:
      patch.competition !== undefined
        ? validateScore(patch.competition, 'competition')
        : existing.competition,
    technicalFeasibility:
      patch.technicalFeasibility !== undefined
        ? validateScore(patch.technicalFeasibility, 'technicalFeasibility')
        : existing.technicalFeasibility,
    monetization:
      patch.monetization !== undefined
        ? validateScore(patch.monetization, 'monetization')
        : existing.monetization,
    speedToMarket:
      patch.speedToMarket !== undefined
        ? validateScore(patch.speedToMarket, 'speedToMarket')
        : existing.speedToMarket,
    founderFit:
      patch.founderFit !== undefined
        ? validateScore(patch.founderFit, 'founderFit')
        : existing.founderFit,
    geoPotential:
      patch.geoPotential !== undefined
        ? validateScore(patch.geoPotential, 'geoPotential')
        : existing.geoPotential,
    ipPotential:
      patch.ipPotential !== undefined
        ? validateScore(patch.ipPotential, 'ipPotential')
        : existing.ipPotential,
  };
  const explanation =
    patch.explanation !== undefined
      ? validateExplanation(patch.explanation)
      : existing.explanation;
  const totalScore = computeWeightedTotal(scores);

  const next: OpportunityEvaluation = {
    ...existing,
    ...scores,
    totalScore,
    explanation,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new EvaluationServiceError(`failed to persist evaluation update: ${id}`);
  }

  const nextStatus = decideNextStatus(totalScore, opp.status);
  if (nextStatus && OPPORTUNITY_STATUSES.includes(nextStatus)) {
    await updateOpportunity(opp.id, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
  }
  return { evaluation: updated, statusChangedTo: nextStatus };
}

export async function deleteEvaluation(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new EvaluationServiceError(`evaluation not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Ranking ----------------- */

export interface RankingRow {
  opportunity: Opportunity;
  latestEvaluation: OpportunityEvaluation;
  rank: number;
}

export async function rankOpportunities(): Promise<RankingRow[]> {
  const [groups, allOpps] = await Promise.all([
    listEvaluationsGroupedByOpportunity(),
    listAllOpportunities(),
  ]);

  // 已有 evaluation 的机会先排
  const ranked: RankingRow[] = groups
    .map((g) => {
      const latest = g.evaluations[g.evaluations.length - 1]!;
      return { opportunity: g.opportunity, latestEvaluation: latest, rank: 0 };
    })
    .sort((a, b) => b.latestEvaluation.totalScore - a.latestEvaluation.totalScore);

  const evaluatedIds = new Set(ranked.map((r) => r.opportunity.id));
  // 末尾追加未评估的（用 nullish placeholder：仅作"未上榜"提示，不参与排序）
  const unevaluated = allOpps.filter((o) => !evaluatedIds.has(o.id));

  const rows: RankingRow[] = ranked.map((r, i) => ({ ...r, rank: i + 1 }));
  // 让未评估的也以零分形式上榜（N+1 ...），便于 dashboard 展示
  for (let i = 0; i < unevaluated.length; i++) {
    const opp = unevaluated[i]!;
    const placeholder: OpportunityEvaluation = {
      id: '__placeholder__',
      opportunityId: opp.id,
      marketSize: 0, painIntensity: 0, competition: 0, technicalFeasibility: 0,
      monetization: 0, speedToMarket: 0, founderFit: 0, geoPotential: 0, ipPotential: 0,
      totalScore: 0,
      explanation: '_Not yet evaluated._',
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
    };
    rows.push({
      opportunity: opp,
      latestEvaluation: placeholder,
      rank: rows.length + 1,
    });
  }
  return rows;
}

/* ----------------- Score breakdown (for UI / export) ----------------- */

export interface ScoreBreakdown {
  dimension: ScoringDimension;
  label: string;
  score: number;
  weight: number;
  contribution: number; // score * weight, 1 decimal
}

const DIMENSION_LABEL: Record<ScoringDimension, string> = {
  marketSize: 'Market size',
  painIntensity: 'Pain intensity',
  competition: 'Competition gap',
  technicalFeasibility: 'Technical feasibility',
  monetization: 'Monetization',
  speedToMarket: 'Speed to market',
  founderFit: 'Founder fit',
  geoPotential: 'GEO potential',
  ipPotential: 'IP potential',
};

export function breakdownEvaluation(
  e: OpportunityEvaluation,
): ScoreBreakdown[] {
  return SCORING_DIMENSIONS.map((dim) => {
    const s = e[dim];
    const w = SCORING_WEIGHTS[dim];
    return {
      dimension: dim,
      label: DIMENSION_LABEL[dim],
      score: s,
      weight: w,
      contribution: Math.round(s * w * 10) / 10,
    };
  });
}

export const _internal = { decideNextStatus, SCORING_DIMENSIONS };
