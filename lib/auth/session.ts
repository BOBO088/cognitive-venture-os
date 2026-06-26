/**
 * 服务端 session helpers —— RSC / server action / route handler 用。
 *
 * 走 AuthProvider 拿到真用户。不在调用方做 cookie 解析或 SDK 调用。
 *
 * middleware 已经在 edge 验过 cookie 存在性；这里做真正的 user 解析 + role 检查。
 * 401 / 403 时由调用方决定行为：页面可以 redirect，server action 可以 throw。
 */

import { redirect } from 'next/navigation';
import { getAuthProvider, type AuthUser, type UserRole } from '@/lib/providers';

/** RSC / action 用：拿当前用户。未登录返 null（**不** redirect）。 */
export async function getServerUser(): Promise<AuthUser | null> {
  const auth = await getAuthProvider();
  return auth.getCurrentUser();
}

/**
 * RSC / action 用：要求登录，否则重定向到 /login?next=<当前路径>。
 * 用法：
 *   const user = await requireUser('/research/topics/abc');
 */
export async function requireUser(returnTo: string): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) {
    const next = encodeURIComponent(returnTo);
    redirect(`/login?next=${next}`);
  }
  return user;
}

/**
 * 要求至少某个角色，否则 redirect 到 /login（未登录）或 /forbidden（权限不足）。
 * 注：/forbidden 页面本期不实现，暂跳回首页 + 抛错误信息。
 */
export async function requireRole(
  role: UserRole,
  returnTo: string,
): Promise<AuthUser> {
  const user = await requireUser(returnTo);
  const auth = await getAuthProvider();
  if (!auth.hasRole(user, role)) {
    redirect(`/?forbidden=${role}`);
  }
  return user;
}
