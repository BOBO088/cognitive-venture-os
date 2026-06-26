/**
 * env helper smoke test.
 *
 * 锁定契约：
 *  - 缺省 DEMO_MODE → isDemoMode() === true
 *  - DEMO_MODE=false → isDemoMode() === false
 *  - DEMO_MODE 接受 'true' / '1' / 'yes'（不区分大小写、首尾空格容错）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('env.demoMode', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('缺省时 isDemoMode() === true', async () => {
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    const { isDemoMode } = await import('./env');
    expect(isDemoMode()).toBe(true);
  });

  it("DEMO_MODE='false' → isDemoMode() === false", async () => {
    process.env.DEMO_MODE = 'false';
    const { isDemoMode } = await import('./env');
    expect(isDemoMode()).toBe(false);
  });

  it.each([
    ['1', true],
    ['YES', true],
    ['True', true],
    ['  true  ', true],
    ['no', false],
    ['0', false],
    ['', false],
  ])('DEMO_MODE=%s → isDemoMode()=%s', async (raw, expected) => {
    process.env.DEMO_MODE = raw;
    const { isDemoMode } = await import('./env');
    expect(isDemoMode()).toBe(expected);
  });
});

describe('env shape', () => {
  it('暴露 supabase / openai / github / mcp / demoMode', async () => {
    const { env } = await import('./env');
    expect(env).toHaveProperty('supabase');
    expect(env).toHaveProperty('openai');
    expect(env).toHaveProperty('github');
    expect(env).toHaveProperty('mcp');
    expect(env).toHaveProperty('demoMode');
  });
});
