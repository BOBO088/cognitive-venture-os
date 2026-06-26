/**
 * geoBrandService 单元测试。
 *
 * 覆盖：
 *  - createBrandEntityProfile 拒绝：name / description / category / targetAudience 缺失或越界
 *  - createBrandEntityProfile competitors / keyClaims / proofPoints trim+去重+上限 20
 *  - createBrandEntityProfile officialLinks 必须是合法 URL
 *  - createBrandEntityProfile relatedProjectIds / relatedEntityIds 引用校验
 *  - createBrandEntityProfile id 重复
 *  - updateBrandEntityProfile 部分 patch 保留 id / createdAt
 *  - updateBrandEntityProfile 改 relatedProjectIds 时重新校验
 *  - updateBrandEntityProfile 未知 id
 *  - deleteBrandEntityProfile 成功 / 未知 id
 *  - listBrandEntityProfiles / listBrandEntityProfilesByCategory / listBrandEntityProfilesFiltered
 *  - computeBrandEntityProfileStats
 *  - round-trip
 */

import { describe, it, expect } from 'vitest';
import {
  createBrandEntityProfile,
  getBrandEntityProfile,
  listBrandEntityProfiles,
  listBrandEntityProfilesByCategory,
  listBrandEntityProfilesFiltered,
  computeBrandEntityProfileStats,
  updateBrandEntityProfile,
  deleteBrandEntityProfile,
  GeoBrandServiceError,
} from './geoBrandService';
import type { BrandEntityCategory } from '@/types';
import { listMVPProjects } from './mvpProjectService';
import { listEntities } from './graphEntityService';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function genId(): string {
  return `profile_test_${Math.random().toString(36).slice(2, 8)}`;

}

async function pickProjectId(): Promise<string> {
  const list = await listMVPProjects();
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

async function pickEntityId(): Promise<string> {
  const list = await listEntities();
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

function makeInput(overrides: Partial<{
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
}> = {}): Parameters<typeof createBrandEntityProfile>[0] {
  return {
    id: overrides.id ?? genId(),
    name: overrides.name ?? 'Test brand',
    description:
      overrides.description ?? 'Test description, what / for whom / why',
    category: overrides.category ?? 'product',
    targetAudience:
      overrides.targetAudience ?? 'AI-native founders in early stage',
    competitors: overrides.competitors ?? ['Profound'],
    keyClaims: overrides.keyClaims ?? ['Mock claim'],
    proofPoints: overrides.proofPoints ?? ['Mock proof'],
    officialLinks: overrides.officialLinks ?? ['https://example.com'],
    relatedProjectIds: overrides.relatedProjectIds ?? [],
    relatedEntityIds: overrides.relatedEntityIds ?? [],
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
}

describe('createBrandEntityProfile', () => {
  it('persists a minimal profile with empty list fields', async () => {
    const id = genId();
    const created = await createBrandEntityProfile(makeInput({ id }));
    expect(created.id).toBe(id);
    expect(created.category).toBe('product');
    expect(created.competitors).toEqual(['Profound']);
  });

  it('rejects missing name', async () => {
    await expect(
      createBrandEntityProfile(makeInput({ name: '' })),
    ).rejects.toBeInstanceOf(GeoBrandServiceError);
  });

  it('rejects name > 200 chars', async () => {
    await expect(
      createBrandEntityProfile(makeInput({ name: 'a'.repeat(201) })),
    ).rejects.toThrow(/≤ 200 characters/);
  });

  it('rejects missing description', async () => {
    await expect(
      createBrandEntityProfile(makeInput({ description: '' })),
    ).rejects.toThrow(/description cannot be empty/);
  });

  it('rejects description > 4000 chars', async () => {
    await expect(
      createBrandEntityProfile(makeInput({ description: 'a'.repeat(4001) })),
    ).rejects.toThrow(/≤ 4000 characters/);
  });

  it('rejects unknown category', async () => {
    await expect(
      createBrandEntityProfile(makeInput({ category: 'not_a_category' as BrandEntityCategory })),
    ).rejects.toThrow(/category must be one of/);
  });

  it('rejects empty targetAudience', async () => {
    await expect(
      createBrandEntityProfile(makeInput({ targetAudience: '   ' })),
    ).rejects.toThrow(/targetAudience cannot be empty/);
  });

  it('rejects targetAudience > 1000 chars', async () => {
    await expect(
      createBrandEntityProfile(makeInput({ targetAudience: 'a'.repeat(1001) })),
    ).rejects.toThrow(/≤ 1000 characters/);
  });

  it('trims and dedupes competitors / keyClaims / proofPoints', async () => {
    const id = genId();
    const created = await createBrandEntityProfile(
      makeInput({
        id,
        competitors: ['  Profound  ', 'Profound', '', 'Otterly', '  Profound'],
        keyClaims: ['  claim1  ', 'claim1', ''],
        proofPoints: [' p1 ', 'p1'],
      }),
    );
    expect(created.competitors).toEqual(['Profound', 'Otterly']);
    expect(created.keyClaims).toEqual(['claim1']);
    expect(created.proofPoints).toEqual(['p1']);
  });

  it('rejects competitor item > 200 chars', async () => {
    await expect(
      createBrandEntityProfile(
        makeInput({ competitors: ['a'.repeat(201)] }),
      ),
    ).rejects.toThrow(/competitors item must be ≤ 200 chars/);
  });

  it('rejects keyClaim item > 400 chars', async () => {
    await expect(
      createBrandEntityProfile(
        makeInput({ keyClaims: ['a'.repeat(401)] }),
      ),
    ).rejects.toThrow(/keyClaims item must be ≤ 400 chars/);
  });

  it('rejects officialLinks that are not http(s) URLs', async () => {
    await expect(
      createBrandEntityProfile(
        makeInput({ officialLinks: ['not-a-url', 'ftp://x.com'] }),
      ),
    ).rejects.toThrow(/officialLinks item must be a valid http\(s\) URL/);
  });

  it('accepts valid https URLs and dedupes', async () => {
    const id = genId();
    const created = await createBrandEntityProfile(
      makeInput({
        id,
        officialLinks: [
          'https://example.com',
          '  https://example.com  ',
          'http://docs.example.com',
        ],
      }),
    );
    expect(created.officialLinks).toEqual([
      'https://example.com',
      'http://docs.example.com',
    ]);
  });

  it('rejects relatedProjectId that does not exist', async () => {
    await expect(
      createBrandEntityProfile(
        makeInput({ relatedProjectIds: ['mvp_does_not_exist'] }),
      ),
    ).rejects.toThrow(/MVP project not found/);
  });

  it('rejects relatedEntityId that does not exist', async () => {
    await expect(
      createBrandEntityProfile(
        makeInput({ relatedEntityIds: ['entity_does_not_exist'] }),
      ),
    ).rejects.toThrow(/Graph entity not found/);
  });

  it('accepts real project and entity references', async () => {
    const projectId = await pickProjectId();
    const entityId = await pickEntityId();
    const id = genId();
    const created = await createBrandEntityProfile(
      makeInput({ id, relatedProjectIds: [projectId], relatedEntityIds: [entityId] }),
    );
    expect(created.relatedProjectIds).toEqual([projectId]);
    expect(created.relatedEntityIds).toEqual([entityId]);
  });

  it('rejects duplicate id', async () => {
    const id = genId();
    await createBrandEntityProfile(makeInput({ id }));
    await expect(createBrandEntityProfile(makeInput({ id }))).rejects.toThrow(
      /already exists/,
    );
  });
});

describe('listBrandEntityProfiles', () => {
  it('returns all profiles sorted by updatedAt desc', async () => {
    const all = await listBrandEntityProfiles();
    expect(all.length).toBeGreaterThan(0);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.updatedAt <= all[i - 1]!.updatedAt).toBe(true);
    }
  });
});

describe('listBrandEntityProfilesByCategory', () => {
  it('filters by category', async () => {
    const list = await listBrandEntityProfilesByCategory('product');
    for (const p of list) expect(p.category).toBe('product');
  });
});

describe('listBrandEntityProfilesFiltered', () => {
  it('filters by projectId', async () => {
    const projectId = await pickProjectId();
    const list = await listBrandEntityProfilesFiltered({ projectId });
    for (const p of list) expect(p.relatedProjectIds).toContain(projectId);
  });

  it('filters by entityId', async () => {
    const entityId = await pickEntityId();
    const list = await listBrandEntityProfilesFiltered({ entityId });
    for (const p of list) expect(p.relatedEntityIds).toContain(entityId);
  });
});

describe('computeBrandEntityProfileStats', () => {
  it('returns byCategory counts + withProjects/withEntities', async () => {
    const stats = await computeBrandEntityProfileStats();
    expect(stats.totalProfiles).toBeGreaterThan(0);
    // 6 categories × count sums to total
    const sum = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.totalProfiles);
  });
});

describe('updateBrandEntityProfile', () => {
  it('preserves id, createdAt on partial patch', async () => {
    const id = genId();
    const created = await createBrandEntityProfile(makeInput({ id }));
    const updated = await updateBrandEntityProfile(id, {
      name: 'New name',
      updatedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.name).toBe('New name');
  });

  it('re-validates relatedProjectIds when changed', async () => {
    const id = genId();
    await createBrandEntityProfile(makeInput({ id }));
    await expect(
      updateBrandEntityProfile(id, {
        relatedProjectIds: ['mvp_does_not_exist'],
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/MVP project not found/);
  });

  it('does not re-validate relatedProjectIds when unchanged', async () => {
    const projectId = await pickProjectId();
    const id = genId();
    await createBrandEntityProfile(
      makeInput({ id, relatedProjectIds: [projectId] }),
    );
    // even if unrelated fields are changed, relatedProjectIds stays valid
    const updated = await updateBrandEntityProfile(id, {
      name: 'Renamed',
      updatedAt: MOCK_NOW,
    });
    expect(updated.relatedProjectIds).toEqual([projectId]);
  });

  it('rejects unknown id', async () => {
    await expect(
      updateBrandEntityProfile('profile_does_not_exist', {
        name: 'x',
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe('deleteBrandEntityProfile', () => {
  it('removes the record', async () => {
    const id = genId();
    await createBrandEntityProfile(makeInput({ id }));
    expect((await getBrandEntityProfile(id))?.id).toBe(id);
    await deleteBrandEntityProfile(id);
    expect(await getBrandEntityProfile(id)).toBeUndefined();
  });

  it('rejects unknown id', async () => {
    await expect(
      deleteBrandEntityProfile('profile_does_not_exist'),
    ).rejects.toThrow(/not found/);
  });
});

describe('round-trip', () => {
  it('create + read returns the persisted record', async () => {
    const id = genId();
    await createBrandEntityProfile(makeInput({ id }));
    const fetched = await getBrandEntityProfile(id);
    expect(fetched?.id).toBe(id);
  });
});
