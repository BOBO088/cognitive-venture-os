/**
 * env helper smoke test.
 *
 * 锁定契约：
 *  - 缺省 → appMode='demo'、isDemoMode()=true
 *  - NEXT_PUBLIC_APP_MODE=staging / production → 正确归一化
 *  - DEMO_MODE / NEXT_PUBLIC_DEMO_MODE 旧契约仍生效
 *  - 客户端调 getServerEnv() 抛错
 *  - validateEnv() 按模式返回 error / warning
 *  - assertEnv() 仅在 error 级 issue 抛错
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const ALL_ENV_KEYS = [
  'NEXT_PUBLIC_APP_MODE', 'NEXT_PUBLIC_DEMO_MODE', 'NEXT_PUBLIC_SITE_URL',
  'DEMO_MODE',
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_SEARCH_CONSOLE_CLIENT_ID', 'GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET',
  'GITHUB_TOKEN', 'MCP_SERVERS',
];

beforeEach(() => {
  for (const k of ALL_ENV_KEYS) delete process.env[k];
});

describe('isDemoMode (legacy API)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_APP_MODE;
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it('缺省时 isDemoMode() === true', async () => {
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

describe('getAppMode', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_APP_MODE;
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it('缺省 = demo', async () => {
    const { getAppMode } = await import('./env');
    expect(getAppMode()).toBe('demo');
  });

  it.each([
    ['demo', 'demo'],
    ['staging', 'staging'],
    ['stage', 'staging'],
    ['production', 'production'],
    ['prod', 'production'],
    ['STAGING', 'staging'],
    ['  Production  ', 'production'],
    ['garbage', 'demo'], // 未识别 → 回落 demo
  ])("NEXT_PUBLIC_APP_MODE=%s → getAppMode()=%s", async (raw, expected) => {
    process.env.NEXT_PUBLIC_APP_MODE = raw;
    const { getAppMode } = await import('./env');
    expect(getAppMode()).toBe(expected);
  });
});

describe('getPublicEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_APP_MODE;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.DEMO_MODE;
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
  });

  it('缺省 demo + 空 siteUrl', async () => {
    const { getPublicEnv } = await import('./env');
    const env = getPublicEnv();
    expect(env.appMode).toBe('demo');
    expect(env.demoMode).toBe(true);
    expect(env.siteUrl).toBe('');
  });

  it('NEXT_PUBLIC_SITE_URL 透传', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://cvo.example.com';
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    const { getPublicEnv } = await import('./env');
    const env = getPublicEnv();
    expect(env.appMode).toBe('production');
    expect(env.siteUrl).toBe('https://cvo.example.com');
  });
});

describe('getServerEnv', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('服务端可正常读取', async () => {
    process.env.SUPABASE_URL = 'https://sb.example.com';
    process.env.SUPABASE_ANON_KEY = 'anon-123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk-456';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID = 'gsc-id';
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET = 'gsc-secret';
    const { getServerEnv } = await import('./env');
    const env = getServerEnv();
    expect(env.supabase.url).toBe('https://sb.example.com');
    expect(env.supabase.anonKey).toBe('anon-123');
    expect(env.supabase.serviceRoleKey).toBe('srk-456');
    expect(env.openai.apiKey).toBe('sk-test');
    expect(env.googleSearchConsole.clientId).toBe('gsc-id');
    expect(env.googleSearchConsole.clientSecret).toBe('gsc-secret');
  });

  it('未配时返回空字符串而不是 undefined', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.OPENAI_API_KEY;
    const { getServerEnv } = await import('./env');
    const env = getServerEnv();
    expect(env.supabase.url).toBe('');
    expect(env.supabase.anonKey).toBe('');
    expect(env.openai.apiKey).toBe('');
  });
});

describe('validateEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
    delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('demo 模式：缺所有 env 也通过', async () => {
    process.env.NEXT_PUBLIC_APP_MODE = 'demo';
    const { validateEnv } = await import('./env');
    expect(validateEnv()).toEqual([]);
  });

  it('staging 模式：缺 Supabase → error', async () => {
    process.env.NEXT_PUBLIC_APP_MODE = 'staging';
    const { validateEnv } = await import('./env');
    const issues = validateEnv();
    const errs = issues.filter((i) => i.level === 'error');
    expect(errs.map((e) => e.field)).toEqual(
      expect.arrayContaining(['SUPABASE_URL', 'SUPABASE_ANON_KEY']),
    );
  });

  it('staging 模式：只配 Supabase → OpenAI / GSC 走 warning', async () => {
    process.env.NEXT_PUBLIC_APP_MODE = 'staging';
    process.env.SUPABASE_URL = 'https://sb.example.com';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const { validateEnv } = await import('./env');
    const issues = validateEnv();
    const warnings = issues.filter((i) => i.level === 'warning');
    expect(warnings.map((w) => w.field)).toEqual(
      expect.arrayContaining(['OPENAI_API_KEY', 'GOOGLE_SEARCH_CONSOLE_CLIENT_ID']),
    );
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('production 模式：缺任何关键 env → error', async () => {
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    const { validateEnv } = await import('./env');
    const issues = validateEnv();
    const errs = issues.filter((i) => i.level === 'error');
    expect(errs.length).toBeGreaterThanOrEqual(6);
    expect(errs.map((e) => e.field)).toEqual(
      expect.arrayContaining([
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENAI_API_KEY',
        'GOOGLE_SEARCH_CONSOLE_CLIENT_ID',
        'GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET',
        'NEXT_PUBLIC_SITE_URL',
      ]),
    );
  });

  it('production 模式：全配齐 → 0 issues', async () => {
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    process.env.SUPABASE_URL = 'https://sb';
    process.env.SUPABASE_ANON_KEY = 'a';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk';
    process.env.OPENAI_API_KEY = 'sk';
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID = 'gsc-id';
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET = 'gsc-sec';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://cvo.example.com';
    const { validateEnv } = await import('./env');
    expect(validateEnv()).toEqual([]);
  });
});

describe('assertEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
    delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('demo 模式永过', async () => {
    const { assertEnv } = await import('./env');
    expect(() => assertEnv()).not.toThrow();
  });

  it('production 模式缺 env → 抛 EnvValidationError', async () => {
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    const { assertEnv, EnvValidationError } = await import('./env');
    expect(() => assertEnv()).toThrow(EnvValidationError);
  });

  it('production 模式配齐 → 不抛', async () => {
    process.env.NEXT_PUBLIC_APP_MODE = 'production';
    process.env.SUPABASE_URL = 'a';
    process.env.SUPABASE_ANON_KEY = 'b';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'c';
    process.env.OPENAI_API_KEY = 'd';
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID = 'e';
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET = 'f';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://cvo';
    const { assertEnv } = await import('./env');
    expect(() => assertEnv()).not.toThrow();
  });
});
