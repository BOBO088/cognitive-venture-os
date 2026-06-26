/**
 * Research 仓储：ResearchTopic / SourceItem / ResearchCard 的查询入口。
 *
 * 当前实现 = 直接读 mock-data/research.ts。切到 Supabase 时只改函数体。
 */

import {
  mockResearchTopics,
  mockSourceItems,
  mockResearchCards,
} from '@/mock-data/research';
import type {
  ResearchTopic,
  SourceItem,
  ResearchCard,
  ResearchTopicStatus,
  ResearchCategory,
  ResearchPriority,
  SourceType,
} from '@/types';

export async function listResearchTopics(): Promise<ResearchTopic[]> {
  return mockResearchTopics;
}

export async function getResearchTopic(id: string): Promise<ResearchTopic | undefined> {
  return mockResearchTopics.find((t) => t.id === id);
}

export async function listSourceItems(): Promise<SourceItem[]> {
  return mockSourceItems;
}

export async function getSourceItem(id: string): Promise<SourceItem | undefined> {
  return mockSourceItems.find((s) => s.id === id);
}


const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function newTopicId(): string {
  return `topic_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface CreateResearchTopicInput {
  title: string;
  description?: string;
  category?: ResearchCategory;
  priority?: ResearchPriority;
  tags?: string[];
  status?: ResearchTopicStatus;
  question?: string;
  scope?: string;
  ownerId?: string;
  parentTopicId?: string;
}

export type UpdateResearchTopicInput = Partial<CreateResearchTopicInput>;

export async function createResearchTopic(
  input: CreateResearchTopicInput,
): Promise<ResearchTopic> {
  if (!input.title || input.title.trim() === '') {
    throw new Error('[research repo] title is required');
  }
  const topic: ResearchTopic = {
    id: newTopicId(),
    title: input.title.trim(),
    description: input.description,
    category: input.category,
    priority: input.priority ?? 'medium',
    tags: input.tags ?? [],
    question: input.question,
    scope: input.scope,
    status: input.status ?? 'active',
    ownerId: input.ownerId,
    parentTopicId: input.parentTopicId,
    sourceIds: [],
    cardIds: [],
    signalIds: [],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  mockResearchTopics.unshift(topic);
  return topic;
}

export async function updateResearchTopic(
  id: string,
  patch: UpdateResearchTopicInput,
): Promise<ResearchTopic> {
  const idx = mockResearchTopics.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error(`[research repo] topic not found: ${id}`);
  }
  const existing = mockResearchTopics[idx]!;
  const next: ResearchTopic = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: MOCK_NOW,
  };
  mockResearchTopics[idx] = next;
  return next;
}

export async function deleteResearchTopic(id: string): Promise<void> {
  const idx = mockResearchTopics.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error(`[research repo] topic not found: ${id}`);
  }
  mockResearchTopics.splice(idx, 1);
}


/* ============================================================ */
/* Source CRUD（Source Library 模块）                             */
/* ============================================================ */

export interface CreateSourceInput {
  title: string;
  type: SourceType;
  topicId?: string;
  url?: string;
  summary?: string;
  credibilityScore?: number;
  tags?: string[];
  notes?: string;
  author?: string;
  publishedAt?: string;
}

export type UpdateSourceInput = Partial<CreateSourceInput>;

function newSourceId(): string {
  return `src_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listSources(): Promise<SourceItem[]> {
  return [...mockSourceItems].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSource(id: string): Promise<SourceItem | undefined> {
  return mockSourceItems.find((s) => s.id === id);
}

export async function listSourcesByTopic(topicId: string): Promise<SourceItem[]> {
  return mockSourceItems.filter((s) => s.topicId === topicId);
}

export async function listSourcesByType(type: SourceType): Promise<SourceItem[]> {
  return mockSourceItems.filter((s) => s.type === type);
}

/**
 * 简单搜索：大小写不敏感地匹配 title / summary / notes / tags。
 * 真实场景应替换为 PG full-text 或 OpenSearch；接口签名稳定即可。
 */
export async function searchSources(query: string): Promise<SourceItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listSources();
  return mockSourceItems.filter((s) => {
    const haystack = [
      s.title,
      s.summary ?? '',
      s.notes ?? '',
      s.author ?? '',
      ...(s.tags ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export async function createSource(input: CreateSourceInput): Promise<SourceItem> {
  if (!input.title || input.title.trim() === '') {
    throw new Error('[research repo] source title is required');
  }
  const source: SourceItem = {
    id: newSourceId(),
    title: input.title.trim(),
    type: input.type,
    topicId: input.topicId,
    url: input.url,
    summary: input.summary,
    credibilityScore: input.credibilityScore,
    tags: input.tags ?? [],
    notes: input.notes,
    author: input.author,
    publishedAt: input.publishedAt,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  mockSourceItems.unshift(source);
  return source;
}

export async function updateSource(
  id: string,
  patch: UpdateSourceInput,
): Promise<SourceItem> {
  const idx = mockSourceItems.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new Error(`[research repo] source not found: ${id}`);
  }
  const existing = mockSourceItems[idx]!;
  const next: SourceItem = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: MOCK_NOW,
  };
  mockSourceItems[idx] = next;
  return next;
}

export async function deleteSource(id: string): Promise<void> {
  const idx = mockSourceItems.findIndex((s) => s.id === id);
  if (idx === -1) {
    throw new Error(`[research repo] source not found: ${id}`);
  }
  mockSourceItems.splice(idx, 1);
}


/* ============================================================ */
/* ResearchCard CRUD（Research Card 模块）                         */
/* ============================================================ */


export interface CreateResearchCardInput {
  topicId: string;
  sourceIds?: string[];
  title: string;
  summary: string;
  keyInsights?: string[];
  evidence?: string[];
  risks?: string[];
  tags?: string[];
  score?: number;
  graphEntityIds?: string[];
  signalId?: string;
}

export type UpdateResearchCardInput = Partial<CreateResearchCardInput>;

function newCardId(): string {
  return `card_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listResearchCards(): Promise<ResearchCard[]> {
  return [...mockResearchCards].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listResearchCardsByTopic(topicId: string): Promise<ResearchCard[]> {
  return mockResearchCards.filter((c) => c.topicId === topicId);
}

export async function listResearchCardsBySource(sourceId: string): Promise<ResearchCard[]> {
  return mockResearchCards.filter((c) => c.sourceIds.includes(sourceId));
}

export async function getResearchCard(id: string): Promise<ResearchCard | undefined> {
  return mockResearchCards.find((c) => c.id === id);
}

export async function createResearchCard(input: CreateResearchCardInput): Promise<ResearchCard> {
  if (!input.title || input.title.trim() === '') {
    throw new Error('[research repo] card title is required');
  }
  if (!input.summary || input.summary.trim() === '') {
    throw new Error('[research repo] card summary is required');
  }
  if (!input.topicId || input.topicId.trim() === '') {
    throw new Error('[research repo] card topicId is required');
  }
  const card: ResearchCard = {
    id: newCardId(),
    topicId: input.topicId,
    sourceIds: input.sourceIds ?? [],
    title: input.title.trim(),
    summary: input.summary.trim(),
    keyInsights: input.keyInsights ?? [],
    evidence: input.evidence ?? [],
    risks: input.risks ?? [],
    tags: input.tags ?? [],
    score: input.score,
    graphEntityIds: input.graphEntityIds,
    signalId: input.signalId,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  mockResearchCards.unshift(card);
  return card;
}

export async function updateResearchCard(
  id: string,
  patch: UpdateResearchCardInput,
): Promise<ResearchCard> {
  const idx = mockResearchCards.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error(`[research repo] card not found: ${id}`);
  }
  const existing = mockResearchCards[idx]!;
  const next: ResearchCard = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: MOCK_NOW,
  };
  mockResearchCards[idx] = next;
  return next;
}

export async function deleteResearchCard(id: string): Promise<void> {
  const idx = mockResearchCards.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error(`[research repo] card not found: ${id}`);
  }
  mockResearchCards.splice(idx, 1);
}
