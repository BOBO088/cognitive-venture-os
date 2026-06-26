/**
 * SignalService — Signal 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ graphEntityRepo（校验 linkedEntityIds 引用）
 *                            ↘ researchCardRepo（校验 linkedResearchCardIds 引用）
 *
 * 业务规则：
 *   1. title 必填，1-200 字符
 *   2. source 必填，1-500 字符
 *   3. category 必填，必须 ∈ SignalCategory 联合（11 个值）
 *   4. description 必填，≤ 4000 字符
 *   5. evidence 可选，≤ 2000 字符
 *   6. confidence ∈ [0, 100] 整数
 *   7. linkedEntityIds / linkedResearchCardIds 手动管理：
 *      - 去重
 *      - 上限 50
 *      - 引用必须存在于对应域（service 校验）
 *   8. id / createdAt / updatedAt 由调用方提供（service 不主动生成，
 *      保持 service 纯净；id 由 actions 决定）
 *
 * 与 GraphRelation 上的同名策略一致：「手动管理，不派生」。
 */

import {
  listSignals as _repoList,
  getSignal as _repoGet,
  listSignalsByCategory as _repoListByCategory,
  insertSignal as _repoInsert,
  updateSignalInStore as _repoUpdate,
  deleteSignalFromStore as _repoDelete,
} from '@/lib/repos/opportunities';
import { getGraphEntity } from '@/lib/repos/knowledge-graph';
import { getResearchCard } from '@/lib/repos/research';
import {
  SIGNAL_CONFIDENCE_MIN,
  SIGNAL_CONFIDENCE_MAX,
} from '@/types';
import type {
  Signal,
  SignalCategory,
} from '@/types';

const TITLE_MAX = 200;
const SOURCE_MAX = 500;
const DESCRIPTION_MAX = 4000;
const EVIDENCE_MAX = 2000;
const LINKED_MAX = 50;

const VALID_CATEGORIES: SignalCategory[] = [
  'funding',
  'product_launch',
  'github_trend',
  'hiring_signal',
  'customer_pain',
  'regulation',
  'technology_breakthrough',
  'content_trend',
  'geo_trend',
  'ip_trend',
  'short_video_trend',
];

export class SignalServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignalServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateTitle(title: string | undefined): string {
  if (typeof title !== 'string') {
    throw new SignalServiceError('title is required');
  }
  const t = title.trim();
  if (t.length === 0) {
    throw new SignalServiceError('title cannot be empty');
  }
  if (t.length > TITLE_MAX) {
    throw new SignalServiceError(`title must be ≤ ${TITLE_MAX} characters`);
  }
  return t;
}

function validateSource(source: string | undefined): string {
  if (typeof source !== 'string') {
    throw new SignalServiceError('source is required');
  }
  const s = source.trim();
  if (s.length === 0) {
    throw new SignalServiceError('source cannot be empty');
  }
  if (s.length > SOURCE_MAX) {
    throw new SignalServiceError(`source must be ≤ ${SOURCE_MAX} characters`);
  }
  return s;
}

function validateCategory(category: string | undefined): SignalCategory {
  if (VALID_CATEGORIES.includes(category as SignalCategory)) {
    return category as SignalCategory;
  }
  throw new SignalServiceError(
    `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
  );
}

function validateDescription(description: string | undefined): string {
  if (typeof description !== 'string') {
    throw new SignalServiceError('description is required');
  }
  if (description.length > DESCRIPTION_MAX) {
    throw new SignalServiceError(`description must be ≤ ${DESCRIPTION_MAX} characters`);
  }
  return description;
}

function validateEvidence(evidence: string | undefined): string | undefined {
  if (evidence === undefined) return undefined;
  if (typeof evidence !== 'string') {
    throw new SignalServiceError('evidence must be a string');
  }
  if (evidence.length > EVIDENCE_MAX) {
    throw new SignalServiceError(`evidence must be ≤ ${EVIDENCE_MAX} characters`);
  }
  return evidence;
}

function validateConfidence(confidence: number | undefined): number {
  if (confidence === undefined || confidence === null) {
    throw new SignalServiceError('confidence is required');
  }
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    throw new SignalServiceError('confidence must be a number');
  }
  if (confidence < SIGNAL_CONFIDENCE_MIN || confidence > SIGNAL_CONFIDENCE_MAX) {
    throw new SignalServiceError(
      `confidence must be in [${SIGNAL_CONFIDENCE_MIN}, ${SIGNAL_CONFIDENCE_MAX}]`,
    );
  }
  return Math.round(confidence);
}

function dedupAndCap(ids: string[] | undefined, fieldName: string): string[] {
  if (!ids) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= LINKED_MAX) {
      throw new SignalServiceError(`${fieldName} cannot exceed ${LINKED_MAX} unique ids`);
    }
  }
  return out;
}

async function validateEntityIds(ids: string[]): Promise<string[]> {
  for (const id of ids) {
    const e = await getGraphEntity(id);
    if (!e) {
      throw new SignalServiceError(`linkedEntityIds references missing entity: ${id}`);
    }
  }
  return ids;
}

async function validateCardIds(ids: string[]): Promise<string[]> {
  for (const id of ids) {
    const c = await getResearchCard(id);
    if (!c) {
      throw new SignalServiceError(
        `linkedResearchCardIds references missing card: ${id}`,
      );
    }
  }
  return ids;
}

/* ----------------- Read ----------------- */

export async function listSignals(): Promise<Signal[]> {
  const all = await _repoList();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSignal(id: string): Promise<Signal | undefined> {
  return _repoGet(id);
}

export async function listSignalsByCategory(
  category: SignalCategory,
): Promise<Signal[]> {
  const all = await _repoListByCategory(category);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSignalsFiltered(filter: {
  category?: SignalCategory;
  minConfidence?: number;
}): Promise<Signal[]> {
  const all = await _repoList();
  return all
    .filter((s) => {
      if (filter.category && s.category !== filter.category) return false;
      if (
        filter.minConfidence !== undefined &&
        s.confidence < filter.minConfidence
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ----------------- Write ----------------- */

export interface CreateSignalInput {
  id: string;
  title: string;
  source: string;
  category: SignalCategory;
  description: string;
  evidence?: string;
  confidence: number;
  linkedEntityIds?: string[];
  linkedResearchCardIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSignalInput {
  title?: string;
  source?: string;
  category?: SignalCategory;
  description?: string;
  evidence?: string;
  confidence?: number;
  linkedEntityIds?: string[];
  linkedResearchCardIds?: string[];
  updatedAt: string;
}

export async function createSignal(input: CreateSignalInput): Promise<Signal> {
  const title = validateTitle(input.title);
  const source = validateSource(input.source);
  const category = validateCategory(input.category);
  const description = validateDescription(input.description);
  const evidence = validateEvidence(input.evidence);
  const confidence = validateConfidence(input.confidence);
  const linkedEntityIds = await validateEntityIds(
    dedupAndCap(input.linkedEntityIds, 'linkedEntityIds'),
  );
  const linkedResearchCardIds = await validateCardIds(
    dedupAndCap(input.linkedResearchCardIds, 'linkedResearchCardIds'),
  );

  // id 唯一性
  const existing = await _repoGet(input.id);
  if (existing) {
    throw new SignalServiceError(`signal with id "${input.id}" already exists`);
  }

  const created: Signal = {
    id: input.id,
    title,
    source,
    category,
    description,
    evidence: evidence ?? '',
    confidence,
    linkedEntityIds,
    linkedResearchCardIds,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateSignal(
  id: string,
  patch: UpdateSignalInput,
): Promise<Signal> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new SignalServiceError(`signal not found: ${id}`);
  }
  const title = patch.title !== undefined ? validateTitle(patch.title) : existing.title;
  const source = patch.source !== undefined ? validateSource(patch.source) : existing.source;
  const category = patch.category !== undefined ? validateCategory(patch.category) : existing.category;
  const description = patch.description !== undefined
    ? validateDescription(patch.description)
    : existing.description;
  const evidence = patch.evidence !== undefined
    ? (validateEvidence(patch.evidence) ?? '')
    : existing.evidence;
  const confidence = patch.confidence !== undefined
    ? validateConfidence(patch.confidence)
    : existing.confidence;
  const linkedEntityIds = patch.linkedEntityIds !== undefined
    ? await validateEntityIds(dedupAndCap(patch.linkedEntityIds, 'linkedEntityIds'))
    : existing.linkedEntityIds;
  const linkedResearchCardIds = patch.linkedResearchCardIds !== undefined
    ? await validateCardIds(dedupAndCap(patch.linkedResearchCardIds, 'linkedResearchCardIds'))
    : existing.linkedResearchCardIds;

  const next: Signal = {
    id: existing.id,
    title,
    source,
    category,
    description,
    evidence,
    confidence,
    linkedEntityIds,
    linkedResearchCardIds,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(existing.id, next);
  if (!updated) {
    throw new SignalServiceError(`failed to persist signal update: ${id}`);
  }
  return updated;
}

export async function deleteSignal(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new SignalServiceError(`signal not found: ${id}`);
  }
  await _repoDelete(id);
}

/* ----------------- Bind / Unbind ----------------- */

export async function bindEntityToSignal(
  signalId: string,
  entityId: string,
): Promise<Signal> {
  const signal = await _repoGet(signalId);
  if (!signal) {
    throw new SignalServiceError(`signal not found: ${signalId}`);
  }
  if (signal.linkedEntityIds.includes(entityId)) {
    return signal;
  }
  if (signal.linkedEntityIds.length >= LINKED_MAX) {
    throw new SignalServiceError(
      `linkedEntityIds cannot exceed ${LINKED_MAX}`,
    );
  }
  await validateEntityIds([entityId]);
  return updateSignal(signalId, {
    linkedEntityIds: [...signal.linkedEntityIds, entityId],
    updatedAt: new Date().toISOString(),
  });
}

export async function unbindEntityFromSignal(
  signalId: string,
  entityId: string,
): Promise<Signal> {
  const signal = await _repoGet(signalId);
  if (!signal) {
    throw new SignalServiceError(`signal not found: ${signalId}`);
  }
  if (!signal.linkedEntityIds.includes(entityId)) {
    return signal;
  }
  return updateSignal(signalId, {
    linkedEntityIds: signal.linkedEntityIds.filter((id) => id !== entityId),
    updatedAt: new Date().toISOString(),
  });
}

export async function bindCardToSignal(
  signalId: string,
  cardId: string,
): Promise<Signal> {
  const signal = await _repoGet(signalId);
  if (!signal) {
    throw new SignalServiceError(`signal not found: ${signalId}`);
  }
  if (signal.linkedResearchCardIds.includes(cardId)) {
    return signal;
  }
  if (signal.linkedResearchCardIds.length >= LINKED_MAX) {
    throw new SignalServiceError(
      `linkedResearchCardIds cannot exceed ${LINKED_MAX}`,
    );
  }
  await validateCardIds([cardId]);
  return updateSignal(signalId, {
    linkedResearchCardIds: [...signal.linkedResearchCardIds, cardId],
    updatedAt: new Date().toISOString(),
  });
}

export async function unbindCardFromSignal(
  signalId: string,
  cardId: string,
): Promise<Signal> {
  const signal = await _repoGet(signalId);
  if (!signal) {
    throw new SignalServiceError(`signal not found: ${signalId}`);
  }
  if (!signal.linkedResearchCardIds.includes(cardId)) {
    return signal;
  }
  return updateSignal(signalId, {
    linkedResearchCardIds: signal.linkedResearchCardIds.filter((id) => id !== cardId),
    updatedAt: new Date().toISOString(),
  });
}
