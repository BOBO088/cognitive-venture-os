/**
 * contentAssetService 单元测试。
 *
 * 覆盖：
 *  - createContentAsset 拒绝：brandEntityId 不存在 / title 缺失或越界
 *  - createContentAsset url 非法 / type 不在 enum
 *  - createContentAsset summary 缺失或越界
 *  - createContentAsset targetQueryIds 引用校验
 *  - createContentAsset structuredEvidence 校验（claim 缺失 / 越界 / > 20）
 *  - createContentAsset lastUpdated 非法 / geoScore 越界
 *  - createContentAsset id 重复
 *  - updateContentAsset 部分 patch 保留 id / createdAt
 *  - updateContentAsset 改 brandEntityId 时重新校验
 *  - updateContentAsset 改 targetQueryIds 时重新校验
 *  - updateContentAsset 未知 id
 *  - deleteContentAsset 成功 / 未知 id
 *  - listContentAssets / listContentAssetsByBrand / listContentAssetsFiltered
 *  - computeContentAssetStats
 *  - buildContentAssetReportContext（含 / 不含 brand / 不含 target queries）
 */

import { describe, it, expect } from 'vitest';
import {
  createContentAsset,
  getContentAsset,
  listContentAssets,
  listContentAssetsByBrand,
  listContentAssetsFiltered,
  computeContentAssetStats,
  updateContentAsset,
  deleteContentAsset,
  buildContentAssetReportContext,
  ContentAssetServiceError,
} from './contentAssetService';
import { listBrandEntityProfiles } from './geoBrandService';
import { listAIQueryBankItems } from './aiQueryService';
import type {
  ContentAssetType,
  ContentAssetStructuredEvidence,
} from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';
const MOCK_LAST_UPDATED = '2026-06-20T10:00:00.000Z';

function genId(): string {
  return `content_test_${Math.random().toString(36).slice(2, 10)}`;
}

async function pickBrandId(): Promise<string> {
  const list = await listBrandEntityProfiles();
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

async function pickQueryId(): Promise<string> {
  const list = await listAIQueryBankItems();
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

function baseInput(overrides: Partial<Parameters<typeof createContentAsset>[0]> = {}) {
  return {
    id: genId(),
    brandEntityId: '',
    title: 'Test Asset',
    url: 'https://example.com/test',
    type: 'blog_post' as ContentAssetType,
    summary: 'A test content asset.',
    targetQueryIds: [],
    structuredEvidence: [],
    lastUpdated: MOCK_LAST_UPDATED,
    geoScore: 50,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
    ...overrides,
  };
}

describe('createContentAsset', () => {
  it('rejects when brandEntityId does not exist', async () => {
    await pickBrandId();
    await expect(
      createContentAsset(
        baseInput({
          brandEntityId: 'profile_does_not_exist',
          targetQueryIds: [],
        }),
      ),
    ).rejects.toThrow(ContentAssetServiceError);
  });

  it('rejects when title is empty', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(baseInput({ brandEntityId: brandId, title: '   ' })),
    ).rejects.toThrow(/title/);
  });

  it('rejects when title is too long', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(
        baseInput({ brandEntityId: brandId, title: 'x'.repeat(201) }),
      ),
    ).rejects.toThrow(/title/);
  });

  it('rejects when url is invalid', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(baseInput({ brandEntityId: brandId, url: 'not-a-url' })),
    ).rejects.toThrow(/url/);
  });

  it('rejects when type is not in enum', async () => {
    const brandId = await pickBrandId();
    await expect(
      // @ts-expect-error -- testing invalid enum at runtime
      createContentAsset(baseInput({ brandEntityId: brandId, type: 'whitepaper' })),
    ).rejects.toThrow(/type/);
  });

  it('rejects when summary is empty', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(baseInput({ brandEntityId: brandId, summary: '' })),
    ).rejects.toThrow(/summary/);
  });

  it('rejects when summary is too long', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(
        baseInput({ brandEntityId: brandId, summary: 'x'.repeat(1001) }),
      ),
    ).rejects.toThrow(/summary/);
  });

  it('rejects when targetQueryIds contains unknown id', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(
        baseInput({
          brandEntityId: brandId,
          targetQueryIds: ['bank_does_not_exist'],
        }),
      ),
    ).rejects.toThrow(/AI query bank item not found/);
  });

  it('accepts a targetQueryIds list with known ids', async () => {
    const brandId = await pickBrandId();
    const qid = await pickQueryId();
    const created = await createContentAsset(
      baseInput({
        brandEntityId: brandId,
        targetQueryIds: [qid],
      }),
    );
    expect(created.targetQueryIds).toEqual([qid]);
    await deleteContentAsset(created.id);
  });

  it('rejects structuredEvidence with empty claim', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(
        baseInput({
          brandEntityId: brandId,
          structuredEvidence: [{ claim: '   ' }],
        }),
      ),
    ).rejects.toThrow(/claim/);
  });

  it('rejects structuredEvidence with claim too long', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(
        baseInput({
          brandEntityId: brandId,
          structuredEvidence: [{ claim: 'x'.repeat(401) }],
        }),
      ),
    ).rejects.toThrow(/claim/);
  });

  it('rejects structuredEvidence with > 20 items', async () => {
    const brandId = await pickBrandId();
    const items: ContentAssetStructuredEvidence[] = Array.from(
      { length: 21 },
      (_, i) => ({ claim: `claim ${i}` }),
    );
    await expect(
      createContentAsset(
        baseInput({ brandEntityId: brandId, structuredEvidence: items }),
      ),
    ).rejects.toThrow(/structuredEvidence must be/);
  });

  it('accepts structuredEvidence with optional source/quote', async () => {
    const brandId = await pickBrandId();
    const created = await createContentAsset(
      baseInput({
        brandEntityId: brandId,
        structuredEvidence: [
          { claim: 'main claim', source: 'https://example.com', quote: 'verbatim' },
        ],
      }),
    );
    expect(created.structuredEvidence[0]?.source).toBe('https://example.com');
    expect(created.structuredEvidence[0]?.quote).toBe('verbatim');
    await deleteContentAsset(created.id);
  });

  it('rejects invalid lastUpdated', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(
        baseInput({ brandEntityId: brandId, lastUpdated: '2026/06/20' }),
      ),
    ).rejects.toThrow(/lastUpdated/);
  });

  it('rejects geoScore out of range', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(baseInput({ brandEntityId: brandId, geoScore: 150 })),
    ).rejects.toThrow(/geoScore/);
    await expect(
      createContentAsset(baseInput({ brandEntityId: brandId, geoScore: -1 })),
    ).rejects.toThrow(/geoScore/);
  });

  it('rejects non-integer geoScore', async () => {
    const brandId = await pickBrandId();
    await expect(
      createContentAsset(baseInput({ brandEntityId: brandId, geoScore: 50.5 })),
    ).rejects.toThrow(/integer/);
  });

  it('rejects duplicate id', async () => {
    const brandId = await pickBrandId();
    const created = await createContentAsset(baseInput({ brandEntityId: brandId }));
    await expect(
      createContentAsset(
        baseInput({ brandEntityId: brandId, id: created.id }),
      ),
    ).rejects.toThrow(/already exists/);
    await deleteContentAsset(created.id);
  });
});

describe('list / get', () => {
  it('listContentAssets returns all assets sorted by updatedAt desc', async () => {
    const list = await listContentAssets();
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i - 1]!.updatedAt >= list[i]!.updatedAt).toBe(true);
    }
  });

  it('getContentAsset returns by id', async () => {
    const list = await listContentAssets();
    const a = await getContentAsset(list[0]!.id);
    expect(a?.id).toBe(list[0]!.id);
  });

  it('listContentAssetsByBrand filters by brand', async () => {
    const list = await listContentAssetsByBrand('profile_cvo');
    expect(list.length).toBeGreaterThan(0);
    for (const a of list) {
      expect(a.brandEntityId).toBe('profile_cvo');
    }
  });

  it('listContentAssetsFiltered filters by type and min score', async () => {
    const list = await listContentAssetsFiltered({
      type: 'research_report',
      minGeoScore: 80,
    });
    for (const a of list) {
      expect(a.type).toBe('research_report');
      expect(a.geoScore).toBeGreaterThanOrEqual(80);
    }
  });
});

describe('computeContentAssetStats', () => {
  it('produces sensible buckets', async () => {
    const stats = await computeContentAssetStats();
    expect(stats.totalAssets).toBeGreaterThan(0);
    expect(
      stats.byScoreBucket.low +
        stats.byScoreBucket.mid +
        stats.byScoreBucket.high,
    ).toBe(stats.totalAssets);
    expect(stats.averageGeoScore).toBeGreaterThanOrEqual(0);
    expect(stats.averageGeoScore).toBeLessThanOrEqual(100);
  });

  it('handles empty input', async () => {
    const stats = await computeContentAssetStats([]);
    expect(stats.totalAssets).toBe(0);
    expect(stats.averageGeoScore).toBe(0);
  });
});

describe('updateContentAsset', () => {
  it('applies a partial patch and preserves id / createdAt', async () => {
    const brandId = await pickBrandId();
    const created = await createContentAsset(baseInput({ brandEntityId: brandId }));
    const updated = await updateContentAsset(created.id, {
      title: 'New title',
      geoScore: 90,
      updatedAt: MOCK_NOW,
    });
    expect(updated.title).toBe('New title');
    expect(updated.geoScore).toBe(90);
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.brandEntityId).toBe(created.brandEntityId);
    await deleteContentAsset(created.id);
  });

  it('re-validates brandEntityId when changed', async () => {
    const brandId = await pickBrandId();
    const created = await createContentAsset(baseInput({ brandEntityId: brandId }));
    await expect(
      updateContentAsset(created.id, {
        brandEntityId: 'profile_does_not_exist',
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/Brand profile not found/);
    await deleteContentAsset(created.id);
  });

  it('re-validates targetQueryIds when changed', async () => {
    const brandId = await pickBrandId();
    const created = await createContentAsset(baseInput({ brandEntityId: brandId }));
    await expect(
      updateContentAsset(created.id, {
        targetQueryIds: ['bank_does_not_exist'],
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/AI query bank item not found/);
    await deleteContentAsset(created.id);
  });

  it('rejects unknown id', async () => {
    await expect(
      updateContentAsset('content_does_not_exist', { title: 'x', updatedAt: MOCK_NOW }),
    ).rejects.toThrow(/not found/);
  });
});

describe('deleteContentAsset', () => {
  it('deletes an existing asset', async () => {
    const brandId = await pickBrandId();
    const created = await createContentAsset(baseInput({ brandEntityId: brandId }));
    await deleteContentAsset(created.id);
    const got = await getContentAsset(created.id);
    expect(got).toBeUndefined();
  });

  it('rejects unknown id', async () => {
    await expect(deleteContentAsset('content_does_not_exist')).rejects.toThrow(
      /not found/,
    );
  });
});

describe('buildContentAssetReportContext', () => {
  it('returns context for an existing asset', async () => {
    const list = await listContentAssets();
    const a = list[0]!;
    const ctx = await buildContentAssetReportContext(a.id);
    expect(ctx).toBeDefined();
    expect(ctx?.asset.id).toBe(a.id);
    expect(ctx?.brand).toBeDefined();
    expect(Array.isArray(ctx?.targetQueries)).toBe(true);
  });

  it('returns undefined for unknown id', async () => {
    const ctx = await buildContentAssetReportContext('content_does_not_exist');
    expect(ctx).toBeUndefined();
  });

  it('resolves target queries when present', async () => {
    const list = await listContentAssets();
    const a = list.find((x) => x.targetQueryIds.length > 0);
    if (!a) return; // skip if mock has no such asset
    const ctx = await buildContentAssetReportContext(a.id);
    expect(ctx?.targetQueries.length).toBe(a.targetQueryIds.length);
  });
});
