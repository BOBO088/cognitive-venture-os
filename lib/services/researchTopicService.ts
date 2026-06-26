/**
 * ResearchTopicService — 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 * 业务规则：
 *   1. title 必填，1-200 字符
 *   2. tags 规范化：trim、lowercase、去重、上限 20
 *   3. status 转移受约束（不允许跨级跳）
 *   4. 删除保护：若 topic 关联了 cards / signals，禁止删除
 *
 * 切到 Supabase：只改 repo，service 零改动。
 */

import {
  listResearchTopics as _repoList,
  getResearchTopic as _repoGet,
  createResearchTopic as _repoCreate,
  updateResearchTopic as _repoUpdate,
  deleteResearchTopic as _repoDelete,
  type CreateResearchTopicInput,
  type UpdateResearchTopicInput,
} from '@/lib/repos/research';
import type { ResearchTopic, ResearchTopicStatus } from '@/types';

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const TAGS_MAX = 20;
const TAG_MAX_LEN = 32;

/** 允许的 status 转移。 */
const STATUS_TRANSITIONS: Record<ResearchTopicStatus, ResearchTopicStatus[]> = {
  active: ['completed', 'archived'],
  completed: ['active', 'archived'],
  archived: ['active'],
};

export class ResearchTopicServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResearchTopicServiceError';
  }
}

function normalizeTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, '-').slice(0, TAG_MAX_LEN);
}

function normalizeTags(input: string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = normalizeTag(raw);
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= TAGS_MAX) break;
  }
  return out;
}

function validateTitle(title: string | undefined): string {
  if (typeof title !== 'string') {
    throw new ResearchTopicServiceError('title is required');
  }
  const trimmed = title.trim();
  if (trimmed.length < TITLE_MIN) {
    throw new ResearchTopicServiceError('title is required');
  }
  if (trimmed.length > TITLE_MAX) {
    throw new ResearchTopicServiceError(`title must be ≤ ${TITLE_MAX} chars`);
  }
  return trimmed;
}

function validateStatusTransition(
  current: ResearchTopicStatus,
  next: ResearchTopicStatus,
): void {
  if (current === next) return;
  const allowed = STATUS_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new ResearchTopicServiceError(
      `invalid status transition: ${current} → ${next}`,
    );
  }
}

export async function listTopics(): Promise<ResearchTopic[]> {
  const topics = await _repoList();
  // 默认按 updatedAt 倒序
  return [...topics].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTopic(id: string): Promise<ResearchTopic | undefined> {
  return _repoGet(id);
}

export async function createTopic(
  input: CreateResearchTopicInput,
): Promise<ResearchTopic> {
  const title = validateTitle(input.title);
  return _repoCreate({
    ...input,
    title,
    tags: normalizeTags(input.tags),
    priority: input.priority ?? 'medium',
    status: input.status ?? 'active',
  });
}

export async function updateTopic(
  id: string,
  patch: UpdateResearchTopicInput,
): Promise<ResearchTopic> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new ResearchTopicServiceError(`topic not found: ${id}`);
  }
  if (patch.title !== undefined) {
    patch.title = validateTitle(patch.title);
  }
  if (patch.status && patch.status !== existing.status) {
    validateStatusTransition(existing.status, patch.status);
  }
  if (patch.tags !== undefined) {
    patch.tags = normalizeTags(patch.tags);
  }
  return _repoUpdate(id, patch);
}

export async function deleteTopic(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new ResearchTopicServiceError(`topic not found: ${id}`);
  }
  // 删除保护：有关联 children 时拒绝
  if (existing.cardIds.length > 0 || existing.signalIds.length > 0) {
    throw new ResearchTopicServiceError(
      `cannot delete topic with ${existing.cardIds.length} card(s) and ${existing.signalIds.length} signal(s); archive it instead`,
    );
  }
  await _repoDelete(id);
}
