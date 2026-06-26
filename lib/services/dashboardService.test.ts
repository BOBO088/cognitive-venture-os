/**
 * DashboardService smoke test.
 *
 * 锁定契约：
 *  - stats 永远返回 7 个域（按固定顺序）
 *  - providers 永远返回 15 条（5 provider + 10 connector）
 *  - recent 永远 <= 8 条，按 updatedAt desc
 */
import { describe, it, expect } from 'vitest';
import { getDashboardSnapshot } from './dashboardService';

describe('dashboardService.getDashboardSnapshot', () => {
  it('returns 7 domain stats in fixed order', async () => {
    const snap = await getDashboardSnapshot();
    expect(snap.stats).toHaveLength(7);
    const keys = snap.stats.map((s) => s.key);
    expect(keys).toEqual([
      'research',
      'graph',
      'opportunities',
      'mvp',
      'geo',
      'learning',
      'codex',
    ]);
  });

  it('every stat has a valid href and non-negative count', async () => {
    const snap = await getDashboardSnapshot();
    for (const s of snap.stats) {
      expect(s.href).toMatch(/^\//);
      expect(s.count).toBeGreaterThanOrEqual(0);
      expect(s.label).toBeTruthy();
    }
  });

  it('aggregates 15 provider/connector health entries', async () => {
    const snap = await getDashboardSnapshot();
    expect(snap.providers).toHaveLength(15);
  });

  it('recent items sorted by updatedAt desc and capped at 8', async () => {
    const snap = await getDashboardSnapshot();
    expect(snap.recent.length).toBeGreaterThan(0);
    expect(snap.recent.length).toBeLessThanOrEqual(8);
    for (let i = 0; i < snap.recent.length - 1; i++) {
      expect(snap.recent[i]!.updatedAt >= snap.recent[i + 1]!.updatedAt).toBe(true);
    }
  });

  it('every recent item has id / domain / title / href / updatedAt', async () => {
    const snap = await getDashboardSnapshot();
    for (const r of snap.recent) {
      expect(r.id).toBeTruthy();
      expect(r.domain).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(r.href).toMatch(/^\//);
      expect(r.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});
