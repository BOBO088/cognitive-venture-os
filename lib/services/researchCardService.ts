/**
 * ResearchCardService — 业务规则层 + AI 生成编排。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            → LLMProvider（AI 草稿生成）
 *
 * 关键点：
 *   1. **不**在 service 写 LLM 提示词 / 调 OpenAI SDK。AI 草稿全部走 LLMProvider
 *      接口（mock 或未来真实实现）。
 *   2. AI 草稿生成 = `getLLMProvider().generateCardDraftFromSource/Topic()`，
 *      service 拿到草稿后做规范化（tags / score）再入库。
 *   3. 导出 Markdown 是纯函数，无副作用。
 *
 * 业务规则：
 *   - title 必填 1-300
 *   - summary 必填 1-2000
 *   - topicId 引用必须存在
 *   - score ∈ [0, 100]
 *   - keyInsights / evidence / risks 各项最多 20 条
 *   - tags 规范化（lowercase / 空格→'-' / 截断 32 / 去重 / ≤ 20）
 *   - sourceIds 可空：未指定时至少需要 topicId
 */

import {
  listResearchCards as _repoList,
  getResearchCard as _repoGet,
  listResearchCardsByTopic as _repoListByTopic,
  listResearchCardsBySource as _repoListBySource,
  createResearchCard as _repoCreate,
  updateResearchCard as _repoCreate_update,
  deleteResearchCard as _repoDelete,
  type CreateResearchCardInput,
  type UpdateResearchCardInput,
} from '@/lib/repos/research';
import { getResearchTopic } from '@/lib/repos/research';
import { getLLMProvider } from '@/lib/providers';
import { CREDIBILITY_MIN, CREDIBILITY_MAX } from '@/types';
import type { ResearchCard, SourceItem, ResearchTopic, ResearchCard as ResearchCardType } from '@/types';
import type { CardDraft } from '@/lib/providers/llm';

// Re-export to avoid "unused" lint when callers only use the type
export type { ResearchCardType };

const TITLE_MAX = 300;
const SUMMARY_MAX = 2000;
const TAGS_MAX = 20;
const ITEMS_MAX = 20;
const TAG_MAX_LEN = 32;

export class ResearchCardServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResearchCardServiceError';
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

function normalizeList(input: string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = raw.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= ITEMS_MAX) break;
  }
  return out;
}

function validateTitle(title: string | undefined): string {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new ResearchCardServiceError('title is required');
  }
  const trimmed = title.trim();
  if (trimmed.length > TITLE_MAX) {
    throw new ResearchCardServiceError(`title must be ≤ ${TITLE_MAX} chars`);
  }
  return trimmed;
}

function validateSummary(summary: string | undefined): string {
  if (typeof summary !== 'string' || summary.trim() === '') {
    throw new ResearchCardServiceError('summary is required');
  }
  const trimmed = summary.trim();
  if (trimmed.length > SUMMARY_MAX) {
    throw new ResearchCardServiceError(`summary must be ≤ ${SUMMARY_MAX} chars`);
  }
  return trimmed;
}

function validateScore(score: number | undefined): number | undefined {
  if (score === undefined || score === null) return undefined;
  if (typeof score !== 'number' || Number.isNaN(score)) {
    throw new ResearchCardServiceError('score must be a number');
  }
  if (score < CREDIBILITY_MIN || score > CREDIBILITY_MAX) {
    throw new ResearchCardServiceError(
      `score must be in [${CREDIBILITY_MIN}, ${CREDIBILITY_MAX}]`,
    );
  }
  return Math.round(score);
}

async function validateTopicRef(topicId: string | undefined): Promise<string> {
  if (!topicId) {
    throw new ResearchCardServiceError('topicId is required');
  }
  const t = await getResearchTopic(topicId);
  if (!t) {
    throw new ResearchCardServiceError(`topicId references unknown topic: ${topicId}`);
  }
  return topicId;
}

/** 规范化一份 CardDraft → 可直接入库的字段。 */
function normalizeDraft(draft: CardDraft): {
  title: string;
  summary: string;
  keyInsights: string[];
  evidence: string[];
  risks: string[];
  tags: string[];
  score?: number;
} {
  return {
    title: draft.title?.trim() || '(untitled draft)',
    summary: draft.summary?.trim() || '(no summary)',
    keyInsights: normalizeList(draft.keyInsights),
    evidence: normalizeList(draft.evidence),
    risks: normalizeList(draft.risks),
    tags: normalizeTags(draft.tags),
    score: validateScore(draft.score),
  };
}

/* ============================================================ */
/* Read 入口                                                        */
/* ============================================================ */

export async function listCards(): Promise<ResearchCard[]> {
  return _repoList();
}

export async function getCard(id: string): Promise<ResearchCard | undefined> {
  return _repoGet(id);
}

export async function listCardsByTopic(topicId: string): Promise<ResearchCard[]> {
  return _repoListByTopic(topicId);
}

export async function listCardsBySource(sourceId: string): Promise<ResearchCard[]> {
  return _repoListBySource(sourceId);
}

/* ============================================================ */
/* Write 入口                                                        */
/* ============================================================ */

export async function createCard(input: CreateResearchCardInput): Promise<ResearchCard> {
  const title = validateTitle(input.title);
  const summary = validateSummary(input.summary);
  const topicId = await validateTopicRef(input.topicId);
  const score = validateScore(input.score);

  return _repoCreate({
    ...input,
    title,
    summary,
    topicId,
    score,
    tags: normalizeTags(input.tags),
    keyInsights: normalizeList(input.keyInsights),
    evidence: normalizeList(input.evidence),
    risks: normalizeList(input.risks),
  });
}

export async function updateCard(
  id: string,
  patch: UpdateResearchCardInput,
): Promise<ResearchCard> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new ResearchCardServiceError(`card not found: ${id}`);
  }
  if (patch.title !== undefined) patch.title = validateTitle(patch.title);
  if (patch.summary !== undefined) patch.summary = validateSummary(patch.summary);
  if (patch.topicId !== undefined) {
    patch.topicId = await validateTopicRef(patch.topicId);
  }
  if (patch.score !== undefined) patch.score = validateScore(patch.score);
  if (patch.tags !== undefined) patch.tags = normalizeTags(patch.tags);
  if (patch.keyInsights !== undefined) patch.keyInsights = normalizeList(patch.keyInsights);
  if (patch.evidence !== undefined) patch.evidence = normalizeList(patch.evidence);
  if (patch.risks !== undefined) patch.risks = normalizeList(patch.risks);
  return _repoCreate_update(id, patch);
}

export async function deleteCard(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new ResearchCardServiceError(`card not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ============================================================ */
/* AI 生成（via LLMProvider）                                          */
/* ============================================================ */

/**
 * 从一条 SourceItem 生成卡片草稿。AI 逻辑在 LLMProvider 内，service 只做编排。
 */
export async function generateCardDraftFromSource(
  source: SourceItem,
): Promise<CardDraft> {
  const llm = await getLLMProvider();
  return llm.generateCardDraftFromSource(source);
}

/**
 * 从 topic + 关联 sourceIds 生成卡片草稿。
 */
export async function generateCardDraftFromTopic(
  topic: ResearchTopic,
  sourceIds: string[],
): Promise<CardDraft> {
  const llm = await getLLMProvider();
  return llm.generateCardDraftFromTopic(topic, sourceIds);
}

/**
 * 一步式：从 source 自动创建卡片（含 LLM 生成 + 入库）。
 * 用于 "From source → 卡片" 流程。
 */
export async function createCardFromSource(
  source: SourceItem,
  topicId: string,
): Promise<ResearchCard> {
  const draft = await generateCardDraftFromSource(source);
  const normalized = normalizeDraft(draft);
  return _repoCreate({
    topicId,
    sourceIds: [source.id],
    title: normalized.title,
    summary: normalized.summary,
    keyInsights: normalized.keyInsights,
    evidence: normalized.evidence,
    risks: normalized.risks,
    tags: normalized.tags,
    score: normalized.score,
  });
}

/**
 * 一步式：从 topic + sourceIds 自动创建卡片。
 * 用于 "From topic → 卡片" 流程。
 */
export async function createCardFromTopic(
  topic: ResearchTopic,
  sourceIds: string[],
): Promise<ResearchCard> {
  const draft = await generateCardDraftFromTopic(topic, sourceIds);
  const normalized = normalizeDraft(draft);
  return _repoCreate({
    topicId: topic.id,
    sourceIds,
    title: normalized.title,
    summary: normalized.summary,
    keyInsights: normalized.keyInsights,
    evidence: normalized.evidence,
    risks: normalized.risks,
    tags: normalized.tags,
    score: normalized.score,
  });
}

/* ============================================================ */
/* Markdown 导出                                                    */
/* ============================================================ */


function renderList(items: string[] | undefined, emptyHint = '_(none)_'): string {
  if (!items || items.length === 0) return emptyHint;
  return items.map((it) => `- ${it}`).join('\n');
}

/**
 * 把 ResearchCard 渲染为 Markdown 字符串。
 * UI 用 client-side download 触发，不走 server action。
 */
export function exportMarkdown(card: ResearchCard): string {
  const tagsLine = card.tags && card.tags.length > 0
    ? card.tags.map((t) => `\`${t}\``).join(' ')
    : '';
  const scoreLine = card.score !== undefined ? `**Score:** ${card.score}/100\n\n` : '';
  const sourcesLine = card.sourceIds.length > 0
    ? card.sourceIds.map((id) => `\`${id}\``).join(' ')
    : '_(no sources)_';

  return [
    `# ${card.title}`,
    '',
    tagsLine ? `**Tags:** ${tagsLine}\n` : '',
    scoreLine,
    `**Topic:** \`${card.topicId}\`  `,
    `**Sources:** ${sourcesLine}`,
    '',
    '## Summary',
    '',
    card.summary,
    '',
    '## Key insights',
    '',
    renderList(card.keyInsights),
    '',
    '## Evidence',
    '',
    renderList(card.evidence),
    '',
    '## Risks',
    '',
    renderList(card.risks),
    '',
    '---',
    '',
    `id: \`${card.id}\`  `,
    `created: ${card.createdAt}  `,
    `updated: ${card.updatedAt}`,
    '',
  ].filter((line) => line !== '' || true).join('\n');
}
