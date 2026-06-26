/**
 * GeoOptimizerService — GEO Content Optimizer 业务规则层。
 *
 * 分层：UI / actions → service（这里）→ repo → mock-data。
 *                            ↘ contentAssetService（校验 assetId 引用）
 *                            ↘ aiQueryService（解析 targetQueries）
 *                            ↘ graphEntityService（解析 graph entities）
 *                            ↘ GEOProvider.analyzeContentAsset（7 维 + 9 项建议）
 *
 * 业务规则：
 *   1. assetId 必须指向存在的 ContentAsset
 *   2. inputType ∈ OPTIMIZER_INPUT_TYPES（6 个值）
 *   3. score 7 维 ∈ [0, 100] 整数
 *   4. score.geoScore 由 service 用 GEO_AUDIT_WEIGHTS 重算（0-100 浮点，1 位小数）
 *   5. suggestions 9 项长度限制（详见 validateSuggestions）
 *   6. explanation 1-1000 字符
 *   7. id 唯一性
 *   8. createdAt / updatedAt 由调用方提供
 *
 * 与 Iteration Layer 的关系：scoring model 版本号（`scoringModelVersion`）
 * 类似 `PromptVersion` / `LoopVersion`，未来可加 `GEOAuditScoringModel`
 * 版本表 + ImprovementLog 关联，做评分模型迭代。
 */

import {
  listGEOAudits as _repoList,
  listGEOAuditsSorted as _repoListSorted,
  listGEOAuditsByAsset as _repoListByAsset,
  getGEOAudit as _repoGet,
  insertGEOAudit as _repoInsert,
} from '@/lib/repos/geo';
import { getContentAsset } from './contentAssetService';
import { getBrandEntityProfile } from './geoBrandService';
import { listAIQueryBankItemsByBrand } from './aiQueryService';
import { listEntities } from './graphEntityService';
import { getGEOProvider } from '@/lib/providers';
import {
  GEO_AUDIT_DIMENSIONS,
  GEO_AUDIT_WEIGHTS,
  OPTIMIZER_INPUT_TYPES,
} from '@/types';
import type {
  GEOAudit,
  GEOAuditDimension,
  GEOAuditScore,
  GEOAuditSuggestions,
  OptimizerInputType,
  GEOAuditOutlineSection,
  GEOAuditFAQItem,
  GEOAuditComparisonRow,
  ContentAssetType,
} from '@/types';

const EXPLANATION_MIN = 1;
const EXPLANATION_MAX = 1000;
const TARGET_QUERIES_MAX = 10;
const CORE_ENTITIES_MAX = 6;
const DEFINABLE_TERMS_MAX = 6;
const EVIDENCE_CHECKLIST_MAX = 8;
const COMPARISON_ROWS_MAX = 6;
const FAQ_MAX = 8;
const STRUCTURED_SUGGESTIONS_MAX = 8;
const OUTLINE_MAX = 8;
const SUGGESTION_TEXT_MAX = 500;
const FAQ_ANSWER_MAX = 500;
const COMPARISON_CELL_MAX = 200;
const OUTLINE_HEADING_MAX = 200;
const OUTLINE_PURPOSE_MAX = 500;
const OUTLINE_NOTE_MAX = 500;

export class GeoOptimizerServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoOptimizerServiceError';
  }
}

/* ----------------- 校验 helpers ----------------- */

function validateInputType(v: string | undefined): OptimizerInputType {
  if (OPTIMIZER_INPUT_TYPES.includes(v as OptimizerInputType)) {
    return v as OptimizerInputType;
  }
  throw new GeoOptimizerServiceError(
    `inputType must be one of: ${OPTIMIZER_INPUT_TYPES.join(', ')}`,
  );
}

function validateDimension(
  v: number,
  field: GEOAuditDimension,
): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new GeoOptimizerServiceError(`${field} must be a number`);
  }
  if (!Number.isInteger(v)) {
    throw new GeoOptimizerServiceError(`${field} must be an integer`);
  }
  if (v < 0 || v > 100) {
    throw new GeoOptimizerServiceError(`${field} must be in [0, 100]`);
  }
  return v;
}

function validateScore(score: GEOAuditScore): GEOAuditScore {
  // 注意：geoScore 跳过整数校验（浮点），但其他 7 维必须整数。
  const dims: Record<GEOAuditDimension, number> = {
    clarity: validateDimension(score.clarity, 'clarity'),
    entity_consistency: validateDimension(
      score.entityConsistency,
      'entity_consistency',
    ),
    evidence_density: validateDimension(
      score.evidenceDensity,
      'evidence_density',
    ),
    citation_worthiness: validateDimension(
      score.citationWorthiness,
      'citation_worthiness',
    ),
    freshness: validateDimension(score.freshness, 'freshness'),
    topical_authority: validateDimension(
      score.topicalAuthority,
      'topical_authority',
    ),
    query_alignment: validateDimension(score.queryAlignment, 'query_alignment'),
  };
  return {
    ...dims,
    clarity: dims.clarity,
    entityConsistency: dims.entity_consistency,
    evidenceDensity: dims.evidence_density,
    citationWorthiness: dims.citation_worthiness,
    freshness: dims.freshness,
    topicalAuthority: dims.topical_authority,
    queryAlignment: dims.query_alignment,
    geoScore: computeWeightedTotal(dims),
  };
}

/** 用 GEO_AUDIT_WEIGHTS 重算 totalScore（1 位小数）。 */
export function computeWeightedTotal(
  dims: Record<GEOAuditDimension, number>,
): number {
  let total = 0;
  for (const k of GEO_AUDIT_DIMENSIONS) {
    total += dims[k] * GEO_AUDIT_WEIGHTS[k];
  }
  return Math.round(total * 10) / 10;
}

function validateString(
  v: string | undefined,
  field: string,
  min: number,
  max: number,
): string {
  if (typeof v !== 'string') {
    throw new GeoOptimizerServiceError(`${field} is required`);
  }
  const t = v.trim();
  if (t.length < min) {
    throw new GeoOptimizerServiceError(`${field} cannot be empty`);
  }
  if (t.length > max) {
    throw new GeoOptimizerServiceError(`${field} must be <= ${max} characters`);
  }
  return t;
}

function validateStringArray(
  v: string[] | undefined,
  field: string,
  max: number,
  min = 0,
): string[] {
  if (!v) return [];
  if (v.length < min) {
    throw new GeoOptimizerServiceError(`${field} must have >= ${min} items`);
  }
  if (v.length > max) {
    throw new GeoOptimizerServiceError(`${field} must have <= ${max} items`);
  }
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== 'string') {
      throw new GeoOptimizerServiceError(`${field}[] must be string`);
    }
    const t = item.trim();
    if (!t) {
      throw new GeoOptimizerServiceError(`${field}[] cannot be empty string`);
    }
    if (t.length > SUGGESTION_TEXT_MAX) {
      throw new GeoOptimizerServiceError(
        `${field}[] item must be <= ${SUGGESTION_TEXT_MAX} characters`,
      );
    }
    out.push(t);
  }
  return out;
}

function validateComparisonTable(
  v: GEOAuditComparisonRow[] | undefined,
): GEOAuditComparisonRow[] {
  if (!v) return [];
  if (v.length > COMPARISON_ROWS_MAX) {
    throw new GeoOptimizerServiceError(
      `comparisonTable must have <= ${COMPARISON_ROWS_MAX} rows`,
    );
  }
  return v.map((row) => {
    if (typeof row !== 'object' || row === null) {
      throw new GeoOptimizerServiceError('comparisonTable[] must be object');
    }
    return {
      dimension: validateString(
        row.dimension,
        'comparisonTable[].dimension',
        1,
        COMPARISON_CELL_MAX,
      ),
      thisSide: validateString(
        row.thisSide,
        'comparisonTable[].thisSide',
        1,
        COMPARISON_CELL_MAX,
      ),
      otherSide: validateString(
        row.otherSide,
        'comparisonTable[].otherSide',
        1,
        COMPARISON_CELL_MAX,
      ),
      ...(typeof row.source === 'string' && row.source.trim()
        ? { source: row.source.trim() }
        : {}),
    };
  });
}

function validateFAQItems(
  v: GEOAuditFAQItem[] | undefined,
): GEOAuditFAQItem[] {
  if (!v) return [];
  if (v.length > FAQ_MAX) {
    throw new GeoOptimizerServiceError(`faqSuggestions must have <= ${FAQ_MAX} items`);
  }
  return v.map((it) => {
    if (typeof it !== 'object' || it === null) {
      throw new GeoOptimizerServiceError('faqSuggestions[] must be object');
    }
    return {
      question: validateString(
        it.question,
        'faqSuggestions[].question',
        1,
        SUGGESTION_TEXT_MAX,
      ),
      answer: validateString(
        it.answer,
        'faqSuggestions[].answer',
        1,
        FAQ_ANSWER_MAX,
      ),
      ...(typeof it.relatedBankItemId === 'string' &&
      it.relatedBankItemId.trim()
        ? { relatedBankItemId: it.relatedBankItemId.trim() }
        : {}),
    };
  });
}

function validateOutline(
  v: GEOAuditOutlineSection[] | undefined,
): GEOAuditOutlineSection[] {
  if (!v) return [];
  if (v.length > OUTLINE_MAX) {
    throw new GeoOptimizerServiceError(
      `optimizedOutline must have <= ${OUTLINE_MAX} sections`,
    );
  }
  return v.map((sec) => {
    if (typeof sec !== 'object' || sec === null) {
      throw new GeoOptimizerServiceError('optimizedOutline[] must be object');
    }
    return {
      heading: validateString(
        sec.heading,
        'optimizedOutline[].heading',
        1,
        OUTLINE_HEADING_MAX,
      ),
      purpose: validateString(
        sec.purpose,
        'optimizedOutline[].purpose',
        1,
        OUTLINE_PURPOSE_MAX,
      ),
      targetQueries: validateStringArray(
        sec.targetQueries,
        'optimizedOutline[].targetQueries',
        10,
      ),
      notes: validateString(
        sec.notes,
        'optimizedOutline[].notes',
        1,
        OUTLINE_NOTE_MAX,
      ),
    };
  });
}

function validateSuggestions(
  s: GEOAuditSuggestions,
): GEOAuditSuggestions {
  return {
    targetQueries: validateStringArray(
      s.targetQueries,
      'targetQueries',
      TARGET_QUERIES_MAX,
    ),
    coreEntities: validateStringArray(
      s.coreEntities,
      'coreEntities',
      CORE_ENTITIES_MAX,
    ),
    definableTerms: validateStringArray(
      s.definableTerms,
      'definableTerms',
      DEFINABLE_TERMS_MAX,
    ),
    evidenceChecklist: validateStringArray(
      s.evidenceChecklist,
      'evidenceChecklist',
      EVIDENCE_CHECKLIST_MAX,
    ),
    comparisonTable: validateComparisonTable(s.comparisonTable),
    faqSuggestions: validateFAQItems(s.faqSuggestions),
    structuredSuggestions: validateStringArray(
      s.structuredSuggestions,
      'structuredSuggestions',
      STRUCTURED_SUGGESTIONS_MAX,
    ),
    optimizedOutline: validateOutline(s.optimizedOutline),
  };
}

/* ----------------- Read ----------------- */

export async function listGEOAudits(): Promise<GEOAudit[]> {
  return _repoListSorted();
}

export async function getGEOAudit(
  id: string,
): Promise<GEOAudit | undefined> {
  return _repoGet(id);
}

export async function listGEOAuditsByAsset(
  assetId: string,
): Promise<GEOAudit[]> {
  return _repoListByAsset(assetId);
}

export async function getLatestAuditForAsset(
  assetId: string,
): Promise<GEOAudit | undefined> {
  const list = await _repoListByAsset(assetId);
  return list[0];
}

/* ----------------- Aggregates ----------------- */

export interface GEOAuditStats {
  totalAudits: number;
  averageGeoScore: number;
  byInputType: Record<OptimizerInputType, number>;
}

export async function computeGEOAuditStats(): Promise<GEOAuditStats> {
  const all = await _repoList();
  const byInputType = {} as Record<OptimizerInputType, number>;
  for (const t of OPTIMIZER_INPUT_TYPES) byInputType[t] = 0;
  let sum = 0;
  for (const a of all) {
    byInputType[a.inputType] = (byInputType[a.inputType] ?? 0) + 1;
    sum += a.score.geoScore;
  }
  return {
    totalAudits: all.length,
    averageGeoScore:
      all.length === 0 ? 0 : Math.round((sum / all.length) * 10) / 10,
    byInputType,
  };
}

/* ----------------- Write ----------------- */

export interface RunGEOAuditInput {
  assetId: string;
  inputType: OptimizerInputType;
  createdAt: string;
  updatedAt: string;
}

export async function runGEOAudit(
  input: RunGEOAuditInput,
): Promise<GEOAudit> {
  // 1. 校验 asset 存在
  const asset = await getContentAsset(input.assetId);
  if (!asset) {
    throw new GeoOptimizerServiceError(
      `Content asset not found: ${input.assetId}`,
    );
  }
  const inputType = validateInputType(input.inputType);

  // 2. 拉关联 brand
  const brand = await getBrandEntityProfile(asset.brandEntityId);
  if (!brand) {
    throw new GeoOptimizerServiceError(
      `Brand profile not found for asset: ${asset.brandEntityId}`,
    );
  }

  // 3. 拉关联 target queries
  const allBank = await listAIQueryBankItemsByBrand(brand.id);
  const targetQueries = allBank.filter((q) =>
    asset.targetQueryIds.includes(q.id),
  );

  // 4. 拉 graph entities（不区分是否与 asset 直接相关，brand 维度过滤）
  const allEntities = await listEntities();
  const graphEntities = allEntities.filter((e) =>
    brand.relatedEntityIds.includes(e.id),
  );

  // 5. 调 GEOProvider
  const provider = await getGEOProvider();
  const draft = await provider.analyzeContentAsset({
    asset,
    brand,
    targetQueries,
    graphEntities,
    inputType,
  });

  // 6. 校验 + 重算 geoScore
  const score = validateScore(draft.score);
  const suggestions = validateSuggestions(draft.suggestions);
  const explanation = validateString(
    draft.explanation,
    'explanation',
    EXPLANATION_MIN,
    EXPLANATION_MAX,
  );
  const scoringModelVersion = (
    draft.scoringModelVersion || 'mock-v1'
  ).trim();

  // 7. id + 持久化
  const id = `audit_${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const created: GEOAudit = {
    id,
    assetId: asset.id,
    inputType,
    score,
    suggestions,
    explanation,
    scoringModelVersion,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
  return _repoInsert(created);
}

/* ----------------- Report context ----------------- */

export interface GEOAuditReportContext {
  audit: GEOAudit;
  asset: {
    id: string;
    title: string;
    url: string;
    type: ContentAssetType;
  };
  brand: { id: string; name: string; category: string } | undefined;
  targetQueries: Array<{ id: string; query: string; intent: string }>;
}

export async function buildAuditReportContext(
  auditId: string,
): Promise<GEOAuditReportContext | undefined> {
  const audit = await getGEOAudit(auditId);
  if (!audit) return undefined;
  const asset = await getContentAsset(audit.assetId);
  if (!asset) return undefined;
  const brand = await getBrandEntityProfile(asset.brandEntityId);
  const allBank = brand
    ? await listAIQueryBankItemsByBrand(brand.id)
    : [];
  const targetQueries = allBank
    .filter((q) => asset.targetQueryIds.includes(q.id))
    .map((q) => ({ id: q.id, query: q.query, intent: q.intent }));
  return {
    audit,
    asset: {
      id: asset.id,
      title: asset.title,
      url: asset.url,
      type: asset.type,
    },
    brand: brand
      ? { id: brand.id, name: brand.name, category: brand.category }
      : undefined,
    targetQueries,
  };
}

/* ============================================================
 * GEOAuditScoringModel — 评分模型版本（预留）。
 *
 * 未来切换评分模型时：
 *   1. 在 lib/providers/<model>/optimizer.ts 实现 GEOAuditScoringModel。
 *   2. service 在 runGEOAudit 里读 _scoringModel 实例，决定调哪个模型。
 *   3. 评分模型改动通过 ImprovementLog（targetType='score_model'）记录。
 *
 * 当前不实现，仅作为扩展点占位。
 * ============================================================ */

export interface GEOAuditScoringModel {
  /** 模型版本号（如 "mock-v1" / "claude-sonnet-2026-q3"）。 */
  readonly version: string;
  /** health check：模型是否可用。 */
  health(): Promise<{ ok: boolean; detail?: string }>;
  /** 计算 7 维分（service 仍会用 GEO_AUDIT_WEIGHTS 重算 geoScore）。 */
  scoreDimensions(input: {
    asset: import('@/types').ContentAsset;
    brand: import('@/types').BrandEntityProfile;
    targetQueries: import('@/types').AIQueryBankItem[];
  }): Promise<Omit<import('@/types').GEOAuditScore, 'geoScore'>>;
}

let _scoringModel: GEOAuditScoringModel | undefined;

export function registerGEOAuditScoringModel(
  m: GEOAuditScoringModel,
): void {
  _scoringModel = m;
}

export function getGEOAuditScoringModel(): GEOAuditScoringModel | undefined {
  return _scoringModel;
}
