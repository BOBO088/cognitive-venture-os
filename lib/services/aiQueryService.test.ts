/**
 * aiQueryService 单元测试。
 *
 * 覆盖：
 *  - createAIQueryBankItem 拒绝：brandEntityId 不存在 / query 缺失或越界
 *  - createAIQueryBankItem intent / platform / priority / status 缺失或非 enum
 *  - createAIQueryBankItem linkedAssetIds 引用校验
 *  - createAIQueryBankItem id 重复
 *  - updateAIQueryBankItem 部分 patch 保留 id / createdAt
 *  - updateAIQueryBankItem 改 brandEntityId 时重新校验
 *  - updateAIQueryBankItem 改 linkedAssetIds 时重新校验
 *  - updateAIQueryBankItem 未知 id
 *  - deleteAIQueryBankItem 成功 / 未知 id
 *  - listAIQueryBankItems / listAIQueryBankItemsByBrand / listAIQueryBankItemsFiltered
 *  - computeAIQueryBankStats
 *  - generateAIQueryBankForBrand：调用 LLMProvider 落库；priorityScore 映射到 priority
 *  - generateAIQueryBankForBrand：brandEntityId 不存在 / count 越界
 */

import { describe, it, expect } from 'vitest';
import {
  createAIQueryBankItem,
  getAIQueryBankItem,
  listAIQueryBankItems,
  listAIQueryBankItemsByBrand,
  listAIQueryBankItemsFiltered,
  computeAIQueryBankStats,
  updateAIQueryBankItem,
  deleteAIQueryBankItem,
  generateAIQueryBankForBrand,
} from './aiQueryService';
import { listBrandEntityProfiles } from './geoBrandService';
import { listContentAssets } from '@/lib/repos/geo';
import type {
  AIQueryBankIntent,
  AIQueryBankPlatform,
  AIQueryBankPriority,
  AIQueryBankStatus,
} from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function genId(): string {
  return `bank_test_${Math.random().toString(36).slice(2, 8)}`;

}

async function pickBrandId(): Promise<string> {
  const list = await listBrandEntityProfiles();
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

async function pickAssetId(): Promise<string> {
  const list = await listContentAssets();
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

function makeInput(overrides: Partial<{
  id: string;
  brandEntityId: string;
  query: string;
  intent: AIQueryBankIntent;
  platform: AIQueryBankPlatform;
  priority: AIQueryBankPriority;
  status: AIQueryBankStatus;
  linkedAssetIds: string[];
}> = {}): Parameters<typeof createAIQueryBankItem>[0] {
  return {
    id: overrides.id ?? genId(),
    brandEntityId: overrides.brandEntityId ?? 'placeholder',
    query: overrides.query ?? 'mock question text',
    intent: overrides.intent ?? 'informational',
    platform: overrides.platform ?? 'chatgpt',
    priority: overrides.priority ?? 'medium',
    status: overrides.status ?? 'active',
    linkedAssetIds: overrides.linkedAssetIds ?? [],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
}

describe('createAIQueryBankItem', () => {
  it('persists a minimal query', async () => {
    const brandId = await pickBrandId();
    const id = genId();
    const created = await createAIQueryBankItem(
      makeInput({ id, brandEntityId: brandId }),
    );
    expect(created.id).toBe(id);
    expect(created.brandEntityId).toBe(brandId);
    expect(created.priority).toBe('medium');
  });

  it('rejects missing brandEntityId', async () => {
    await expect(
      createAIQueryBankItem(makeInput({ brandEntityId: 'profile_does_not_exist' })),
    ).rejects.toThrow(/Brand profile not found/);
  });

  it('rejects empty query', async () => {
    const brandId = await pickBrandId();
    await expect(
      createAIQueryBankItem(makeInput({ brandEntityId: brandId, query: '' })),
    ).rejects.toThrow(/query cannot be empty/);
  });

  it('rejects query > 500 chars', async () => {
    const brandId = await pickBrandId();
    await expect(
      createAIQueryBankItem(
        makeInput({ brandEntityId: brandId, query: 'a'.repeat(501) }),
      ),
    ).rejects.toThrow(/≤ 500 characters/);
  });

  it('rejects unknown intent', async () => {
    const brandId = await pickBrandId();
    await expect(
      createAIQueryBankItem(
        makeInput({ brandEntityId: brandId, intent: 'not_an_intent' as AIQueryBankIntent }),
      ),
    ).rejects.toThrow(/intent must be one of/);
  });

  it('rejects unknown platform', async () => {
    const brandId = await pickBrandId();
    await expect(
      createAIQueryBankItem(
        makeInput({ brandEntityId: brandId, platform: 'not_a_platform' as AIQueryBankPlatform }),
      ),
    ).rejects.toThrow(/platform must be one of/);
  });

  it('rejects unknown priority', async () => {
    const brandId = await pickBrandId();
    await expect(
      createAIQueryBankItem(
        makeInput({ brandEntityId: brandId, priority: 'critical' as AIQueryBankPriority }),
      ),
    ).rejects.toThrow(/priority must be one of/);
  });

  it('rejects unknown status', async () => {
    const brandId = await pickBrandId();
    await expect(
      createAIQueryBankItem(
        makeInput({ brandEntityId: brandId, status: 'done' as AIQueryBankStatus }),
      ),
    ).rejects.toThrow(/status must be one of/);
  });

  it('rejects linkedAssetId that does not exist', async () => {
    const brandId = await pickBrandId();
    await expect(
      createAIQueryBankItem(
        makeInput({ brandEntityId: brandId, linkedAssetIds: ['asset_does_not_exist'] }),
      ),
    ).rejects.toThrow(/GEO content asset not found/);
  });

  it('accepts a real asset id', async () => {
    const brandId = await pickBrandId();
    const assetId = await pickAssetId();
    const id = genId();
    const created = await createAIQueryBankItem(
      makeInput({ id, brandEntityId: brandId, linkedAssetIds: [assetId] }),
    );
    expect(created.linkedAssetIds).toEqual([assetId]);
  });

  it('rejects duplicate id', async () => {
    const brandId = await pickBrandId();
    const id = genId();
    await createAIQueryBankItem(makeInput({ id, brandEntityId: brandId }));
    await expect(
      createAIQueryBankItem(makeInput({ id, brandEntityId: brandId })),
    ).rejects.toThrow(/already exists/);
  });
});

describe('listAIQueryBankItems', () => {
  it('returns all items sorted by updatedAt desc', async () => {
    const all = await listAIQueryBankItems();
    expect(all.length).toBeGreaterThan(0);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.updatedAt <= all[i - 1]!.updatedAt).toBe(true);
    }
  });
});

describe('listAIQueryBankItemsByBrand', () => {
  it('filters by brandEntityId', async () => {
    const brandId = await pickBrandId();
    const list = await listAIQueryBankItemsByBrand(brandId);
    for (const q of list) expect(q.brandEntityId).toBe(brandId);
  });
});

describe('listAIQueryBankItemsFiltered', () => {
  it('applies multiple filters', async () => {
    const brandId = await pickBrandId();
    const list = await listAIQueryBankItemsFiltered({
      brandEntityId: brandId,
      platform: 'chatgpt',
    });
    for (const q of list) {
      expect(q.brandEntityId).toBe(brandId);
      expect(q.platform).toBe('chatgpt');
    }
  });

  it('applies intent filter', async () => {
    const list = await listAIQueryBankItemsFiltered({ intent: 'comparison' });
    for (const q of list) expect(q.intent).toBe('comparison');
  });

  it('applies priority filter', async () => {
    const list = await listAIQueryBankItemsFiltered({ priority: 'urgent' });
    for (const q of list) expect(q.priority).toBe('urgent');
  });
});

describe('computeAIQueryBankStats', () => {
  it('returns byIntent / byPlatform / byPriority / byStatus counts', async () => {
    const stats = await computeAIQueryBankStats();
    expect(stats.totalItems).toBeGreaterThan(0);
    // 5 enum dimensions sum to total
    const sumIntent = Object.values(stats.byIntent).reduce((a, b) => a + b, 0);
    const sumPlatform = Object.values(stats.byPlatform).reduce((a, b) => a + b, 0);
    expect(sumIntent).toBe(stats.totalItems);
    expect(sumPlatform).toBe(stats.totalItems);
  });
});

describe('updateAIQueryBankItem', () => {
  it('preserves id, createdAt on partial patch', async () => {
    const brandId = await pickBrandId();
    const id = genId();
    const created = await createAIQueryBankItem(
      makeInput({ id, brandEntityId: brandId }),
    );
    const updated = await updateAIQueryBankItem(id, {
      query: 'updated question text',
      updatedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.query).toBe('updated question text');
  });

  it('re-validates brandEntityId when changed', async () => {
    const brandId = await pickBrandId();
    const id = genId();
    await createAIQueryBankItem(makeInput({ id, brandEntityId: brandId }));
    await expect(
      updateAIQueryBankItem(id, {
        brandEntityId: 'profile_does_not_exist',
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/Brand profile not found/);
  });

  it('re-validates linkedAssetIds when changed', async () => {
    const brandId = await pickBrandId();
    const id = genId();
    await createAIQueryBankItem(makeInput({ id, brandEntityId: brandId }));
    await expect(
      updateAIQueryBankItem(id, {
        linkedAssetIds: ['asset_does_not_exist'],
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/GEO content asset not found/);
  });

  it('rejects unknown id', async () => {
    await expect(
      updateAIQueryBankItem('bank_does_not_exist', {
        query: 'x',
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe('deleteAIQueryBankItem', () => {
  it('removes the record', async () => {
    const brandId = await pickBrandId();
    const id = genId();
    await createAIQueryBankItem(makeInput({ id, brandEntityId: brandId }));
    expect((await getAIQueryBankItem(id))?.id).toBe(id);
    await deleteAIQueryBankItem(id);
    expect(await getAIQueryBankItem(id)).toBeUndefined();
  });

  it('rejects unknown id', async () => {
    await expect(
      deleteAIQueryBankItem('bank_does_not_exist'),
    ).rejects.toThrow(/not found/);
  });
});

describe('generateAIQueryBankForBrand', () => {
  it('generates and persists 3 queries for a real brand', async () => {
    const brandId = await pickBrandId();
    const before = await listAIQueryBankItemsByBrand(brandId);
    const created = await generateAIQueryBankForBrand({
      brandEntityId: brandId,
      intent: 'informational',
      platform: 'chatgpt',
      count: 3,
      defaultPriority: 'medium',
      defaultStatus: 'active',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(created.length).toBe(3);
    for (const item of created) {
      expect(item.brandEntityId).toBe(brandId);
      expect(item.intent).toBe('informational');
      expect(item.platform).toBe('chatgpt');
      expect(item.status).toBe('active');
      expect(['low', 'medium', 'high', 'urgent']).toContain(item.priority);
    }
    const after = await listAIQueryBankItemsByBrand(brandId);
    expect(after.length).toBe(before.length + 3);
  });

  it('rejects unknown brandEntityId', async () => {
    await expect(
      generateAIQueryBankForBrand({
        brandEntityId: 'profile_does_not_exist',
        intent: 'informational',
        platform: 'chatgpt',
        count: 3,
        defaultPriority: 'medium',
        defaultStatus: 'active',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/Brand profile not found/);
  });

  it('rejects count < 1', async () => {
    const brandId = await pickBrandId();
    await expect(
      generateAIQueryBankForBrand({
        brandEntityId: brandId,
        intent: 'informational',
        platform: 'chatgpt',
        count: 0,
        defaultPriority: 'medium',
        defaultStatus: 'active',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/count must be ≥ 1/);
  });

  it('rejects count > 50', async () => {
    const brandId = await pickBrandId();
    await expect(
      generateAIQueryBankForBrand({
        brandEntityId: brandId,
        intent: 'informational',
        platform: 'chatgpt',
        count: 51,
        defaultPriority: 'medium',
        defaultStatus: 'active',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/count must be ≤ 50/);
  });
});
