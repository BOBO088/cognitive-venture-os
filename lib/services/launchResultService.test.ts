/**
 * launchResultService 单元测试。
 *
 * 覆盖：
 *  - createLaunchResult 拒绝：缺失 mvpProjectId / 错日期 / 负数 / 百分比越界
 *  - createLaunchResult 未指定 resultStatus 时按阈值自动推断
 *  - listLaunchResultsByMVP 按 launchDate 升序返回
 *  - updateLaunchResult 部分 patch 保留 id / createdAt
 *  - deleteLaunchResult 成功删除
 *  - create + read round-trip
 *  - computeLaunchResultStats 聚合
 */

import { describe, it, expect } from 'vitest';
import {
  createLaunchResult,
  getLaunchResult,
  listLaunchResults,
  listLaunchResultsByMVP,
  updateLaunchResult,
  deleteLaunchResult,
  computeLaunchResultStats,
  LaunchResultServiceError,
} from './launchResultService';
import { listMVPProjects } from './mvpProjectService';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function genId(): string {
  return `result_test_${Math.random().toString(36).slice(2, 8)}`;
}

async function pickExistingMvpId(): Promise<string> {
  const projects = await listMVPProjects();
  expect(projects.length).toBeGreaterThan(0);
  return projects[0]!.id;
}

describe('createLaunchResult', () => {
  it('persists a launch result with auto-inferred resultStatus (success)', async () => {
    const mvpProjectId = await pickExistingMvpId();
    const id = genId();
    const created = await createLaunchResult({
      id,
      mvpProjectId,
      launchDate: '2026-06-25',
      users: 1000,
      signups: 60,
      revenue: 1500,
      traffic: 5000,
      conversionRate: 6,
      retentionRate: 35,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(created.id).toBe(id);
    expect(created.mvpProjectId).toBe(mvpProjectId);
    expect(created.resultStatus).toBe('success');
  });

  it('auto-infers failed when conversion < 1', async () => {
    const mvpProjectId = await pickExistingMvpId();
    const created = await createLaunchResult({
      id: genId(),
      mvpProjectId,
      launchDate: '2026-06-25',
      users: 1000,
      signups: 5,
      revenue: 0,
      traffic: 1000,
      conversionRate: 0.5,
      retentionRate: 30,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(created.resultStatus).toBe('failed');
  });

  it('auto-infers unknown when signups=0 and conv=0', async () => {
    const mvpProjectId = await pickExistingMvpId();
    const created = await createLaunchResult({
      id: genId(),
      mvpProjectId,
      launchDate: '2026-06-25',
      users: 0,
      signups: 0,
      revenue: 0,
      traffic: 0,
      conversionRate: 0,
      retentionRate: 0,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(created.resultStatus).toBe('unknown');
  });

  it('honors explicit resultStatus', async () => {
    const mvpProjectId = await pickExistingMvpId();
    const created = await createLaunchResult({
      id: genId(),
      mvpProjectId,
      launchDate: '2026-06-25',
      users: 1000,
      signups: 60,
      revenue: 0,
      traffic: 5000,
      conversionRate: 6,
      retentionRate: 35,
      resultStatus: 'neutral',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    expect(created.resultStatus).toBe('neutral');
  });

  it('rejects missing mvpProjectId', async () => {
    await expect(
      createLaunchResult({
        id: genId(),
        mvpProjectId: '',
        launchDate: '2026-06-25',
        users: 0,
        signups: 0,
        revenue: 0,
        traffic: 0,
        conversionRate: 0,
        retentionRate: 0,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toBeInstanceOf(LaunchResultServiceError);
  });

  it('rejects unknown mvpProjectId', async () => {
    await expect(
      createLaunchResult({
        id: genId(),
        mvpProjectId: 'mvp_does_not_exist',
        launchDate: '2026-06-25',
        users: 0,
        signups: 0,
        revenue: 0,
        traffic: 0,
        conversionRate: 0,
        retentionRate: 0,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/MVP project not found/);
  });

  it('rejects invalid launchDate format', async () => {
    const mvpProjectId = await pickExistingMvpId();
    await expect(
      createLaunchResult({
        id: genId(),
        mvpProjectId,
        launchDate: '2026/06/25',
        users: 0,
        signups: 0,
        revenue: 0,
        traffic: 0,
        conversionRate: 0,
        retentionRate: 0,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/YYYY-MM-DD/);
  });

  it('rejects negative users', async () => {
    const mvpProjectId = await pickExistingMvpId();
    await expect(
      createLaunchResult({
        id: genId(),
        mvpProjectId,
        launchDate: '2026-06-25',
        users: -1,
        signups: 0,
        revenue: 0,
        traffic: 0,
        conversionRate: 0,
        retentionRate: 0,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/users must be ≥ 0/);
  });

  it('rejects conversionRate > 100', async () => {
    const mvpProjectId = await pickExistingMvpId();
    await expect(
      createLaunchResult({
        id: genId(),
        mvpProjectId,
        launchDate: '2026-06-25',
        users: 0,
        signups: 0,
        revenue: 0,
        traffic: 0,
        conversionRate: 120,
        retentionRate: 0,
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/between 0 and 100/);
  });
});

describe('listLaunchResultsByMVP', () => {
  it('returns results sorted by launchDate ascending for the given MVP', async () => {
    const projects = await listMVPProjects();
    const target = projects.find((p) => p.id === 'mvp_signal_radar');
    expect(target).toBeDefined();
    if (!target) return;
    const results = await listLaunchResultsByMVP(target.id);
    expect(results.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.launchDate >= results[i - 1]!.launchDate).toBe(true);
    }
  });
});

describe('updateLaunchResult', () => {
  it('preserves id and createdAt on partial patch', async () => {
    const mvpProjectId = await pickExistingMvpId();
    const id = genId();
    const created = await createLaunchResult({
      id,
      mvpProjectId,
      launchDate: '2026-06-25',
      users: 100,
      signups: 5,
      revenue: 0,
      traffic: 500,
      conversionRate: 5,
      retentionRate: 30,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    const updated = await updateLaunchResult(id, {
      users: 200,
      updatedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.users).toBe(200);
    expect(updated.updatedAt).toBe('2026-06-26T12:00:00.000Z');
  });

  it('rejects unknown id', async () => {
    await expect(
      updateLaunchResult('result_does_not_exist', {
        users: 1,
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe('deleteLaunchResult', () => {
  it('removes the record from the store', async () => {
    const mvpProjectId = await pickExistingMvpId();
    const id = genId();
    await createLaunchResult({
      id,
      mvpProjectId,
      launchDate: '2026-06-25',
      users: 0,
      signups: 0,
      revenue: 0,
      traffic: 0,
      conversionRate: 0,
      retentionRate: 0,
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    const before = await getLaunchResult(id);
    expect(before?.id).toBe(id);
    await deleteLaunchResult(id);
    const after = await getLaunchResult(id);
    expect(after).toBeUndefined();
  });
});

describe('round-trip', () => {
  it('create + read returns the persisted record', async () => {
    const mvpProjectId = await pickExistingMvpId();
    const id = genId();
    await createLaunchResult({
      id,
      mvpProjectId,
      launchDate: '2026-06-25',
      users: 250,
      signups: 12,
      revenue: 800,
      traffic: 1000,
      conversionRate: 4.8,
      retentionRate: 25,
      feedbackSummary: 'round-trip test',
      createdAt: MOCK_NOW,
      updatedAt: MOCK_NOW,
    });
    const fetched = await getLaunchResult(id);
    expect(fetched?.id).toBe(id);
    expect(fetched?.mvpProjectId).toBe(mvpProjectId);
    expect(fetched?.users).toBe(250);
    expect(fetched?.feedbackSummary).toBe('round-trip test');
  });
});

describe('computeLaunchResultStats', () => {
  it('aggregates counts and totals', async () => {
    const all = await listLaunchResults();
    const stats = await computeLaunchResultStats(all);
    expect(stats.totalLaunches).toBe(all.length);
    expect(
      stats.successCount +
        stats.neutralCount +
        stats.failedCount +
        stats.unknownCount,
    ).toBe(stats.totalLaunches);
    let totalRevenue = 0;
    let totalSignups = 0;
    for (const r of all) {
      totalRevenue += r.revenue;
      totalSignups += r.signups;
    }
    expect(stats.totalRevenue).toBe(totalRevenue);
    expect(stats.totalSignups).toBe(totalSignups);
  });
});
