/**
 * Mock AuthProvider — demo 模式专用。
 *
 * 行为：
 *   - 三个硬编码用户：owner@demo / editor@demo / viewer@demo，密码统一 'demo'
 *   - session 存 HTTP-only cookie 'cv_session'，值 = base64(JSON(user))
 *   - 24 小时后过期
 *   - signIn 失败抛 Error('Invalid email or password')
 *
 * 限制（明确告知）：
 *   - 密码明文比对（demo 而已，**不**用于生产）
 *   - cookie 不签名（demo 而已，**不**用于生产）
 *   - 没有 refresh / token rotation
 *
 * 切到生产：APP_MODE=production + SUPABASE_* 配齐 → 走 real/auth.ts。
 */

import { cookies } from 'next/headers';
import {
  ROLE_RANK,
  type AuthProvider,
  type AuthSession,
  type AuthUser,
  type SignInInput,
  type UserRole,
} from '../auth';

const COOKIE_NAME = 'cv_session';
const COOKIE_MAX_AGE_SEC = 24 * 60 * 60; // 24h
const PASSWORD = 'demo';

const MOCK_USERS: ReadonlyArray<Omit<AuthUser, 'source'>> = [
  { id: 'mock_owner',   email: 'owner@demo.local',   name: 'Demo Owner',   role: 'owner' },
  { id: 'mock_editor',  email: 'editor@demo.local',  name: 'Demo Editor',  role: 'editor' },
  { id: 'mock_viewer',  email: 'viewer@demo.local',  name: 'Demo Viewer',  role: 'viewer' },
];

function encode(user: AuthUser): string {
  return Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
}

function decode(raw: string): AuthUser | null {
  try {
    const obj = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof obj?.id === 'string' &&
      typeof obj?.email === 'string' &&
      typeof obj?.role === 'string' &&
      ['owner', 'editor', 'viewer'].includes(obj.role)
    ) {
      return { ...obj, source: 'mock' as const };
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function createMockAuthProvider(): AuthProvider {
  return {
    name: 'MockAuthProvider',

    async health() {
      return { ok: true, detail: 'mock — 3 hardcoded users (password: demo)' };
    },

    async getCurrentUser(): Promise<AuthUser | null> {
      const jar = await cookies();
      const raw = jar.get(COOKIE_NAME)?.value;
      if (!raw) return null;
      return decode(raw);
    },

    async signIn(input: SignInInput): Promise<AuthSession> {
      const email = input.email.trim().toLowerCase();
      const user = MOCK_USERS.find((u) => u.email === email);
      if (!user || input.password !== PASSWORD) {
        throw new Error('Invalid email or password');
      }
      const session: AuthUser = { ...user, source: 'mock' };
      const jar = await cookies();
      jar.set(COOKIE_NAME, encode(session), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE_SEC,
        // secure: 仅 https —— Vercel 强制 https，所以 demo 站点也能用
        secure: process.env.NODE_ENV === 'production',
      });
      return {
        user: session,
        expiresAt: new Date(Date.now() + COOKIE_MAX_AGE_SEC * 1000).toISOString(),
      };
    },

    async signOut(): Promise<void> {
      const jar = await cookies();
      jar.delete(COOKIE_NAME);
    },

    hasRole(user: AuthUser | null, requiredRole: UserRole): boolean {
      if (!user) return false;
      return ROLE_RANK[user.role] >= ROLE_RANK[requiredRole];
    },
  };
}

/** 测试 / login 页面用：返回硬编码用户列表（不含密码）。 */
export function listMockUsers(): ReadonlyArray<Omit<AuthUser, 'source'>> {
  return MOCK_USERS;
}
