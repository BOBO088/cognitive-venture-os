/**
 * 集中读取 + 校验环境变量。
 *
 * 三种模式（由 NEXT_PUBLIC_APP_MODE 决定）：
 *   - demo       缺省；所有 provider / connector 走 mock，所有 server env 可空
 *   - staging    Supabase 必填，OpenAI / Google Search Console 可空（warn）
 *   - production Supabase + OpenAI + Google Search Console 全必填，NEXT_PUBLIC_SITE_URL 必填
 *
 * Public env（NEXT_PUBLIC_*）走 getPublicEnv()，可被 client 引用。
 * Server env（SUPABASE_* / OPENAI_* / GOOGLE_* 等）走 getServerEnv()，**严禁在 'use client' 文件里 import**。
 * 主动调用 getServerEnv() 会在客户端抛错（typeof window 守卫）。
 *
 * 兼容旧契约：
 *   - DEMO_MODE / NEXT_PUBLIC_DEMO_MODE 仍然能被识别（覆盖到 isDemoMode()）
 *   - isDemoMode() 仍然是 boolean，Topbar / 测试还在用
 */

/** 解析 boolean-style env：'true' / '1' / 'yes' → true，其他 → false。 */
function flag(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** 把任意输入归一化到 'demo' | 'staging' | 'production'。未识别一律 'demo'。 */
function normalizeAppMode(raw: string | undefined): AppMode {
  const v = (raw ?? 'demo').trim().toLowerCase();
  if (v === 'production' || v === 'prod') return 'production';
  if (v === 'staging' || v === 'stage') return 'staging';
  return 'demo';
}

export type AppMode = 'demo' | 'staging' | 'production';

/** Public env shape —— 客户端可安全嵌入。 */
export interface PublicEnv {
  appMode: AppMode;
  demoMode: boolean;
  siteUrl: string;
}

/** Server env shape —— 严禁在 client bundle 出现。 */
export interface ServerEnv {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  openai: {
    apiKey: string;
  };
  googleSearchConsole: {
    clientId: string;
    clientSecret: string;
  };
  legacy: {
    githubToken: string;
    mcpServers: string;
  };
}

export type EnvIssueLevel = 'error' | 'warning';

export interface EnvIssue {
  level: EnvIssueLevel;
  field: string;
  message: string;
}

// ===== Public env (always safe) =====

/** 当前 app 模式。缺省 'demo'。 */
export function getAppMode(): AppMode {
  return normalizeAppMode(process.env.NEXT_PUBLIC_APP_MODE);
}

/**
 * 是否在 demo 模式。
 * 优先级：
 *   1. NEXT_PUBLIC_APP_MODE='staging' / 'production' → 强制 false
 *   2. DEMO_MODE 显式设了 → 用它的值
 *   3. NEXT_PUBLIC_DEMO_MODE 显式设了 → 用它的值
 *   4. 否则 → true（demo 是缺省模式）
 * Topbar / 测试还在依赖这个 API。
 */
export function isDemoMode(): boolean {
  const mode = getAppMode();
  if (mode === 'staging' || mode === 'production') return false;
  if (process.env.DEMO_MODE !== undefined) return flag(process.env.DEMO_MODE);
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== undefined) return flag(process.env.NEXT_PUBLIC_DEMO_MODE);
  return true;
}

/** 是否在 production 模式。 */
export function isProduction(): boolean {
  return getAppMode() === 'production';
}

/**
 * 当前 supabase env 是否配齐（server-side url + service role key）。
 * 仅 server 可用（getServerEnv 在 client 会抛）；client 想判断 demo 模式用 isDemoMode()。
 */
export function isSupabaseConfigured(): boolean {
  if (typeof window !== 'undefined') return false;
  const srv = getServerEnv();
  return Boolean(srv.supabase.url && srv.supabase.serviceRoleKey);
}

/**
 * 当前 OpenAI env 是否配齐（server-side api key）。
 * 仅 server 可用（getServerEnv 在 client 会抛）；client 想判断 demo 模式用 isDemoMode()。
 */
export function isOpenAIConfigured(): boolean {
  if (typeof window !== 'undefined') return false;
  const srv = getServerEnv();
  return Boolean(srv.openai.apiKey);
}

/** 获取所有 public env。可在 client / server 都用。 */
export function getPublicEnv(): PublicEnv {
  return {
    appMode: getAppMode(),
    demoMode: isDemoMode(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
  };
}

// ===== Server env (server-only) =====

/**
 * 客户端调用会抛错（typeof window 守卫）。
 * 仅在 Server Components / Route Handlers / Server Actions / instrumentation.ts 里用。
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getServerEnv() called on client. Server env is not available in the browser bundle. ' +
        'Move this call to a server component, route handler, or server action.',
    );
  }
  return {
    supabase: {
      url: process.env.SUPABASE_URL ?? '',
      anonKey: process.env.SUPABASE_ANON_KEY ?? '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
    },
    googleSearchConsole: {
      clientId: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET ?? '',
    },
    legacy: {
      githubToken: process.env.GITHUB_TOKEN ?? '',
      mcpServers: process.env.MCP_SERVERS ?? '',
    },
  };
}

// ===== Validation =====

/**
 * 校验当前模式下 env 是否合规。
 * - demo 模式：永远返回 []（mock 一切就绪）
 * - staging 模式：Supabase 必填（error），OpenAI / Google Search Console 选填（warning）
 * - production 模式：Supabase + OpenAI + Google Search Console + NEXT_PUBLIC_SITE_URL 全部必填（error）
 *
 * 客户端调用只看 public 维度的 issues（server env 不在 client bundle 里看得到）；
 * server 端调用看全部。
 */
export function validateEnv(): EnvIssue[] {
  const mode = getAppMode();
  const issues: EnvIssue[] = [];
  const isServer = typeof window === 'undefined';
  const srv = isServer ? getServerEnv() : null;
  const pub = getPublicEnv();

  if (mode === 'demo') return issues;

  if (mode === 'staging') {
    if (srv && !srv.supabase.url)
      issues.push({ level: 'error', field: 'SUPABASE_URL', message: 'staging 模式需要 Supabase url' });
    if (srv && !srv.supabase.anonKey)
      issues.push({ level: 'error', field: 'SUPABASE_ANON_KEY', message: 'staging 模式需要 Supabase anon key' });
    if (srv && !srv.openai.apiKey)
      issues.push({ level: 'warning', field: 'OPENAI_API_KEY', message: 'OpenAI 未配置，AI 能力会继续走 mock' });
    if (srv && !srv.googleSearchConsole.clientId)
      issues.push({ level: 'warning', field: 'GOOGLE_SEARCH_CONSOLE_CLIENT_ID', message: 'Google Search Console 未配置，GEO citation 监控会继续走 mock' });
    if (srv && !srv.googleSearchConsole.clientSecret)
      issues.push({ level: 'warning', field: 'GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET', message: 'Google Search Console 未配置，GEO citation 监控会继续走 mock' });
    if (srv && !srv.supabase.serviceRoleKey)
      issues.push({ level: 'warning', field: 'SUPABASE_SERVICE_ROLE_KEY', message: '未配 service role key，服务端写操作会被 RLS 拦下' });
    return issues;
  }

  // production
  if (srv && !srv.supabase.url)
    issues.push({ level: 'error', field: 'SUPABASE_URL', message: 'production 模式必须配 Supabase url' });
  if (srv && !srv.supabase.anonKey)
    issues.push({ level: 'error', field: 'SUPABASE_ANON_KEY', message: 'production 模式必须配 Supabase anon key' });
  if (srv && !srv.supabase.serviceRoleKey)
    issues.push({ level: 'error', field: 'SUPABASE_SERVICE_ROLE_KEY', message: 'production 模式必须配 Supabase service role key（服务端写操作需要）' });
  if (srv && !srv.openai.apiKey)
    issues.push({ level: 'error', field: 'OPENAI_API_KEY', message: 'production 模式必须配 OpenAI key，AI 能力才能切到真实模型' });
  if (srv && !srv.googleSearchConsole.clientId)
    issues.push({ level: 'error', field: 'GOOGLE_SEARCH_CONSOLE_CLIENT_ID', message: 'production 模式必须配 Google Search Console client id（citation 监控需要）' });
  if (srv && !srv.googleSearchConsole.clientSecret)
    issues.push({ level: 'error', field: 'GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET', message: 'production 模式必须配 Google Search Console client secret' });
  if (!pub.siteUrl)
    issues.push({ level: 'error', field: 'NEXT_PUBLIC_SITE_URL', message: 'production 模式必须配 canonical site url（用于 OG 标签和绝对链接）' });
  return issues;
}

/**
 * 抛出版本。任何 error 级 issue 会抛 EnvValidationError，warning 不抛。
 * 适合在 instrumentation.ts / server startup 阶段调用。
 */
export class EnvValidationError extends Error {
  readonly issues: EnvIssue[];
  constructor(issues: EnvIssue[]) {
    const errs = issues.filter((i) => i.level === 'error');
    super(
      `Env validation failed (${errs.length} error${errs.length === 1 ? '' : 's'}):\n` +
        errs.map((e) => `  - ${e.field}: ${e.message}`).join('\n'),
    );
    this.issues = issues;
    this.name = 'EnvValidationError';
  }
}

export function assertEnv(): void {
  const issues = validateEnv();
  if (issues.some((i) => i.level === 'error')) {
    throw new EnvValidationError(issues);
  }
}

/** 警告汇总：当前模式下缺少的 env key 列表（仅 warning 级）。 */
export function warnMissingIntegrations(): string[] {
  return validateEnv()
    .filter((i) => i.level === 'warning')
    .map((i) => i.field);
}
