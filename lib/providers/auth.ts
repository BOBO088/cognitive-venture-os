/**
 * AuthProvider — 用户认证与角色检查的唯一入口。
 *
 * 三种用户角色：owner / editor / viewer。
 *   - owner   ：全部权限（含删除、写、admin）
 *   - editor  ：写权限（创建 / 编辑）
 *   - viewer  ：只读
 *
 * 应用代码（页面 / API / server action）通过本文件的工厂函数获取实现：
 *   import { getAuthProvider } from '@/lib/providers';
 *   const auth = await getAuthProvider();
 *   const user = await auth.getCurrentUser();
 *
 * 派发逻辑：
 *   - APP_MODE='demo'（或不设）                          → mock 实现（硬编码用户 + cookie session）
 *   - APP_MODE ∈ {staging, production} 且 supabase 配齐  → supabase 实现（@supabase/ssr）
 *   - staging/production 但 supabase 没配齐               → mock（fallback，warn）
 *
 * 禁止：
 *   - 在 UI / RSC / server action 里直接 import '@supabase/ssr' 或 '@supabase/supabase-js'
 *   - 自己写 JWT 校验 / cookie 解析逻辑
 */

import { getAppMode, isSupabaseConfigured } from '@/lib/env';
import { createMockAuthProvider } from './mock/auth';

/** 三种角色，权限范围 owner > editor > viewer。 */
export type UserRole = 'owner' | 'editor' | 'viewer';

export const ROLE_RANK: Record<UserRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

/** 已登录用户。id 来自 Supabase auth.users.id（mock 时是 'mock_<email>'）。 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  /** Supabase auth 时 = 'supabase'；mock 时 = 'mock'。用于 debug。 */
  source: 'mock' | 'supabase';
}

export interface AuthSession {
  user: AuthUser;
  /** ISO 8601，session 过期时间。 */
  expiresAt: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthProvider {
  name: string;
  health(): Promise<{ ok: boolean; detail?: string }>;

  /**
   * 读取当前 session 里的用户。middleware 已经验过 cookie 存在性，
   * 这里做真正的 token 验证。失败返 null（**不抛**，让上层决定要不要跳登录）。
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * 登录。失败抛 Error，message 是给登录页 toast 用的。
   * mock 模式：email 必须是硬编码用户之一。
   * supabase 模式：转发到 supabase.auth.signInWithPassword。
   */
  signIn(input: SignInInput): Promise<AuthSession>;

  /** 登出。清 cookie + 清 supabase session。 */
  signOut(): Promise<void>;

  /**
   * 角色检查。null user 永远 false。
   * 用 ROLE_RANK 做等级比较：requiredRole='editor' 时 owner 和 editor 都过。
   */
  hasRole(user: AuthUser | null, requiredRole: UserRole): boolean;
}

// ---------- 工厂 ----------

let _auth: AuthProvider | null = null;

export async function getAuthProvider(): Promise<AuthProvider> {
  if (_auth) return _auth;
  const mode = getAppMode();
  const configured = isSupabaseConfigured();
  if ((mode === 'staging' || mode === 'production') && configured) {
    // 动态 import 避免在 demo 模式拉 supabase 客户端
    const { createSupabaseAuthProvider } = await import('./real/auth');
    _auth = createSupabaseAuthProvider();
  } else {
    _auth = createMockAuthProvider();
  }
  return _auth;
}

/** 测试用：清缓存。 */
export function _resetAuthProvider(): void {
  _auth = null;
}
