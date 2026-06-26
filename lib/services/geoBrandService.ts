/**
 * GeoBrandService — BrandEntityProfile 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ mvpProjectService（校验 relatedProjectIds 引用）
 *                            ↘ graphEntityService（校验 relatedEntityIds 引用）
 *
 * 业务规则：
 *   1. name 1-200 字符
 *   2. description 1-4000 字符
 *   3. category ∈ BRAND_ENTITY_CATEGORIES
 *   4. targetAudience 1-1000 字符
 *   5. competitors / keyClaims / proofPoints：每项 trim / 去空 / 去重 / 上限 20
 *   6. officialLinks：每项必须是合法 http/https URL，上限 20
 *   7. relatedProjectIds：每个 id 必须指向存在的 MVPProject
 *   8. relatedEntityIds：每个 id 必须指向存在的 GraphEntity
 *   9. id 唯一性
 *  10. createdAt / updatedAt 由调用方提供
 *
 * 与 GEOBrandEntity 的关系：BrandEntityProfile = 真实世界的业务画像；
 * GEOBrandEntity = AI 搜索里的投影。两者独立，不互相派生。
 */

import {
  listBrandEntityProfiles as _repoList,
  listBrandEntityProfilesSorted as _repoListSorted,
  listBrandEntityProfilesByCategory as _repoListByCategory,
  getBrandEntityProfile as _repoGet,
  insertBrandEntityProfile as _repoInsert,
  updateBrandEntityProfileInStore as _repoUpdate,
  deleteBrandEntityProfileFromStore as _repoDelete,
} from '@/lib/repos/geo';
import { getMVPProject } from './mvpProjectService';
import { getEntity as getGraphEntity } from './graphEntityService';
import { BRAND_ENTITY_CATEGORIES } from '@/types';
import type {
  BrandEntityProfile,
  BrandEntityCategory,
} from '@/types';

const NAME_MIN = 1;
const NAME_MAX = 200;
const DESCRIPTION_MIN = 1;
const DESCRIPTION_MAX = 4000;
const AUDIENCE_MIN = 1;
const AUDIENCE_MAX = 1000;
const ITEM_MAX = 20;
const ITEM_TEXT_MAX = 200;
const CLAIM_MAX = 400;
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export class GeoBrandServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoBrandServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateName(name: string | undefined): string {
  if (typeof name !== 'string') {
    throw new GeoBrandServiceError('name is required');
  }
  const v = name.trim();
  if (v.length < NAME_MIN) {
    throw new GeoBrandServiceError('name cannot be empty');
  }
  if (v.length > NAME_MAX) {
    throw new GeoBrandServiceError(`name must be ≤ ${NAME_MAX} characters`);
  }
  return v;
}

function validateDescription(d: string | undefined): string {
  if (typeof d !== 'string') {
    throw new GeoBrandServiceError('description is required');
  }
  const v = d.trim();
  if (v.length < DESCRIPTION_MIN) {
    throw new GeoBrandServiceError('description cannot be empty');
  }
  if (v.length > DESCRIPTION_MAX) {
    throw new GeoBrandServiceError(
      `description must be ≤ ${DESCRIPTION_MAX} characters`,
    );
  }
  return v;
}

function validateCategory(c: string | undefined): BrandEntityCategory {
  if (BRAND_ENTITY_CATEGORIES.includes(c as BrandEntityCategory)) {
    return c as BrandEntityCategory;
  }
  throw new GeoBrandServiceError(
    `category must be one of: ${BRAND_ENTITY_CATEGORIES.join(', ')}`,
  );
}

function validateAudience(a: string | undefined): string {
  if (typeof a !== 'string') {
    throw new GeoBrandServiceError('targetAudience is required');
  }
  const v = a.trim();
  if (v.length < AUDIENCE_MIN) {
    throw new GeoBrandServiceError('targetAudience cannot be empty');
  }
  if (v.length > AUDIENCE_MAX) {
    throw new GeoBrandServiceError(
      `targetAudience must be ≤ ${AUDIENCE_MAX} characters`,
    );
  }
  return v;
}

function normalizeShortItems(
  input: string[] | undefined,
  fieldName: string,
  maxItemLen: number,
): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') {
      throw new GeoBrandServiceError(`${fieldName}[] must be string`);
    }
    const t = raw.trim();
    if (!t) continue;
    if (t.length > maxItemLen) {
      throw new GeoBrandServiceError(
        `${fieldName} item must be ≤ ${maxItemLen} chars: "${t.slice(0, 30)}…"`,
      );
    }
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= ITEM_MAX) {
      throw new GeoBrandServiceError(
        `${fieldName} must be ≤ ${ITEM_MAX} items`,
      );
    }
  }
  return out;
}

function normalizeLinks(input: string[] | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') {
      throw new GeoBrandServiceError('officialLinks[] must be string');
    }
    const t = raw.trim();
    if (!t) continue;
    if (!URL_REGEX.test(t)) {
      throw new GeoBrandServiceError(
        `officialLinks item must be a valid http(s) URL: "${t.slice(0, 40)}"`,
      );
    }
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= ITEM_MAX) {
      throw new GeoBrandServiceError(
        `officialLinks must be ≤ ${ITEM_MAX} items`,
      );
    }
  }
  return out;
}

function normalizeIds(input: string[] | undefined, fieldName: string): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') {
      throw new GeoBrandServiceError(`${fieldName}[] must be string`);
    }
    const t = raw.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= ITEM_MAX * 2) {
      throw new GeoBrandServiceError(
        `${fieldName} must be ≤ ${ITEM_MAX * 2} ids`,
      );
    }
  }
  return out;
}

async function validateProjectReferences(ids: string[]): Promise<void> {
  for (const id of ids) {
    const p = await getMVPProject(id);
    if (!p) {
      throw new GeoBrandServiceError(`MVP project not found: ${id}`);
    }
  }
}

async function validateEntityReferences(ids: string[]): Promise<void> {
  for (const id of ids) {
    const e = await getGraphEntity(id);
    if (!e) {
      throw new GeoBrandServiceError(`Graph entity not found: ${id}`);
    }
  }
}

/* ----------------- Read ----------------- */

export async function listBrandEntityProfiles(): Promise<BrandEntityProfile[]> {
  return _repoListSorted();
}

export async function getBrandEntityProfile(
  id: string,
): Promise<BrandEntityProfile | undefined> {
  return _repoGet(id);
}

export async function listBrandEntityProfilesByCategory(
  category: BrandEntityCategory,
): Promise<BrandEntityProfile[]> {
  return _repoListByCategory(category);
}

export async function listBrandEntityProfilesFiltered(filter: {
  category?: BrandEntityCategory;
  projectId?: string;
  entityId?: string;
}): Promise<BrandEntityProfile[]> {
  const all = await _repoListSorted();
  return all
    .filter((p) =>
      filter.category ? p.category === filter.category : true,
    )
    .filter((p) =>
      filter.projectId ? p.relatedProjectIds.includes(filter.projectId!) : true,
    )
    .filter((p) =>
      filter.entityId ? p.relatedEntityIds.includes(filter.entityId!) : true,
    );
}

/* ----------------- Aggregates ----------------- */

export interface BrandEntityProfileStats {
  totalProfiles: number;
  byCategory: Record<BrandEntityCategory, number>;
  withProjects: number;
  withEntities: number;
}

export async function computeBrandEntityProfileStats(
  profiles?: BrandEntityProfile[],
): Promise<BrandEntityProfileStats> {
  const all = profiles ?? (await _repoList());
  const byCategory = {} as Record<BrandEntityCategory, number>;
  for (const c of BRAND_ENTITY_CATEGORIES) byCategory[c] = 0;
  let withProjects = 0;
  let withEntities = 0;
  for (const p of all) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    if (p.relatedProjectIds.length > 0) withProjects += 1;
    if (p.relatedEntityIds.length > 0) withEntities += 1;
  }
  return {
    totalProfiles: all.length,
    byCategory,
    withProjects,
    withEntities,
  };
}

/* ----------------- Write ----------------- */

export interface CreateBrandEntityProfileInput {
  id: string;
  name: string;
  description: string;
  category: BrandEntityCategory;
  targetAudience: string;
  competitors: string[];
  keyClaims: string[];
  proofPoints: string[];
  officialLinks: string[];
  relatedProjectIds: string[];
  relatedEntityIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBrandEntityProfileInput {
  name?: string;
  description?: string;
  category?: BrandEntityCategory;
  targetAudience?: string;
  competitors?: string[];
  keyClaims?: string[];
  proofPoints?: string[];
  officialLinks?: string[];
  relatedProjectIds?: string[];
  relatedEntityIds?: string[];
  updatedAt: string;
}

export async function createBrandEntityProfile(
  input: CreateBrandEntityProfileInput,
): Promise<BrandEntityProfile> {
  const name = validateName(input.name);
  const description = validateDescription(input.description);
  const category = validateCategory(input.category);
  const targetAudience = validateAudience(input.targetAudience);
  const competitors = normalizeShortItems(
    input.competitors,
    'competitors',
    ITEM_TEXT_MAX,
  );
  const keyClaims = normalizeShortItems(
    input.keyClaims,
    'keyClaims',
    CLAIM_MAX,
  );
  const proofPoints = normalizeShortItems(
    input.proofPoints,
    'proofPoints',
    CLAIM_MAX,
  );
  const officialLinks = normalizeLinks(input.officialLinks);
  const relatedProjectIds = normalizeIds(
    input.relatedProjectIds,
    'relatedProjectIds',
  );
  const relatedEntityIds = normalizeIds(
    input.relatedEntityIds,
    'relatedEntityIds',
  );

  await validateProjectReferences(relatedProjectIds);
  await validateEntityReferences(relatedEntityIds);

  const existing = await _repoGet(input.id);
  if (existing) {
    throw new GeoBrandServiceError(
      `Brand profile with id "${input.id}" already exists`,
    );
  }

  const created: BrandEntityProfile = {
    id: input.id,
    name,
    description,
    category,
    targetAudience,
    competitors,
    keyClaims,
    proofPoints,
    officialLinks,
    relatedProjectIds,
    relatedEntityIds,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

export async function updateBrandEntityProfile(
  id: string,
  patch: UpdateBrandEntityProfileInput,
): Promise<BrandEntityProfile> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new GeoBrandServiceError(`Brand profile not found: ${id}`);
  }
  const name = patch.name !== undefined ? validateName(patch.name) : existing.name;
  const description =
    patch.description !== undefined
      ? validateDescription(patch.description)
      : existing.description;
  const category =
    patch.category !== undefined
      ? validateCategory(patch.category)
      : existing.category;
  const targetAudience =
    patch.targetAudience !== undefined
      ? validateAudience(patch.targetAudience)
      : existing.targetAudience;
  const competitors =
    patch.competitors !== undefined
      ? normalizeShortItems(patch.competitors, 'competitors', ITEM_TEXT_MAX)
      : existing.competitors;
  const keyClaims =
    patch.keyClaims !== undefined
      ? normalizeShortItems(patch.keyClaims, 'keyClaims', CLAIM_MAX)
      : existing.keyClaims;
  const proofPoints =
    patch.proofPoints !== undefined
      ? normalizeShortItems(patch.proofPoints, 'proofPoints', CLAIM_MAX)
      : existing.proofPoints;
  const officialLinks =
    patch.officialLinks !== undefined
      ? normalizeLinks(patch.officialLinks)
      : existing.officialLinks;
  const relatedProjectIds =
    patch.relatedProjectIds !== undefined
      ? normalizeIds(patch.relatedProjectIds, 'relatedProjectIds')
      : existing.relatedProjectIds;
  const relatedEntityIds =
    patch.relatedEntityIds !== undefined
      ? normalizeIds(patch.relatedEntityIds, 'relatedEntityIds')
      : existing.relatedEntityIds;

  // 引用一致性只在引用列实际变化时校验
  if (patch.relatedProjectIds !== undefined) {
    await validateProjectReferences(relatedProjectIds);
  }
  if (patch.relatedEntityIds !== undefined) {
    await validateEntityReferences(relatedEntityIds);
  }

  const next: BrandEntityProfile = {
    id: existing.id,
    name,
    description,
    category,
    targetAudience,
    competitors,
    keyClaims,
    proofPoints,
    officialLinks,
    relatedProjectIds,
    relatedEntityIds,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt,
  };
  const updated = await _repoUpdate(id, next);
  if (!updated) {
    throw new GeoBrandServiceError(
      `failed to persist brand profile update: ${id}`,
    );
  }
  return updated;
}

export async function deleteBrandEntityProfile(id: string): Promise<void> {
  const existing = await _repoGet(id);
  if (!existing) {
    throw new GeoBrandServiceError(`Brand profile not found: ${id}`);
  }
  await _repoDelete(id);
}
