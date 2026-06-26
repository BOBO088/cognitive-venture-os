/**
 * PromptVersionService — 提示词版本的业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ llmProvider.suggestImprovement（生成改进草稿）
 *
 * 业务规则：
 *   1. name 1-200 字符
 *   2. type ∈ PROMPT_TYPES
 *   3. content 1-50000 字符
 *   4. usedFor 1-1000 字符
 *   5. score ∈ [0, 100]；可空
 *   6. version 由 service 在同一 (type, name) 内自动递增
 *   7. id 唯一性
 *   8. createdAt / updatedAt 由调用方提供
 */

import {
  listPromptVersions as _repoList,
  listPromptVersionsSorted as _repoListSorted,
  listPromptVersionsByType as _repoListByType,
  listPromptVersionsByName as _repoListByName,
  getPromptVersion as _repoGet,
  getNextPromptVersion as _repoNextVersion,
  insertPromptVersion as _repoInsert,
  updatePromptVersionInStore as _repoUpdate,
  deletePromptVersionFromStore as _repoDelete,
} from '@/lib/repos/iteration';
import { getLLMProvider } from '@/lib/providers';
import { PROMPT_TYPES } from '@/types';
import type { PromptVersion, PromptType } from '@/types';
import type { ImprovementDraft } from '@/lib/providers/llm';

const NAME_MIN = 1;
const NAME_MAX = 200;
const CONTENT_MIN = 1;
const CONTENT_MAX = 50000;
const USED_FOR_MAX = 1000;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

export class PromptVersionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptVersionServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateName(name: string | undefined): string {
  if (typeof name !== 'string') {
    throw new PromptVersionServiceError('name is required');
  }
  const v = name.trim();
  if (v.length < NAME_MIN) {
    throw new PromptVersionServiceError('name cannot be empty');
  }
  if (v.length > NAME_MAX) {
    throw new PromptVersionServiceError(
      `name must be ≤ ${NAME_MAX} characters`,
    );
  }
  return v;
}

function validateType(type: string | undefined): PromptType {
  if (PROMPT_TYPES.includes(type as PromptType)) {
    return type as PromptType;
  }
  throw new PromptVersionServiceError(
    `type must be one of: ${PROMPT_TYPES.join(', ')}`,
  );
}

function validateContent(content: string | undefined): string {
  if (typeof content !== 'string') {
    throw new PromptVersionServiceError('content is required');
  }
  if (content.length < CONTENT_MIN) {
    throw new PromptVersionServiceError('content cannot be empty');
  }
  if (content.length > CONTENT_MAX) {
    throw new PromptVersionServiceError(
      `content must be ≤ ${CONTENT_MAX} characters`,
    );
  }
  return content;
}

function validateUsedFor(usedFor: string | undefined): string {
  if (typeof usedFor !== 'string') {
    throw new PromptVersionServiceError('usedFor is required');
  }
  const v = usedFor.trim();
  if (v.length === 0) {
    throw new PromptVersionServiceError('usedFor cannot be empty');
  }
  if (v.length > USED_FOR_MAX) {
    throw new PromptVersionServiceError(
      `usedFor must be ≤ ${USED_FOR_MAX} characters`,
    );
  }
  return v;
}

function validateScore(score: number | null | undefined): number | null {
  if (score === undefined || score === null) return null;
  if (typeof score !== 'number' || Number.isNaN(score) || !Number.isFinite(score)) {
    throw new PromptVersionServiceError('score must be a number');
  }
  if (score < SCORE_MIN || score > SCORE_MAX) {
    throw new PromptVersionServiceError(
      `score must be between ${SCORE_MIN} and ${SCORE_MAX}`,
    );
  }
  return Math.round(score);
}

/* ----------------- Read ----------------- */

export async function listPromptVersions(): Promise<PromptVersion[]> {
  return _repoListSorted();
}

export async function getPromptVersion(
  id: string,
): Promise<PromptVersion | undefined> {
  return _repoGet(id);
}

export async function listPromptVersionsByType(
  type: PromptType,
): Promise<PromptVersion[]> {
  return _repoListByType(type);
}

export async function listPromptVersionsByName(
  name: string,
): Promise<PromptVersion[]> {
  return _repoListByName(name);
}

export async function listPromptVersionsFiltered(filter: {
  type?: PromptType;
  name?: string;
}): Promise<PromptVersion[]> {
  const all = await _repoListSorted();
  return all
    .filter((p) => (filter.type ? p.type === filter.type : true))
    .filter((p) => (filter.name ? p.name === filter.name : true));
}

export async function getLatestPromptVersion(
  type: PromptType,
  name: string,
): Promise<PromptVersion | undefined> {
  const list = await _repoListByName(name);
  const same = list.filter((p) => p.type === type);
  if (same.length === 0) return undefined;
  return same[same.length - 1];
}

/* ----------------- Aggregates ----------------- */

export interface PromptVersionStats {
  totalPrompts: number;
  byType: Record<PromptType, number>;
  distinctNames: number;
  averageScore: number | null;
}

export async function computePromptVersionStats(
  prompts?: PromptVersion[],
): Promise<PromptVersionStats> {
  const all = prompts ?? (await _repoList());
  const byType = {} as Record<PromptType, number>;
  for (const t of PROMPT_TYPES) byType[t] = 0;
  let totalScore = 0;
  let scoreCount = 0;
  for (const p of all) {
    byType[p.type] = (byType[p.type] ?? 0) + 1;
    if (p.score !== null) {
      totalScore += p.score;
      scoreCount += 1;
    }
  }
  const distinctNames = new Set(all.map((p) => p.name)).size;
  return {
    totalPrompts: all.length,
    byType,
    distinctNames,
    averageScore: scoreCount === 0 ? null : Math.round(totalScore / scoreCount),
  };
}

/* ----------------- Write ----------------- */

export interface CreatePromptVersionInput {
  id: string;
  name: string;
  type: PromptType;
  content: string;
  usedFor: string;
  score: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePromptVersionInput {
  name?: string;
  type?: PromptType;
  content?: string;
  usedFor?: string;
  score?: number | null;
  updatedAt: string;
}

export async function createPromptVersion(
  input: CreatePromptVersionInput,
): Promise<PromptVersion> {
  const name = validateName(input.name);
  const type = validateType(input.type);
  const content = validateContent(input.content);
  const usedFor = validateUsedFor(input.usedFor);
  const score = validateScore(input.score);

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new PromptVersionServiceError(
      `Prompt version with id "${input.id}" already exists`,
    );
  }

  const version = await _repoNextVersion(type, name);

  const created: PromptVersion = {
    id: input.id,
    name,
    type,
    content,
    version,
    usedFor,
    score,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updatePromptVersion(
  id: string,
  patch: UpdatePromptVersionInput,
): Promise<PromptVersion> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new PromptVersionServiceError(`Prompt version not found: ${id}`);
  }
  const name = patch.name !== undefined ? validateName(patch.name) : existing.name;
  const type = patch.type !== undefined ? validateType(patch.type) : existing.type;
  const content =
    patch.content !== undefined ? validateContent(patch.content) : existing.content;
  const usedFor =
    patch.usedFor !== undefined ? validateUsedFor(patch.usedFor) : existing.usedFor;
  // score: undefined = skip; null = clear; number = validate
  const score =
    patch.score === undefined
      ? existing.score
      : patch.score === null
        ? null
        : validateScore(patch.score);

  const next: PromptVersion = {
    id: existing.id,
    name,
    type,
    content,
    version: existing.version,
    usedFor,
    score,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new PromptVersionServiceError(
      `failed to persist prompt version update: ${id}`,
    );
  }
  return updated;
}

export async function deletePromptVersion(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new PromptVersionServiceError(`Prompt version not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Suggest improvement ----------------- */

/** 调用 LLMProvider 生成改进建议草稿（不落库）。 */
export async function suggestImprovementForPrompt(
  promptId: string,
): Promise<ImprovementDraft> {
  const prompt = await _repoGet(promptId);
  if (!prompt) {
    throw new PromptVersionServiceError(`Prompt version not found: ${promptId}`);
  }
  const provider = await getLLMProvider();
  return provider.suggestImprovement({ kind: 'prompt', prompt });
}
