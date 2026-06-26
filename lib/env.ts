/**
 * 集中读取 + 校验环境变量。
 * MVP 阶段不阻塞启动，只在缺失时打 warn；接入真实 provider 后改成抛错。
 *
 * DEMO_MODE 默认 = 'true'：
 *   - Demo 部署（Vercel / 自托管演示）下不接真实 SDK，所有 provider / connector 走 mock
 *   - 接入真实 provider 时把 DEMO_MODE 设为 'false' 并配齐 env key
 *   - 这个变量决定 isDemoMode() 的返回值，provider 工厂目前不直接读它
 *     （目前默认就是 mock，env key 缺失时自动走 mock），但 UI 用它展示 "Demo mode" 标识
 */

/** 解析 boolean-style env：'true'/'1'/'yes' → true，其他 → false。 */
function flag(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export const env = {
  /**
   * Demo 模式开关。
   *  - 'true' / 缺省  → Demo：所有 provider / connector 走 mock
   *  - 'false'         → 真实模式：env key 必须配齐，provider 工厂未来会读这个 flag
   *
   * Vercel 部署时建议在 Environment Variables 显式设为 'true'。
   */
  demoMode: (() => {
    const raw = process.env.DEMO_MODE ?? process.env.NEXT_PUBLIC_DEMO_MODE ?? 'true';
    return flag(raw);
  })(),

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
  },
  github: {
    token: process.env.GITHUB_TOKEN ?? '',
  },
  mcp: {
    serversEnv: process.env.MCP_SERVERS ?? '',
  },
} as const;

/** 当前是否在 Demo 模式。 */
export function isDemoMode(): boolean {
  return env.demoMode;
}

export function warnMissingIntegrations(): string[] {
  const missing: string[] = [];
  if (!env.supabase.url || !env.supabase.anonKey) missing.push('supabase');
  if (!env.openai.apiKey) missing.push('openai');
  if (!env.github.token) missing.push('github');
  if (!env.mcp.serversEnv) missing.push('mcp');
  return missing;
}
