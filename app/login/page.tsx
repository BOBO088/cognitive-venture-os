import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/env';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign in · Cognitive Venture OS',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  // 已登录 → 跳到 next 或首页
  const user = await getServerUser();
  if (user) redirect('/');

  const sp = await searchParams;
  const next = sp.next ?? '/';

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-text">Sign in</h1>
          <p className="text-sm text-muted">
            {isDemoMode()
              ? 'Demo mode · use any mock account below or password "demo".'
              : 'Sign in with your Supabase Auth credentials.'}
          </p>
        </div>
        <LoginForm next={next} error={sp.error} />
      </div>
    </div>
  );
}
