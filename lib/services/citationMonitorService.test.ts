/**
 * citationMonitorService 单元测试。
 *
 * 覆盖：
 *  - runCitationCheck 拒绝：未知 queryId / 无效 platform / 无效 geoScore /
 *    无效 citedUrl / 无效 competitorMentions / 无效 answerSummary
 *  - runCitationCheck 接受 5 个 platform 全部
 *  - runCitationCheck 用 override 时不调 connector
 *  - runCitationCheck 用 connector 时返回 mock 数据
 *  - list / get / filter 操作
 *  - computeCitationStats（mentionRate / citationRate / 平均分 / byPlatform）
 *  - computeTrend（按日聚合）
 *  - buildCitationReportContext（含 / 不含 brand / 未知 id）
 *  - generateWeeklyReport（按 brand 过滤 / 不带 brand 过滤 / 时间范围 / 排序）
 *  - 错误类
 */

import { describe, it, expect } from 'vitest';
import {
  runCitationCheck,
  recordCitationCheck,
  listAICitationChecks,
  getAICitationCheck,
  listAICitationChecksByQuery,
  listAICitationChecksByPlatform,
  computeCitationStats,
  computeTrend,
  computeGeoMetrics,
  buildCitationReportContext,
  generateWeeklyReport,
  CitationMonitorServiceError,
} from './citationMonitorService';
import { CITATION_PLATFORMS, CITATION_PLATFORM_LABEL } from '@/types';
import type { CitationPlatform } from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

async function pickBankQueryId(): Promise<string> {
  const { listAIQueryBankItems } = await import('./aiQueryService');
  const list = await listAIQueryBankItems();
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

describe('runCitationCheck', () => {
  it('rejects unknown queryId', async () => {
    await expect(
      runCitationCheck({
        queryId: 'bank_does_not_exist',
        platform: 'chatgpt',
        checkedAt: MOCK_NOW,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
        override: {
          mentioned: true,
          answerSummary: 'test',
          competitorMentions: [],
          geoScore: 50,
        },
      }),
    ).rejects.toThrow(/AIQueryBankItem not found/);
  });

  it('rejects unknown platform', async () => {
    const queryId = await pickBankQueryId();
    await expect(
      runCitationCheck({
        queryId,
        // @ts-expect-error -- testing invalid enum at runtime
        platform: 'not_a_platform',
        checkedAt: MOCK_NOW,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
        override: {
          mentioned: true,
          answerSummary: 'test',
          competitorMentions: [],
          geoScore: 50,
        },
      }),
    ).rejects.toThrow(/platform/);
  });

  it('rejects invalid citedUrl', async () => {
    const queryId = await pickBankQueryId();
    await expect(
      runCitationCheck({
        queryId,
        platform: 'chatgpt',
        checkedAt: MOCK_NOW,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
        override: {
          mentioned: true,
          citedUrl: 'not-a-url',
          answerSummary: 'test',
          competitorMentions: [],
          geoScore: 50,
        },
      }),
    ).rejects.toThrow(/http/);
  });

  it('rejects out-of-range geoScore', async () => {
    const queryId = await pickBankQueryId();
    await expect(
      runCitationCheck({
        queryId,
        platform: 'chatgpt',
        checkedAt: MOCK_NOW,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
        override: {
          mentioned: true,
          answerSummary: 'test',
          competitorMentions: [],
          geoScore: 150,
        },
      }),
    ).rejects.toThrow(/geoScore/);
  });

  it('rejects non-integer geoScore', async () => {
    const queryId = await pickBankQueryId();
    await expect(
      runCitationCheck({
        queryId,
        platform: 'chatgpt',
        checkedAt: MOCK_NOW,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
        override: {
          mentioned: true,
          answerSummary: 'test',
          competitorMentions: [],
          geoScore: 50.5,
        },
      }),
    ).rejects.toThrow(/geoScore/);
  });

  it('rejects too-long answerSummary', async () => {
    const queryId = await pickBankQueryId();
    await expect(
      runCitationCheck({
        queryId,
        platform: 'chatgpt',
        checkedAt: MOCK_NOW,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
        override: {
          mentioned: true,
          answerSummary: 'x'.repeat(2001),
          competitorMentions: [],
          geoScore: 50,
        },
      }),
    ).rejects.toThrow(/answerSummary/);
  });

  it('rejects competitorMentions > 20', async () => {
    const queryId = await pickBankQueryId();
    await expect(
      runCitationCheck({
        queryId,
        platform: 'chatgpt',
        checkedAt: MOCK_NOW,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
        override: {
          mentioned: true,
          answerSummary: 'test',
          competitorMentions: Array(21).fill('x'),
          geoScore: 50,
        },
      }),
    ).rejects.toThrow(/competitorMentions/);
  });

  it('accepts all 5 platforms', async () => {
    const queryId = await pickBankQueryId();
    for (const p of CITATION_PLATFORMS) {
      const c = await runCitationCheck({
        queryId,
        platform: p,
        checkedAt: MOCK_NOW,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
        override: {
          mentioned: true,
          answerSummary: 'test',
          competitorMentions: [],
          geoScore: 50,
        },
      });
      expect(c.platform).toBe(p);
    }
  });

  it('uses connector when no override is given', async () => {
    const queryId = await pickBankQueryId();
    const before = await listAICitationChecks();
    const c = await runCitationCheck({
      queryId,
      platform: 'chatgpt',
      checkedAt: MOCK_NOW,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    const after = await listAICitationChecks();
    expect(after.length).toBe(before.length + 1);
    expect(c.queryId).toBe(queryId);
    expect(c.platform).toBe('chatgpt');
    expect(typeof c.geoScore).toBe('number');
    expect(c.geoScore).toBeGreaterThanOrEqual(0);
    expect(c.geoScore).toBeLessThanOrEqual(100);
    expect(typeof c.mentioned).toBe('boolean');
    expect(c.answerSummary.length).toBeGreaterThan(0);
  });

  it('uses override when provided', async () => {
    const queryId = await pickBankQueryId();
    const c = await runCitationCheck({
      queryId,
      platform: 'perplexity',
      checkedAt: '2026-06-25T13:00:00.000Z',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
      override: {
        mentioned: true,
        citedUrl: 'https://example.com/cvo/geo-playbook',
        answerSummary: 'Override answer summary.',
        competitorMentions: ['Profound', 'Otterly'],
        geoScore: 88,
      },
    });
    expect(c.mentioned).toBe(true);
    expect(c.citedUrl).toBe('https://example.com/cvo/geo-playbook');
    expect(c.answerSummary).toBe('Override answer summary.');
    expect(c.competitorMentions).toEqual(['Profound', 'Otterly']);
    expect(c.geoScore).toBe(88);
  });
});

describe('list / get', () => {
  it('listAICitationChecks returns all checks sorted by checkedAt desc', async () => {
    const list = await listAICitationChecks();
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i - 1]!.checkedAt >= list[i]!.checkedAt).toBe(true);
    }
  });

  it('listAICitationChecksByQuery filters by query', async () => {
    const list = await listAICitationChecksByQuery('bank_geo_def_cvo');
    for (const c of list) {
      expect(c.queryId).toBe('bank_geo_def_cvo');
    }
    expect(list.length).toBeGreaterThan(0);
  });

  it('listAICitationChecksByPlatform filters by platform', async () => {
    const list = await listAICitationChecksByPlatform('chatgpt');
    for (const c of list) {
      expect(c.platform).toBe('chatgpt');
    }
    expect(list.length).toBeGreaterThan(0);
  });

  it('getAICitationCheck returns by id', async () => {
    const all = await listAICitationChecks();
    const a = await getAICitationCheck(all[0]!.id);
    expect(a?.id).toBe(all[0]!.id);
  });
});

describe('computeCitationStats', () => {
  it('produces sensible aggregates', async () => {
    const stats = await computeCitationStats([
      'https://example.com/cvo/geo-playbook',
    ]);
    expect(stats.totalChecks).toBeGreaterThan(0);
    expect(stats.mentionRate).toBeGreaterThanOrEqual(0);
    expect(stats.mentionRate).toBeLessThanOrEqual(1);
    expect(stats.citationRate).toBeGreaterThanOrEqual(0);
    expect(stats.citationRate).toBeLessThanOrEqual(1);
    expect(stats.averageGeoScore).toBeGreaterThanOrEqual(0);
    expect(stats.averageGeoScore).toBeLessThanOrEqual(100);
    // 5 个 platform 都应该有计数（或为 0）
    for (const p of CITATION_PLATFORMS) {
      expect(typeof stats.byPlatform[p]).toBe('number');
    }
  });
});

describe('computeTrend', () => {
  it('groups checks by date', async () => {
    const trend = await computeTrend({
      targetBrandUrls: ['https://example.com/cvo/geo-playbook'],
    });
    expect(trend.length).toBeGreaterThan(0);
    for (let i = 1; i < trend.length; i += 1) {
      expect(trend[i]!.date >= trend[i - 1]!.date).toBe(true);
    }
    for (const p of trend) {
      expect(p.mentionRate).toBeGreaterThanOrEqual(0);
      expect(p.mentionRate).toBeLessThanOrEqual(1);
      expect(p.count).toBeGreaterThan(0);
    }
  });

  it('filters by queryId', async () => {
    const trend = await computeTrend({
      queryId: 'bank_geo_def_cvo',
      targetBrandUrls: [],
    });
    for (const p of trend) {
      expect(p.count).toBeGreaterThan(0);
    }
  });
});

describe('buildCitationReportContext', () => {
  it('returns context for a known check', async () => {
    const all = await listAICitationChecks();
    const c = all[0]!;
    const ctx = await buildCitationReportContext(c.id);
    expect(ctx).toBeDefined();
    expect(ctx?.check.id).toBe(c.id);
    expect(ctx?.query).toBeDefined();
  });

  it('returns undefined for unknown check', async () => {
    const ctx = await buildCitationReportContext('cite_does_not_exist');
    expect(ctx).toBeUndefined();
  });
});

describe('generateWeeklyReport', () => {
  it('rejects startDate > endDate', async () => {
    await expect(
      generateWeeklyReport({
        startDate: '2026-06-25',
        endDate: '2026-06-12',
      }),
    ).rejects.toThrow(/startDate/);
  });

  it('rejects missing startDate', async () => {
    await expect(
      generateWeeklyReport({
        startDate: '',
        endDate: '2026-06-25',
      }),
    ).rejects.toThrow(/startDate/);
  });

  it('produces a full weekly report for CVO 6 月最后一周', async () => {
    const report = await generateWeeklyReport({
      startDate: '2026-06-12',
      endDate: '2026-06-25',
      brandEntityId: 'profile_cvo',
    });
    expect(report.startDate).toBe('2026-06-12');
    expect(report.endDate).toBe('2026-06-25');
    expect(report.totalChecks).toBeGreaterThan(0);
    expect(report.averageGeoScore).toBeGreaterThan(0);
    expect(report.byQuery.length).toBeGreaterThan(0);
    expect(report.trend.length).toBeGreaterThan(0);
    // byPlatform 5 项都有 key
    for (const p of CITATION_PLATFORMS) {
      expect(report.byPlatform[p]).toBeDefined();
    }
  });

  it('works without brandEntityId filter (all checks)', async () => {
    const report = await generateWeeklyReport({
      startDate: '2026-06-12',
      endDate: '2026-06-25',
    });
    expect(report.totalChecks).toBeGreaterThan(0);
  });

  it('top competitors is sorted by count desc', async () => {
    const report = await generateWeeklyReport({
      startDate: '2026-06-12',
      endDate: '2026-06-25',
    });
    for (let i = 1; i < report.topCompetitors.length; i += 1) {
      expect(
        report.topCompetitors[i - 1]!.count >= report.topCompetitors[i]!.count,
      ).toBe(true);
    }
  });
});

describe('error class', () => {
  it('CitationMonitorServiceError preserves name', () => {
    const e = new CitationMonitorServiceError('boom');
    expect(e.name).toBe('CitationMonitorServiceError');
    expect(e.message).toBe('boom');
  });
});

describe('exports', () => {
  it('CITATION_PLATFORM_LABEL has all 5 platforms', () => {
    for (const p of CITATION_PLATFORMS) {
      expect(CITATION_PLATFORM_LABEL[p as CitationPlatform]).toBeTruthy();
    }
  });
});


describe('recordCitationCheck (manual entry)', () => {
  it('persists a complete check from human input', async () => {
    const queryId = await pickBankQueryId();
    const c = await recordCitationCheck({
      queryId,
      platform: 'perplexity',
      checkedAt: '2026-06-25T15:00:00.000Z',
      mentioned: true,
      citedUrl: 'https://example.com/cvo/manual',
      competitorMentions: ['Profound', 'Otterly'],
      answerSummary: 'Manual entry: CVO appears in the GEO benchmark answer.',
      geoScore: 82,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(c.id.startsWith('cite_')).toBe(true);
    expect(c.queryId).toBe(queryId);
    expect(c.platform).toBe('perplexity');
    expect(c.mentioned).toBe(true);
    expect(c.citedUrl).toBe('https://example.com/cvo/manual');
    expect(c.competitorMentions).toEqual(['Profound', 'Otterly']);
    expect(c.geoScore).toBe(82);
  });

  it('rejects unknown queryId without touching repo', async () => {
    const before = await listAICitationChecks();
    await expect(
      recordCitationCheck({
        queryId: 'bank_does_not_exist',
        platform: 'chatgpt',
        checkedAt: MOCK_NOW,
        mentioned: true,
        competitorMentions: [],
        answerSummary: 'x',
        geoScore: 50,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/AIQueryBankItem not found/);
    const after = await listAICitationChecks();
    expect(after.length).toBe(before.length);
  });

  it('rejects invalid platform (re-uses validatePlatform)', async () => {
    const queryId = await pickBankQueryId();
    await expect(
      recordCitationCheck({
        queryId,
        // @ts-expect-error -- testing invalid enum at runtime
        platform: 'not_a_platform',
        checkedAt: MOCK_NOW,
        mentioned: true,
        competitorMentions: [],
        answerSummary: 'x',
        geoScore: 50,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/platform/);
  });

  it('rejects invalid citedUrl', async () => {
    const queryId = await pickBankQueryId();
    await expect(
      recordCitationCheck({
        queryId,
        platform: 'chatgpt',
        checkedAt: MOCK_NOW,
        mentioned: true,
        citedUrl: 'ftp://nope',
        competitorMentions: [],
        answerSummary: 'x',
        geoScore: 50,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/http/);
  });

  it('accepts missing citedUrl (undefined)', async () => {
    const queryId = await pickBankQueryId();
    const c = await recordCitationCheck({
      queryId,
      platform: 'gemini',
      checkedAt: MOCK_NOW,
      mentioned: false,
      competitorMentions: ['Scrunch'],
      answerSummary: 'Brand absent from Gemini answer.',
      geoScore: 12,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(c.citedUrl).toBeUndefined();
    expect(c.mentioned).toBe(false);
  });
});

describe('computeGeoMetrics (7 GEO metrics)', () => {
  async function pickBrandAndChecks(): Promise<{
    brandId: string;
    checks: import('@/types').AICitationCheck[];
    bankItems: import('@/types').AIQueryBankItem[];
    contentAssets: import('@/types').ContentAsset[];
  }> {
    const { listBrandEntityProfiles } = await import('./geoBrandService');
    const { listContentAssets } = await import('./contentAssetService');
    const { listAIQueryBankItems } = await import('./aiQueryService');
    const brands = await listBrandEntityProfiles();
    const bankItems = await listAIQueryBankItems();
    const contentAssets = await listContentAssets();
    const brand = brands[0]!;
    const brandQueries = bankItems.filter((q) => q.brandEntityId === brand.id);
    const { listAICitationChecks } = await import('./citationMonitorService');
    const all = await listAICitationChecks();
    const qidSet = new Set(brandQueries.map((q) => q.id));
    const checks = all.filter((c) => qidSet.has(c.queryId));
    return { brandId: brand.id, checks, bankItems, contentAssets };
  }

  it('returns all 7 metrics in [0,1] / day range', async () => {
    const { brandId, checks, bankItems, contentAssets } =
      await pickBrandAndChecks();
    const { getBrandEntityProfile } = await import('./geoBrandService');
    const brand = await getBrandEntityProfile(brandId);
    expect(brand).toBeDefined();
    const m = await computeGeoMetrics({
      checks,
      bankItems,
      brand: brand!,
      contentAssets,
      referenceDate: '2026-06-25',
    });
    expect(m.brandMentionRate).toBeGreaterThanOrEqual(0);
    expect(m.brandMentionRate).toBeLessThanOrEqual(1);
    expect(m.citationRate).toBeGreaterThanOrEqual(0);
    expect(m.citationRate).toBeLessThanOrEqual(1);
    expect(m.competitorMentionRate).toBeGreaterThanOrEqual(0);
    expect(m.competitorMentionRate).toBeLessThanOrEqual(1);
    expect(m.answerInclusionRate).toBeGreaterThanOrEqual(0);
    expect(m.answerInclusionRate).toBeLessThanOrEqual(1);
    expect(m.queryCoverage).toBeGreaterThanOrEqual(0);
    expect(m.queryCoverage).toBeLessThanOrEqual(1);
    expect(m.contentFreshnessDays).toBeGreaterThanOrEqual(0);
    expect(m.entityConsistency).toBeGreaterThanOrEqual(0);
    expect(m.entityConsistency).toBeLessThanOrEqual(1);
  });

  it('brandMentionRate equals mentionRate (alias)', async () => {
    const { brandId, checks, bankItems, contentAssets } =
      await pickBrandAndChecks();
    const { getBrandEntityProfile } = await import('./geoBrandService');
    const brand = await getBrandEntityProfile(brandId);
    const m = await computeGeoMetrics({
      checks,
      bankItems,
      brand: brand!,
      contentAssets,
      referenceDate: '2026-06-25',
    });
    expect(m.brandMentionRate).toBe(m.mentionRate);
  });

  it('returns zero rates when no checks are provided', async () => {
    const { brandId, bankItems, contentAssets } = await pickBrandAndChecks();
    const { getBrandEntityProfile } = await import('./geoBrandService');
    const brand = await getBrandEntityProfile(brandId);
    const m = await computeGeoMetrics({
      checks: [],
      bankItems,
      brand: brand!,
      contentAssets,
      referenceDate: '2026-06-25',
    });
    expect(m.totalChecks).toBe(0);
    expect(m.brandMentionRate).toBe(0);
    expect(m.citationRate).toBe(0);
    expect(m.competitorMentionRate).toBe(0);
    expect(m.answerInclusionRate).toBe(0);
    expect(m.queryCoverage).toBe(0);
  });
});

