/**
 * loopVersionService 单元测试。
 *
 * 覆盖：
 *  - createLoopVersion 拒绝：name / steps / stopCondition / evaluationCriteria 缺失或越界
 *  - createLoopVersion steps 不能为空数组；每步 1-200 字符
 *  - createLoopVersion score 越界
 *  - createLoopVersion 同一 name 下自动递增 version
 *  - createLoopVersion id 重复
 *  - updateLoopVersion 部分 patch 保留 id / version / createdAt
 *  - updateLoopVersion score: null 清空
 *  - updateLoopVersion 未知 id
 *  - deleteLoopVersion 成功 / 未知 id
 *  - listLoopVersions / listLoopVersionsByName / getLatestLoopVersion / listLoopVersionsFiltered
 *  - computeLoopVersionStats
 *  - suggestImprovementForLoop 调用 LLMProvider
 */

import { describe, it, expect } from 'vitest';
import {
  createLoopVersion,
  getLoopVersion,
  listLoopVersions,
  listLoopVersionsByName,
  listLoopVersionsFiltered,
  getLatestLoopVersion,
  computeLoopVersionStats,
  updateLoopVersion,
  deleteLoopVersion,
  suggestImprovementForLoop,
  LoopVersionServiceError,
} from './loopVersionService';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function genId(): string {
  return `loop_test_${Math.random().toString(36).slice(2, 8)}`;

}

function makeInput(overrides: Partial<{
  id: string;
  name: string;
  steps: string[];
  stopCondition: string;
  evaluationCriteria: string;
  score: number | null;
}> = {}): Parameters<typeof createLoopVersion>[0] {
  return {
    id: overrides.id ?? genId(),
    name: overrides.name ?? 'Test loop name',
    steps: overrides.steps ?? ['step one', 'step two'],
    stopCondition: overrides.stopCondition ?? 'stop when score >= 80',
    evaluationCriteria: overrides.evaluationCriteria ?? 'accuracy + completeness',
    score: overrides.score !== undefined ? overrides.score : 70,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
}

describe('createLoopVersion', () => {
  it('persists a loop and auto-assigns version 1 for a new name', async () => {
    const id = genId();
    const created = await createLoopVersion(
      makeInput({ id, name: 'Brand new loop' }),
    );
    expect(created.id).toBe(id);
    expect(created.version).toBe(1);
    expect(created.steps).toEqual(['step one', 'step two']);
  });

  it('auto-increments version on the same name', async () => {
    const base = 'Auto inc loop ' + Math.random().toString(36).slice(2, 6);
    const v1 = await createLoopVersion(makeInput({ name: base }));
    const v2 = await createLoopVersion(makeInput({ name: base }));
    const v3 = await createLoopVersion(makeInput({ name: base }));
    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
  });

  it('rejects empty name', async () => {
    await expect(
      createLoopVersion(makeInput({ name: '' })),
    ).rejects.toBeInstanceOf(LoopVersionServiceError);
  });

  it('rejects empty steps array', async () => {
    await expect(
      createLoopVersion(makeInput({ steps: [] })),
    ).rejects.toThrow(/at least 1 item/);
  });

  it('rejects step longer than 200 chars', async () => {
    await expect(
      createLoopVersion(makeInput({ steps: ['a'.repeat(201)] })),
    ).rejects.toThrow(/≤ 200 characters/);
  });

  it('rejects empty stopCondition', async () => {
    await expect(
      createLoopVersion(makeInput({ stopCondition: '   ' })),
    ).rejects.toThrow(/stopCondition cannot be empty/);
  });

  it('rejects empty evaluationCriteria', async () => {
    await expect(
      createLoopVersion(makeInput({ evaluationCriteria: '' })),
    ).rejects.toThrow(/evaluationCriteria cannot be empty/);
  });

  it('rejects score > 100', async () => {
    await expect(
      createLoopVersion(makeInput({ score: 150 })),
    ).rejects.toThrow(/score must be between/);
  });

  it('accepts score = null', async () => {
    const id = genId();
    const created = await createLoopVersion(makeInput({ id, score: null }));
    expect(created.score).toBeNull();
  });

  it('rejects duplicate id', async () => {
    const id = genId();
    await createLoopVersion(makeInput({ id }));
    await expect(
      createLoopVersion(makeInput({ id })),
    ).rejects.toThrow(/already exists/);
  });
});

describe('listLoopVersions', () => {
  it('returns all loops sorted by updatedAt desc', async () => {
    const all = await listLoopVersions();
    expect(all.length).toBeGreaterThan(0);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.updatedAt <= all[i - 1]!.updatedAt).toBe(true);
    }
  });
});

describe('listLoopVersionsByName', () => {
  it('returns versions sorted by version asc', async () => {
    const list = await listLoopVersionsByName('Weekly review loop');
    for (let i = 1; i < list.length; i++) {
      expect(list[i]!.version).toBeGreaterThanOrEqual(list[i - 1]!.version);
    }
    expect(list.length).toBeGreaterThanOrEqual(2);
  });
});

describe('getLatestLoopVersion', () => {
  it('returns the highest version for a name', async () => {
    const latest = await getLatestLoopVersion('Weekly review loop');
    expect(latest).toBeDefined();
    const all = await listLoopVersionsByName('Weekly review loop');
    expect(latest!.version).toBe(Math.max(...all.map((l) => l.version)));
  });
});

describe('listLoopVersionsFiltered', () => {
  it('filters by name', async () => {
    const list = await listLoopVersionsFiltered({ name: 'Weekly review loop' });
    for (const l of list) expect(l.name).toBe('Weekly review loop');
  });
});

describe('computeLoopVersionStats', () => {
  it('returns totalLoops, distinctNames, averageScore', async () => {
    const stats = await computeLoopVersionStats();
    expect(stats.totalLoops).toBeGreaterThan(0);
    expect(stats.distinctNames).toBeGreaterThan(0);
    if (stats.averageScore !== null) {
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('updateLoopVersion', () => {
  it('preserves id, version, createdAt on partial patch', async () => {
    const id = genId();
    const created = await createLoopVersion(makeInput({ id }));
    const updated = await updateLoopVersion(id, {
      steps: ['new step a', 'new step b'],
      updatedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.version).toBe(created.version);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.steps).toEqual(['new step a', 'new step b']);
  });

  it('clears score when patch.score is null', async () => {
    const id = genId();
    await createLoopVersion(makeInput({ id, score: 80 }));
    const cleared = await updateLoopVersion(id, {
      score: null,
      updatedAt: MOCK_NOW,
    });
    expect(cleared.score).toBeNull();
  });

  it('rejects unknown id', async () => {
    await expect(
      updateLoopVersion('loop_does_not_exist', {
        steps: ['x'],
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe('deleteLoopVersion', () => {
  it('removes the record', async () => {
    const id = genId();
    await createLoopVersion(makeInput({ id }));
    expect((await getLoopVersion(id))?.id).toBe(id);
    await deleteLoopVersion(id);
    expect(await getLoopVersion(id)).toBeUndefined();
  });

  it('rejects unknown id', async () => {
    await expect(
      deleteLoopVersion('loop_does_not_exist'),
    ).rejects.toThrow(/not found/);
  });
});

describe('round-trip', () => {
  it('create + read returns the persisted record', async () => {
    const id = genId();
    await createLoopVersion(makeInput({ id }));
    const fetched = await getLoopVersion(id);
    expect(fetched?.id).toBe(id);
  });
});

describe('suggestImprovementForLoop', () => {
  it('returns problem + suggestion draft for a real loop', async () => {
    const all = await listLoopVersions();
    expect(all.length).toBeGreaterThan(0);
    const draft = await suggestImprovementForLoop(all[0]!.id);
    expect(draft.problem.length).toBeGreaterThan(0);
    expect(draft.suggestion.length).toBeGreaterThan(0);
  });

  it('rejects unknown loop id', async () => {
    await expect(
      suggestImprovementForLoop('loop_does_not_exist'),
    ).rejects.toThrow(/not found/);
  });
});
