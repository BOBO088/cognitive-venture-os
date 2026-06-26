/**
 * LoopVersionService — 循环工程版本的业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ llmProvider.suggestImprovement
 *
 * 业务规则：
 *   1. name 1-200 字符
 *   2. steps 至少 1 个，每步 1-200 字符
 *   3. stopCondition 1-2000 字符
 *   4. evaluationCriteria 1-2000 字符
 *   5. score ∈ [0, 100]；可空
 *   6. version 由 service 在同一 name 内自动递增
 *   7. id 唯一性
 */

import {
  listLoopVersions as _repoList,
  listLoopVersionsSorted as _repoListSorted,
  listLoopVersionsByName as _repoListByName,
  getLoopVersion as _repoGet,
  getNextLoopVersion as _repoNextVersion,
  insertLoopVersion as _repoInsert,
  updateLoopVersionInStore as _repoUpdate,
  deleteLoopVersionFromStore as _repoDelete,
} from '@/lib/repos/iteration';
import { getLLMProvider } from '@/lib/providers';
import type { LoopVersion } from '@/types';
import type { ImprovementDraft } from '@/lib/providers/llm';

const NAME_MIN = 1;
const NAME_MAX = 200;
const STEP_MAX = 200;
const STOP_CONDITION_MAX = 2000;
const EVALUATION_CRITERIA_MAX = 2000;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

export class LoopVersionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoopVersionServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateName(name: string | undefined): string {
  if (typeof name !== 'string') {
    throw new LoopVersionServiceError('name is required');
  }
  const v = name.trim();
  if (v.length < NAME_MIN) {
    throw new LoopVersionServiceError('name cannot be empty');
  }
  if (v.length > NAME_MAX) {
    throw new LoopVersionServiceError(`name must be ≤ ${NAME_MAX} characters`);
  }
  return v;
}

function validateSteps(steps: string[] | undefined): string[] {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new LoopVersionServiceError('steps must contain at least 1 item');
  }
  return steps.map((s, i) => {
    if (typeof s !== 'string') {
      throw new LoopVersionServiceError(`steps[${i}] must be a string`);
    }
    const v = s.trim();
    if (v.length === 0) {
      throw new LoopVersionServiceError(`steps[${i}] cannot be empty`);
    }
    if (v.length > STEP_MAX) {
      throw new LoopVersionServiceError(
        `steps[${i}] must be ≤ ${STEP_MAX} characters`,
      );
    }
    return v;
  });
}

function validateStopCondition(v: string | undefined): string {
  if (typeof v !== 'string') {
    throw new LoopVersionServiceError('stopCondition is required');
  }
  const t = v.trim();
  if (t.length === 0) {
    throw new LoopVersionServiceError('stopCondition cannot be empty');
  }
  if (t.length > STOP_CONDITION_MAX) {
    throw new LoopVersionServiceError(
      `stopCondition must be ≤ ${STOP_CONDITION_MAX} characters`,
    );
  }
  return t;
}

function validateEvaluationCriteria(v: string | undefined): string {
  if (typeof v !== 'string') {
    throw new LoopVersionServiceError('evaluationCriteria is required');
  }
  const t = v.trim();
  if (t.length === 0) {
    throw new LoopVersionServiceError('evaluationCriteria cannot be empty');
  }
  if (t.length > EVALUATION_CRITERIA_MAX) {
    throw new LoopVersionServiceError(
      `evaluationCriteria must be ≤ ${EVALUATION_CRITERIA_MAX} characters`,
    );
  }
  return t;
}

function validateScore(score: number | null | undefined): number | null {
  if (score === undefined || score === null) return null;
  if (typeof score !== 'number' || Number.isNaN(score) || !Number.isFinite(score)) {
    throw new LoopVersionServiceError('score must be a number');
  }
  if (score < SCORE_MIN || score > SCORE_MAX) {
    throw new LoopVersionServiceError(
      `score must be between ${SCORE_MIN} and ${SCORE_MAX}`,
    );
  }
  return Math.round(score);
}

/* ----------------- Read ----------------- */

export async function listLoopVersions(): Promise<LoopVersion[]> {
  return _repoListSorted();
}

export async function getLoopVersion(
  id: string,
): Promise<LoopVersion | undefined> {
  return _repoGet(id);
}

export async function listLoopVersionsByName(
  name: string,
): Promise<LoopVersion[]> {
  return _repoListByName(name);
}

export async function getLatestLoopVersion(
  name: string,
): Promise<LoopVersion | undefined> {
  const list = await _repoListByName(name);
  if (list.length === 0) return undefined;
  return list[list.length - 1];
}

export async function listLoopVersionsFiltered(filter: {
  name?: string;
}): Promise<LoopVersion[]> {
  const all = await _repoListSorted();
  return all.filter((l) => (filter.name ? l.name === filter.name : true));
}

/* ----------------- Aggregates ----------------- */

export interface LoopVersionStats {
  totalLoops: number;
  distinctNames: number;
  averageScore: number | null;
}

export async function computeLoopVersionStats(
  loops?: LoopVersion[],
): Promise<LoopVersionStats> {
  const all = loops ?? (await _repoList());
  let totalScore = 0;
  let scoreCount = 0;
  for (const l of all) {
    if (l.score !== null) {
      totalScore += l.score;
      scoreCount += 1;
    }
  }
  return {
    totalLoops: all.length,
    distinctNames: new Set(all.map((l) => l.name)).size,
    averageScore: scoreCount === 0 ? null : Math.round(totalScore / scoreCount),
  };
}

/* ----------------- Write ----------------- */

export interface CreateLoopVersionInput {
  id: string;
  name: string;
  steps: string[];
  stopCondition: string;
  evaluationCriteria: string;
  score: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLoopVersionInput {
  name?: string;
  steps?: string[];
  stopCondition?: string;
  evaluationCriteria?: string;
  score?: number | null;
  updatedAt: string;
}

export async function createLoopVersion(
  input: CreateLoopVersionInput,
): Promise<LoopVersion> {
  const name = validateName(input.name);
  const steps = validateSteps(input.steps);
  const stopCondition = validateStopCondition(input.stopCondition);
  const evaluationCriteria = validateEvaluationCriteria(
    input.evaluationCriteria,
  );
  const score = validateScore(input.score);

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new LoopVersionServiceError(
      `Loop version with id "${input.id}" already exists`,
    );
  }

  const version = await _repoNextVersion(name);

  const created: LoopVersion = {
    id: input.id,
    name,
    steps,
    stopCondition,
    evaluationCriteria,
    version,
    score,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateLoopVersion(
  id: string,
  patch: UpdateLoopVersionInput,
): Promise<LoopVersion> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new LoopVersionServiceError(`Loop version not found: ${id}`);
  }
  const name = patch.name !== undefined ? validateName(patch.name) : existing.name;
  const steps =
    patch.steps !== undefined ? validateSteps(patch.steps) : existing.steps;
  const stopCondition =
    patch.stopCondition !== undefined
      ? validateStopCondition(patch.stopCondition)
      : existing.stopCondition;
  const evaluationCriteria =
    patch.evaluationCriteria !== undefined
      ? validateEvaluationCriteria(patch.evaluationCriteria)
      : existing.evaluationCriteria;
  const score =
    patch.score === undefined
      ? existing.score
      : patch.score === null
        ? null
        : validateScore(patch.score);

  const next: LoopVersion = {
    id: existing.id,
    name,
    steps,
    stopCondition,
    evaluationCriteria,
    version: existing.version,
    score,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new LoopVersionServiceError(
      `failed to persist loop version update: ${id}`,
    );
  }
  return updated;
}

export async function deleteLoopVersion(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new LoopVersionServiceError(`Loop version not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Suggest improvement ----------------- */

export async function suggestImprovementForLoop(
  loopId: string,
): Promise<ImprovementDraft> {
  const loop = await _repoGet(loopId);
  if (!loop) {
    throw new LoopVersionServiceError(`Loop version not found: ${loopId}`);
  }
  const provider = await getLLMProvider();
  return provider.suggestImprovement({ kind: 'loop', loop });
}
