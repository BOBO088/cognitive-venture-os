/**
 * Real AuthProvider — Supabase Auth 实现。
 *
 * 仅在 APP_MODE ∈ {staging, production} 且 SUPABASE_URL + SUPABASE_ANON_KEY
 * 配齐时被加载（dispatch 在 auth.ts 工厂里）。demo 模式永远走 mock/auth.ts。
 *
 * 行为：
 *   - signIn → supabase.auth.signInWithPassword + 写 HTTP-only cookie
 *   - getCurrentUser → 用 cookies 创建 server client + supabase.auth.getUser()
 *   - signOut → supabase.auth.signOut + 清 cookie
 *   - role 从 user.app_metadata.role 读，缺省 'viewer'（保守默认）
 *
 * 注意：
 *   - @supabase/ssr 的 createServerClient 在 server action / route handler / RSC 里都可用
 *   - middleware 里用 getSession() 而不是 getUser()，因为 edge 跑 JWT 解码不做网络；
 *     但本文件在 server runtime 跑，getUser() 安全
 *   - cookie name 跟 mock 一样 'cv_session'，保持 middleware 检查一致
 */

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getServerEnv } from '@/lib/env';
import {
  ROLE_RANK,
  type AuthProvider,
  type AuthSession,
  type AuthUser,
  type SignInInput,
  type UserRole,
} from '../auth';

const COOKIE_NAME = 'cv_session';
const COOKIE_MAX_AGE_SEC = 24 * 60 * 60;

function mapRole(raw: unknown): UserRole {
  if (raw === 'owner' || raw === 'editor') return raw;
  return 'viewer';
}

async function buildClient() {
  const env = getServerEnv();
  const jar = await cookies();
  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(toSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          for (const { name, value, options } of toSet) {
            jar.set(name, value, options);
          }
        } catch {
          // RSC 里 set cookie 会抛（cookie jar 只读），忽略 —— middleware 会负责刷新
        }
      },
    },
  });
}

export function createSupabaseAuthProvider(): AuthProvider {
  return {
    name: 'SupabaseAuthProvider',

    async health() {
      const env = getServerEnv();
      return {
        ok: Boolean(env.supabase.url && env.supabase.anonKey),
        detail: `supabase url=${env.supabase.url ? 'set' : 'missing'}`,
      };
    },

    async getCurrentUser(): Promise<AuthUser | null> {
      try {
        const sb = await buildClient();
        const { data, error } = await sb.auth.getUser();
        if (error || !data.user) return null;
        const u = data.user;
        const role = mapRole(u.app_metadata?.role ?? u.user_metadata?.role);
        return {
          id: u.id,
          email: u.email ?? '',
          name: (u.user_metadata?.name as string | undefined) ?? undefined,
          role,
          source: 'supabase',
        };
      } catch {
        return null;
      }
    },

    async signIn(input: SignInInput): Promise<AuthSession> {
      const sb = await buildClient();
      const { data, error } = await sb.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });
      if (error || !data.user || !data.session) {
        throw new Error(error?.message ?? 'Sign-in failed');
      }
      const jar = await cookies();
      jar.set(COOKIE_NAME, data.user.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE_SEC,
        secure: process.env.NODE_ENV === 'production',
      });
      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email ?? '',
        name: (data.user.user_metadata?.name as string | undefined) ?? undefined,
        role: mapRole(data.user.app_metadata?.role ?? data.user.user_metadata?.role),
        source: 'supabase',
      };
      return {
        user,
        expiresAt: new Date(Date.now() + COOKIE_MAX_AGE_SEC * 1000).toISOString(),
      };
    },

    async signOut(): Promise<void> {
      try {
        const sb = await buildClient();
        await sb.auth.signOut();
      } catch {
        // 即便 supabase 远程登出失败也要清本地 cookie
      }
      const jar = await cookies();
      jar.delete(COOKIE_NAME);
    },

    hasRole(user: AuthUser | null, requiredRole: UserRole): boolean {
      if (!user) return false;
      return ROLE_RANK[user.role] >= ROLE_RANK[requiredRole];
    },
  };
}
