/**
 * promptVersionService 单元测试。
 *
 * 覆盖：
 *  - createPromptVersion 拒绝：name / type / content / usedFor 缺失或长度越界
 *  - createPromptVersion score 越界 / 非数
 *  - createPromptVersion 同一 (type, name) 下自动递增 version
 *  - createPromptVersion id 重复
 *  - updatePromptVersion 部分 patch 保留 id / version / createdAt
 *  - updatePromptVersion score: null 清空 / undefined 保留
 *  - updatePromptVersion 未知 id
 *  - deletePromptVersion 成功 / 未知 id
 *  - listPromptVersions / listPromptVersionsByType / listPromptVersionsByName / getLatestPromptVersion
 *  - computePromptVersionStats
 *  - suggestImprovementForPrompt 调用 LLMProvider
 */

import { describe, it, expect } from 'vitest';
import {
  createPromptVersion,
  getPromptVersion,
  listPromptVersions,
  listPromptVersionsByType,
  listPromptVersionsByName,
  listPromptVersionsFiltered,
  getLatestPromptVersion,
  computePromptVersionStats,
  updatePromptVersion,
  deletePromptVersion,
  suggestImprovementForPrompt,
  PromptVersionServiceError,
} from './promptVersionService';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function genId(): string {
  return `prompt_test_${Math.random().toString(36).slice(2, 8)}`;

}

function makeInput(overrides: Partial<{
  id: string;
  name: string;
  type: 'summarize_source' | 'research_card' | 'opportunity_score' | 'geo_suggestion' | 'lesson_generate' | 'opportunity_draft' | 'prd_draft' | 'codex_task_list' | 'other';
  content: string;
  usedFor: string;
  score: number | null;
}> = {}): Parameters<typeof createPromptVersion>[0] {
  return {
    id: overrides.id ?? genId(),
    name: overrides.name ?? 'Test prompt name',
    type: overrides.type ?? 'other',
    content: overrides.content ?? 'mock content body',
    usedFor: overrides.usedFor ?? 'mock usedFor',
    score: overrides.score !== undefined ? overrides.score : 70,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
}

describe('createPromptVersion', () => {
  it('persists a prompt and auto-assigns version 1 for a new (type, name) pair', async () => {
    const id = genId();
    const created = await createPromptVersion(
      makeInput({ id, name: 'Brand new prompt', type: 'other' }),
    );
    expect(created.id).toBe(id);
    expect(created.version).toBe(1);
    expect(created.score).toBe(70);
  });

  it('auto-increments version on the same (type, name)', async () => {
    const base = 'Auto inc ' + Math.random().toString(36).slice(2, 6);
    const v1 = await createPromptVersion(makeInput({ name: base, type: 'other' }));
    const v2 = await createPromptVersion(makeInput({ name: base, type: 'other' }));
    const v3 = await createPromptVersion(makeInput({ name: base, type: 'other' }));
    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
    expect(v3.version).toBe(3);
  });

  it('rejects empty name', async () => {
    await expect(
      createPromptVersion(makeInput({ name: '   ' })),
    ).rejects.toBeInstanceOf(PromptVersionServiceError);
  });

  it('rejects name > 200 chars', async () => {
    await expect(
      createPromptVersion(makeInput({ name: 'a'.repeat(201) })),
    ).rejects.toThrow(/≤ 200 characters/);
  });

  it('rejects unknown type', async () => {
    await expect(
      createPromptVersion(makeInput({ type: 'not_a_type' as 'other' })),
    ).rejects.toThrow(/type must be one of/);
  });

  it('rejects empty content', async () => {
    await expect(
      createPromptVersion(makeInput({ content: '' })),
    ).rejects.toThrow(/content cannot be empty/);
  });

  it('rejects content > 50000 chars', async () => {
    await expect(
      createPromptVersion(makeInput({ content: 'a'.repeat(50001) })),
    ).rejects.toThrow(/≤ 50000 characters/);
  });

  it('rejects empty usedFor', async () => {
    await expect(
      createPromptVersion(makeInput({ usedFor: '  ' })),
    ).rejects.toThrow(/usedFor cannot be empty/);
  });

  it('rejects score > 100', async () => {
    await expect(
      createPromptVersion(makeInput({ score: 120 })),
    ).rejects.toThrow(/score must be between/);
  });

  it('accepts score = null', async () => {
    const id = genId();
    const created = await createPromptVersion(makeInput({ id, score: null }));
    expect(created.score).toBeNull();
  });

  it('rejects duplicate id', async () => {
    const id = genId();
    await createPromptVersion(makeInput({ id }));
    await expect(
      createPromptVersion(makeInput({ id })),
    ).rejects.toThrow(/already exists/);
  });
});

describe('listPromptVersions', () => {
  it('returns all prompts sorted by updatedAt desc', async () => {
    const all = await listPromptVersions();
    expect(all.length).toBeGreaterThan(0);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.updatedAt <= all[i - 1]!.updatedAt).toBe(true);
    }
  });
});

describe('listPromptVersionsByType', () => {
  it('filters by type', async () => {
    const list = await listPromptVersionsByType('prd_draft');
    for (const p of list) expect(p.type).toBe('prd_draft');
    expect(list.length).toBeGreaterThan(0);
  });
});

describe('listPromptVersionsByName', () => {
  it('returns all versions of a given name sorted by version asc', async () => {
    const list = await listPromptVersionsByName('GEO Pulse PRD generator');
    for (let i = 1; i < list.length; i++) {
      expect(list[i]!.version).toBeGreaterThanOrEqual(list[i - 1]!.version);
    }
    expect(list.length).toBeGreaterThan(1);
  });
});

describe('listPromptVersionsFiltered', () => {
  it('applies both type and name filters', async () => {
    const list = await listPromptVersionsFiltered({
      type: 'prd_draft',
      name: 'GEO Pulse PRD generator',
    });
    for (const p of list) {
      expect(p.type).toBe('prd_draft');
      expect(p.name).toBe('GEO Pulse PRD generator');
    }
  });
});

describe('getLatestPromptVersion', () => {
  it('returns the highest version for (type, name)', async () => {
    const latest = await getLatestPromptVersion('prd_draft', 'GEO Pulse PRD generator');
    expect(latest).toBeDefined();
    const all = await listPromptVersionsByName('GEO Pulse PRD generator');
    const same = all.filter((p) => p.type === 'prd_draft');
    expect(latest!.version).toBe(Math.max(...same.map((p) => p.version)));
  });
});

describe('computePromptVersionStats', () => {
  it('returns by-type counts, distinct name count, average score', async () => {
    const stats = await computePromptVersionStats();
    expect(stats.totalPrompts).toBeGreaterThan(0);
    expect(stats.distinctNames).toBeGreaterThan(0);
    // averageScore is either null (no scored prompts) or a number 0-100
    if (stats.averageScore !== null) {
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('updatePromptVersion', () => {
  it('preserves id, version, createdAt on partial patch', async () => {
    const id = genId();
    const created = await createPromptVersion(makeInput({ id }));
    const updated = await updatePromptVersion(id, {
      content: 'updated content',
      updatedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.version).toBe(created.version);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.content).toBe('updated content');
    expect(updated.updatedAt).toBe('2026-06-26T12:00:00.000Z');
  });

  it('clears score when patch.score is null', async () => {
    const id = genId();
    const created = await createPromptVersion(makeInput({ id, score: 80 }));
    expect(created.score).toBe(80);
    const cleared = await updatePromptVersion(id, {
      score: null,
      updatedAt: MOCK_NOW,
    });
    expect(cleared.score).toBeNull();
  });

  it('keeps score when patch.score is undefined', async () => {
    const id = genId();
    await createPromptVersion(makeInput({ id, score: 60 }));
    const updated = await updatePromptVersion(id, {
      usedFor: 'new usedFor',
      updatedAt: MOCK_NOW,
    });
    expect(updated.score).toBe(60);
  });

  it('rejects unknown id', async () => {
    await expect(
      updatePromptVersion('prompt_does_not_exist', {
        content: 'x',
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe('deletePromptVersion', () => {
  it('removes the record', async () => {
    const id = genId();
    await createPromptVersion(makeInput({ id }));
    expect((await getPromptVersion(id))?.id).toBe(id);
    await deletePromptVersion(id);
    expect(await getPromptVersion(id)).toBeUndefined();
  });

  it('rejects unknown id', async () => {
    await expect(
      deletePromptVersion('prompt_does_not_exist'),
    ).rejects.toThrow(/not found/);
  });
});

describe('round-trip', () => {
  it('create + read returns the persisted record', async () => {
    const id = genId();
    await createPromptVersion(makeInput({ id }));
    const fetched = await getPromptVersion(id);
    expect(fetched?.id).toBe(id);
  });
});

describe('suggestImprovementForPrompt', () => {
  it('returns problem + suggestion draft for a real prompt', async () => {
    const all = await listPromptVersions();
    expect(all.length).toBeGreaterThan(0);
    const draft = await suggestImprovementForPrompt(all[0]!.id);
    expect(draft.problem.length).toBeGreaterThan(0);
    expect(draft.suggestion.length).toBeGreaterThan(0);
  });

  it('rejects unknown prompt id', async () => {
    await expect(
      suggestImprovementForPrompt('prompt_does_not_exist'),
    ).rejects.toThrow(/not found/);
  });
});
