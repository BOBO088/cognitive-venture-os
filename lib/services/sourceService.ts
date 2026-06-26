/**
 * SourceService — 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 * 业务规则：
 *   1. title 必填，1-300 字符
 *   2. type 必填，必须是 SourceType 联合之一
 *   3. url 格式校验（http/https，可选）
 *   4. credibilityScore ∈ [0, 100]（optional）
 *   5. tags 规范化：trim / lowercase / 空格→'-' / 截断 32 / 去重 / 上限 20
 *   6. topicId 引用存在性校验（不引用不存在的 topic）
 *   7. 搜索：跨 title / summary / notes / author / tags 的不区分大小写子串匹配
 *
 * 切到 Supabase：只改 repo，service 零改动。
 *
 * 未来接入 RSS / Browser MCP / 网页抓取 / 文件上传：见 SourceConnector
 * （lib/providers/connectors/source.ts）；service 可注入 connector 做"从 URL
 * 拉取 metadata" 的快捷创建路径。
 */

import {
  listSources as _repoList,
  getSource as _repoGet,
  listSourcesByTopic as _repoListByTopic,
  listSourcesByType as _repoListByType,
  searchSources as _repoSearch,
  createSource as _repoCreate,
  updateSource as _repoUpdate,
  deleteSource as _repoDelete,
  type CreateSourceInput,
  type UpdateSourceInput,
} from '@/lib/repos/research';
import { getResearchTopic } from '@/lib/repos/research';
import { CREDIBILITY_MIN, CREDIBILITY_MAX } from '@/types';
import type {
  SourceItem,
  SourceType,
  ResearchTopic,
} from '@/types';

const TITLE_MAX = 300;
const TAGS_MAX = 20;
const TAG_MAX_LEN = 32;
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

const VALID_TYPES: SourceType[] = [
  'article', 'paper', 'video', 'website', 'note', 'report', 'book', 'podcast',
];

export class SourceServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceServiceError';
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
  if (typeof title !== 'string' || title.trim() === '') {
    throw new SourceServiceError('title is required');
  }
  const trimmed = title.trim();
  if (trimmed.length > TITLE_MAX) {
    throw new SourceServiceError(`title must be ≤ ${TITLE_MAX} chars`);
  }
  return trimmed;
}

function validateType(type: string | undefined): SourceType {
  if (VALID_TYPES.includes(type as SourceType)) {
    return type as SourceType;
  }
  throw new SourceServiceError(
    `type must be one of: ${VALID_TYPES.join(', ')}`,
  );
}

function validateUrl(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  const trimmed = url.trim();
  if (trimmed === '') return undefined;
  if (!URL_PATTERN.test(trimmed)) {
    throw new SourceServiceError('url must start with http:// or https://');
  }
  return trimmed;
}

function validateCredibility(score: number | undefined): number | undefined {
  if (score === undefined) return undefined;
  if (typeof score !== 'number' || Number.isNaN(score)) {
    throw new SourceServiceError('credibilityScore must be a number');
  }
  if (score < CREDIBILITY_MIN || score > CREDIBILITY_MAX) {
    throw new SourceServiceError(
      `credibilityScore must be in [${CREDIBILITY_MIN}, ${CREDIBILITY_MAX}]`,
    );
  }
  return Math.round(score);
}

/** 校验 topicId：存在或 undefined。service 透传 repo 的查询。 */
async function validateTopicRef(topicId: string | undefined): Promise<string | undefined> {
  if (!topicId) return undefined;
  const t = await getResearchTopic(topicId);
  if (!t) {
    throw new SourceServiceError(`topicId references unknown topic: ${topicId}`);
  }
  return topicId;
}

export async function listSources(): Promise<SourceItem[]> {
  return _repoList();
}

export async function getSource(id: string): Promise<SourceItem | undefined> {
  return _repoGet(id);
}

export async function listSourcesByTopic(topicId: string): Promise<SourceItem[]> {
  return _repoListByTopic(topicId);
}

export async function listSourcesByType(type: SourceType): Promise<SourceItem[]> {
  return _repoListByType(type);
}

export async function searchSources(query: string): Promise<SourceItem[]> {
  return _repoSearch(query);
}

/** 取一个 topic 的全部 sources。供 topic 详情页使用。 */
export async function listSourcesWithTopic(): Promise<Array<{ source: SourceItem; topic: ResearchTopic | undefined }>> {
  const sources = await listSources();
  const topicsById = new Map<string, ResearchTopic>();
  // 解析 topicId → 缓存到 map，避免 N+1
  const uniqTopicIds = Array.from(new Set(sources.map((s) => s.topicId).filter((t): t is string => !!t)));
  await Promise.all(
    uniqTopicIds.map(async (id) => {
      const t = await getResearchTopic(id);
      if (t) topicsById.set(id, t);
    }),
  );
  return sources.map((source) => ({
    source,
    topic: source.topicId ? topicsById.get(source.topicId) : undefined,
  }));
}

export async function createSource(input: CreateSourceInput): Promise<SourceItem> {
  const title = validateTitle(input.title);
  const type = validateType(input.type);
  const url = validateUrl(input.url);
  const credibilityScore = validateCredibility(input.credibilityScore);
  const topicId = await validateTopicRef(input.topicId);

  return _repoCreate({
    ...input,
    title,
    type,
    url,
    credibilityScore,
    topicId,
    tags: normalizeTags(input.tags),
  });
}

export async function updateSource(
  id: string,
  patch: UpdateSourceInput,
): Promise<SourceItem> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new SourceServiceError(`source not found: ${id}`);
  }
  if (patch.title !== undefined) patch.title = validateTitle(patch.title);
  if (patch.type !== undefined) patch.type = validateType(patch.type);
  if (patch.url !== undefined) patch.url = validateUrl(patch.url);
  if (patch.credibilityScore !== undefined) {
    patch.credibilityScore = validateCredibility(patch.credibilityScore);
  }
  if (patch.topicId !== undefined) {
    patch.topicId = await validateTopicRef(patch.topicId);
  }
  if (patch.tags !== undefined) patch.tags = normalizeTags(patch.tags);
  return _repoUpdate(id, patch);
}

export async function deleteSource(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new SourceServiceError(`source not found: ${id}`);
  }
  await _repoDelete(id);
}
