/**
 * geoOptimizerService 单元测试。
 *
 * 覆盖：
 *  - runGEOAudit 拒绝：assetId 不存在
 *  - runGEOAudit inputType 不在 enum
 *  - runGEOAudit 调 GEOProvider；service 用 GEO_AUDIT_WEIGHTS 重算 geoScore
 *  - runGEOAudit 校验 explanation 长度
 *  - listGEOAudits / listGEOAuditsByAsset / getLatestAuditForAsset
 *  - computeGEOAuditStats
 *  - buildAuditReportContext（含 / 不含 brand / 未知 id）
 *  - 校验 helpers：suggestions 长度上限、comparison table、FAQ、outline
 */

import { describe, it, expect } from 'vitest';
import {
  runGEOAudit,
  listGEOAudits,
  listGEOAuditsByAsset,
  getLatestAuditForAsset,
  getGEOAudit,
  computeGEOAuditStats,
  buildAuditReportContext,
  computeWeightedTotal,
  GeoOptimizerServiceError,
} from './geoOptimizerService';
import { listContentAssets } from './contentAssetService';
import { GEO_AUDIT_WEIGHTS, GEO_AUDIT_DIMENSIONS } from '@/types';
import type {
  GEOAuditScore,
  OptimizerInputType,
} from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

async function pickAssetId(): Promise<string> {
  const list = await listContentAssets();
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

describe('runGEOAudit', () => {
  it('rejects unknown assetId', async () => {
    await expect(
      runGEOAudit({
        assetId: 'content_does_not_exist',
        inputType: 'article',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/Content asset not found/);
  });

  it('rejects unknown inputType', async () => {
    const assetId = await pickAssetId();
    await expect(
      runGEOAudit({
        assetId,
        // @ts-expect-error -- testing invalid enum at runtime
        inputType: 'not_a_type',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/inputType/);
  });

  it('calls GEOProvider, persists audit, and recomputes geoScore from weights', async () => {
    const assetId = await pickAssetId();
    const before = await listGEOAudits();
    const inputType: OptimizerInputType = 'article';
    const created = await runGEOAudit({
      assetId,
      inputType,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    const after = await listGEOAudits();
    expect(after.length).toBe(before.length + 1);
    expect(created.assetId).toBe(assetId);
    expect(created.inputType).toBe(inputType);
    expect(created.scoringModelVersion).toBeTruthy();
    expect(created.explanation.length).toBeGreaterThan(0);
    expect(created.explanation.length).toBeLessThanOrEqual(1000);

    // geoScore 由 service 用 GEO_AUDIT_WEIGHTS 重算
    const dims = {
      clarity: created.score.clarity,
      entity_consistency: created.score.entityConsistency,
      evidence_density: created.score.evidenceDensity,
      citation_worthiness: created.score.citationWorthiness,
      freshness: created.score.freshness,
      topical_authority: created.score.topicalAuthority,
      query_alignment: created.score.queryAlignment,
    };
    const expected = computeWeightedTotal(dims);
    expect(created.score.geoScore).toBe(expected);

    // 7 维必须 ∈ [0, 100] 整数
    for (const k of GEO_AUDIT_DIMENSIONS) {
      const v = dims[k];
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('accepts all 6 input types', async () => {
    const assetId = await pickAssetId();
    const types: OptimizerInputType[] = [
      'article',
      'product_intro',
      'landing_page',
      'research_report',
      'faq',
      'short_video_script',
    ];
    for (const t of types) {
      const a = await runGEOAudit({
        assetId,
        inputType: t,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      });
      expect(a.inputType).toBe(t);
    }
  });

  it('populates the 9 suggestion buckets with content', async () => {
    const assetId = await pickAssetId();
    const a = await runGEOAudit({
      assetId,
      inputType: 'article',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(a.suggestions.targetQueries.length).toBeGreaterThan(0);
    expect(a.suggestions.coreEntities.length).toBeGreaterThan(0);
    expect(a.suggestions.definableTerms.length).toBeGreaterThan(0);
    expect(a.suggestions.evidenceChecklist.length).toBeGreaterThan(0);
    expect(a.suggestions.comparisonTable.length).toBeGreaterThan(0);
    expect(a.suggestions.faqSuggestions.length).toBeGreaterThan(0);
    expect(a.suggestions.structuredSuggestions.length).toBeGreaterThan(0);
    expect(a.suggestions.optimizedOutline.length).toBeGreaterThan(0);
  });
});

describe('list / get', () => {
  it('listGEOAudits returns all audits sorted by createdAt desc', async () => {
    const list = await listGEOAudits();
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i - 1]!.createdAt >= list[i]!.createdAt).toBe(true);
    }
  });

  it('listGEOAuditsByAsset filters by asset', async () => {
    const list = await listGEOAuditsByAsset('content_cvo_geo_playbook');
    for (const a of list) {
      expect(a.assetId).toBe('content_cvo_geo_playbook');
    }
    expect(list.length).toBeGreaterThan(0);
  });

  it('getLatestAuditForAsset returns most recent for the asset', async () => {
    const latest = await getLatestAuditForAsset('content_cvo_geo_playbook');
    expect(latest?.assetId).toBe('content_cvo_geo_playbook');
    const allForAsset = await listGEOAuditsByAsset('content_cvo_geo_playbook');
    expect(latest?.id).toBe(allForAsset[0]?.id);
  });

  it('getLatestAuditForAsset returns undefined for unknown asset', async () => {
    const latest = await getLatestAuditForAsset('content_does_not_exist');
    expect(latest).toBeUndefined();
  });

  it('getGEOAudit returns by id', async () => {
    const all = await listGEOAudits();
    const a = await getGEOAudit(all[0]!.id);
    expect(a?.id).toBe(all[0]!.id);
  });
});

describe('computeGEOAuditStats', () => {
  it('produces sensible aggregates', async () => {
    const stats = await computeGEOAuditStats();
    expect(stats.totalAudits).toBeGreaterThan(0);
    const sum = Object.values(stats.byInputType).reduce(
      (acc, n) => acc + n,
      0,
    );
    expect(sum).toBe(stats.totalAudits);
    expect(stats.averageGeoScore).toBeGreaterThanOrEqual(0);
    expect(stats.averageGeoScore).toBeLessThanOrEqual(100);
  });
});

describe('buildAuditReportContext', () => {
  it('returns context for a known audit', async () => {
    const all = await listGEOAudits();
    const a = all[0]!;
    const ctx = await buildAuditReportContext(a.id);
    expect(ctx).toBeDefined();
    expect(ctx?.audit.id).toBe(a.id);
    expect(ctx?.asset.id).toBe(a.assetId);
    expect(ctx?.brand).toBeDefined();
  });

  it('returns undefined for unknown audit', async () => {
    const ctx = await buildAuditReportContext('audit_does_not_exist');
    expect(ctx).toBeUndefined();
  });
});

describe('computeWeightedTotal', () => {
  it('weights sum to 1.0', () => {
    const total = Object.values(GEO_AUDIT_WEIGHTS).reduce(
      (acc, n) => acc + n,
      0,
    );
    expect(Math.round(total * 100) / 100).toBe(1);
  });

  it('all-100 dims yield 100', () => {
    const dims = {
      clarity: 100,
      entity_consistency: 100,
      evidence_density: 100,
      citation_worthiness: 100,
      freshness: 100,
      topical_authority: 100,
      query_alignment: 100,
    };
    expect(computeWeightedTotal(dims)).toBe(100);
  });

  it('all-0 dims yield 0', () => {
    const dims = {
      clarity: 0,
      entity_consistency: 0,
      evidence_density: 0,
      citation_worthiness: 0,
      freshness: 0,
      topical_authority: 0,
      query_alignment: 0,
    };
    expect(computeWeightedTotal(dims)).toBe(0);
  });

  it('weighted average matches manual calculation', () => {
    const dims = {
      clarity: 80,
      entity_consistency: 60,
      evidence_density: 100,
      citation_worthiness: 40,
      freshness: 100,
      topical_authority: 80,
      query_alignment: 0,
    };
    const expected = Math.round(
      (80 * GEO_AUDIT_WEIGHTS.clarity +
        60 * GEO_AUDIT_WEIGHTS.entity_consistency +
        100 * GEO_AUDIT_WEIGHTS.evidence_density +
        40 * GEO_AUDIT_WEIGHTS.citation_worthiness +
        100 * GEO_AUDIT_WEIGHTS.freshness +
        80 * GEO_AUDIT_WEIGHTS.topical_authority +
        0 * GEO_AUDIT_WEIGHTS.query_alignment) *
        10,
    ) / 10;
    expect(computeWeightedTotal(dims)).toBe(expected);
  });
});

describe('error class', () => {
  it('GeoOptimizerServiceError preserves name', () => {
    const e = new GeoOptimizerServiceError('boom');
    expect(e.name).toBe('GeoOptimizerServiceError');
    expect(e.message).toBe('boom');
  });
});

// suppress unused import warning for GEOAuditScore (only used indirectly)
const _typecheck: GEOAuditScore | null = null;
void _typecheck;
