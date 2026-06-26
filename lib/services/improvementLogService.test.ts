/**
 * improvementLogService 单元测试。
 *
 * 覆盖：
 *  - createImprovementLog 拒绝：targetType / targetId / problem / suggestion 缺失
 *  - createImprovementLog targetId 引用校验：type=prompt 必须指向存在的 PromptVersion
 *  - createImprovementLog targetId 引用校验：type=loop 必须指向存在的 LoopVersion
 *  - createImprovementLog score_model / other：targetId 自由 sentinel
 *  - createImprovementLog result 可空
 *  - createImprovementLog id 重复
 *  - updateImprovementLog 部分 patch 保留 id / createdAt
 *  - updateImprovementLog 改 targetType 时同步重新校验 targetId
 *  - updateImprovementLog 未知 id
 *  - deleteImprovementLog 成功 / 未知 id
 *  - listImprovementLogs / listImprovementLogsByTarget / listImprovementLogsFiltered
 *  - computeImprovementLogStats
 */

import { describe, it, expect } from 'vitest';
import {
  createImprovementLog,
  getImprovementLog,
  listImprovementLogs,
  listImprovementLogsByTarget,
  listImprovementLogsFiltered,
  computeImprovementLogStats,
  updateImprovementLog,
  deleteImprovementLog,
  ImprovementLogServiceError,
} from './improvementLogService';
import { listPromptVersions } from './promptVersionService';
import { listLoopVersions } from './loopVersionService';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function genId(): string {
  return `imp_test_${Math.random().toString(36).slice(2, 8)}`;

}

function makeBase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: genId(),
    targetType: 'score_model',
    targetId: 'opportunity_score_model',
    problem: 'mock problem statement',
    suggestion: 'mock suggestion',
    result: '',
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
    ...overrides,
  };
}

function makeInput(overrides: Record<string, unknown> = {}): Parameters<typeof createImprovementLog>[0] {
  return makeBase(overrides) as unknown as Parameters<typeof createImprovementLog>[0];
}

describe('createImprovementLog', () => {
  it('persists a score_model log with sentinel targetId', async () => {
    const id = genId();
    const created = await createImprovementLog(
      makeInput({ id, targetType: 'score_model', targetId: 'opportunity_score_model' }),
    );
    expect(created.id).toBe(id);
    expect(created.targetType).toBe('score_model');
    expect(created.result).toBe('');
  });

  it('rejects missing targetType', async () => {
    const base = makeBase();
    // strip targetType to simulate "missing"
    const input = { ...base } as Record<string, unknown>;
    delete input.targetType;
    await expect(
      createImprovementLog(input as unknown as Parameters<typeof createImprovementLog>[0]),
    ).rejects.toBeInstanceOf(ImprovementLogServiceError);
  });

  it('rejects missing targetId', async () => {
    await expect(
      createImprovementLog(makeInput({ targetId: '' })),
    ).rejects.toThrow(/targetId is required/);
  });

  it('rejects empty problem', async () => {
    await expect(
      createImprovementLog(makeInput({ problem: '' })),
    ).rejects.toThrow(/problem is required/);
  });

  it('rejects empty suggestion', async () => {
    await expect(
      createImprovementLog(makeInput({ suggestion: '' })),
    ).rejects.toThrow(/suggestion is required/);
  });

  it('rejects prompt targetId that does not exist', async () => {
    await expect(
      createImprovementLog(
        makeInput({ targetType: 'prompt', targetId: 'prompt_does_not_exist' }),
      ),
    ).rejects.toThrow(/Target prompt not found/);
  });

  it('rejects loop targetId that does not exist', async () => {
    await expect(
      createImprovementLog(
        makeInput({ targetType: 'loop', targetId: 'loop_does_not_exist' }),
      ),
    ).rejects.toThrow(/Target loop not found/);
  });

  it('accepts a real prompt targetId', async () => {
    const prompts = await listPromptVersions();
    expect(prompts.length).toBeGreaterThan(0);
    const created = await createImprovementLog(
      makeInput({ targetType: 'prompt', targetId: prompts[0]!.id }),
    );
    expect(created.targetId).toBe(prompts[0]!.id);
  });

  it('accepts a real loop targetId', async () => {
    const loops = await listLoopVersions();
    expect(loops.length).toBeGreaterThan(0);
    const created = await createImprovementLog(
      makeInput({ targetType: 'loop', targetId: loops[0]!.id }),
    );
    expect(created.targetId).toBe(loops[0]!.id);
  });

  it('accepts other targetId as free sentinel', async () => {
    const created = await createImprovementLog(
      makeInput({ targetType: 'other', targetId: 'free_form_sentinel_42' }),
    );
    expect(created.targetId).toBe('free_form_sentinel_42');
  });

  it('rejects duplicate id', async () => {
    const id = genId();
    await createImprovementLog(makeInput({ id }));
    await expect(
      createImprovementLog(makeInput({ id })),
    ).rejects.toThrow(/already exists/);
  });
});

describe('listImprovementLogs', () => {
  it('returns all logs sorted by updatedAt desc', async () => {
    const all = await listImprovementLogs();
    expect(all.length).toBeGreaterThan(0);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.updatedAt <= all[i - 1]!.updatedAt).toBe(true);
    }
  });
});

describe('listImprovementLogsByTarget', () => {
  it('filters by targetId', async () => {
    const all = await listImprovementLogs();
    const sample = all.find((l) => l.targetType === 'prompt');
    if (!sample) return;
    const filtered = await listImprovementLogsByTarget(sample.targetId);
    for (const l of filtered) expect(l.targetId).toBe(sample.targetId);
  });
});

describe('listImprovementLogsFiltered', () => {
  it('applies targetType filter', async () => {
    const list = await listImprovementLogsFiltered({ targetType: 'score_model' });
    for (const l of list) expect(l.targetType).toBe('score_model');
  });

  it('applies targetId filter', async () => {
    const all = await listImprovementLogs();
    const target = all[0]!;
    const list = await listImprovementLogsFiltered({ targetId: target.targetId });
    for (const l of list) expect(l.targetId).toBe(target.targetId);
  });
});

describe('computeImprovementLogStats', () => {
  it('returns byTargetType counts and applied/pending split', async () => {
    const stats = await computeImprovementLogStats();
    expect(stats.totalLogs).toBeGreaterThan(0);
    expect(stats.appliedCount + stats.pendingCount).toBe(stats.totalLogs);
  });
});

describe('updateImprovementLog', () => {
  it('preserves id, createdAt on partial patch', async () => {
    const id = genId();
    const created = await createImprovementLog(makeInput({ id }));
    const updated = await updateImprovementLog(id, {
      problem: 'new problem',
      updatedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.problem).toBe('new problem');
  });

  it('re-validates targetId when targetType changes', async () => {
    const prompts = await listPromptVersions();
    expect(prompts.length).toBeGreaterThan(0);
    const id = genId();
    await createImprovementLog(
      makeInput({ id, targetType: 'score_model', targetId: 'opportunity_score_model' }),
    );
    const updated = await updateImprovementLog(id, {
      targetType: 'prompt',
      targetId: prompts[0]!.id,
      updatedAt: MOCK_NOW,
    });
    expect(updated.targetType).toBe('prompt');
    expect(updated.targetId).toBe(prompts[0]!.id);
  });

  it('rejects invalid targetId when targetType changes', async () => {
    const id = genId();
    await createImprovementLog(
      makeInput({ id, targetType: 'score_model', targetId: 'opportunity_score_model' }),
    );
    await expect(
      updateImprovementLog(id, {
        targetType: 'prompt',
        targetId: 'prompt_does_not_exist',
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/Target prompt not found/);
  });

  it('rejects unknown id', async () => {
    await expect(
      updateImprovementLog('imp_does_not_exist', {
        problem: 'x',
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe('deleteImprovementLog', () => {
  it('removes the record', async () => {
    const id = genId();
    await createImprovementLog(makeInput({ id }));
    expect((await getImprovementLog(id))?.id).toBe(id);
    await deleteImprovementLog(id);
    expect(await getImprovementLog(id)).toBeUndefined();
  });

  it('rejects unknown id', async () => {
    await expect(
      deleteImprovementLog('imp_does_not_exist'),
    ).rejects.toThrow(/not found/);
  });
});
