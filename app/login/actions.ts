'use server';

import { redirect } from 'next/navigation';
import { getAuthProvider } from '@/lib/providers';
import { isDemoMode } from '@/lib/env';

export interface LoginFormState {
  error?: string;
}

export async function signInAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/') || '/';

  if (!email) return { error: 'Email is required' };
  if (!password) return { error: 'Password is required' };

  const auth = await getAuthProvider();
  try {
    await auth.signIn({ email, password });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Sign-in failed' };
  }
  // 登录成功 → 跳到 next（防止 open redirect，限定相对路径）
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  redirect(safeNext);
}

/**
 * Demo 模式专用：用户点 "Quick login as owner" 这种按钮直接拿 mock 用户登录。
 * 非 demo 模式下按钮不渲染（见 LoginForm），但 server action 仍然 defend 一层。
 */
export async function quickSignInAction(formData: FormData): Promise<void> {
  if (!isDemoMode()) {
    redirect('/login?error=demo_only');
  }
  const role = String(formData.get('role') ?? '');
  const email =
    role === 'owner' ? 'owner@demo.local'
    : role === 'editor' ? 'editor@demo.local'
    : role === 'viewer' ? 'viewer@demo.local'
    : '';
  const next = String(formData.get('next') ?? '/') || '/';
  if (!email) redirect('/login?error=invalid_role');

  const auth = await getAuthProvider();
  try {
    await auth.signIn({ email, password: 'demo' });
  } catch (e) {
    redirect(`/login?error=${encodeURIComponent(e instanceof Error ? e.message : 'failed')}`);
  }
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  redirect(safeNext);
}

export async function signOutAction(): Promise<void> {
  const auth = await getAuthProvider();
  await auth.signOut();
  redirect('/login');
}
