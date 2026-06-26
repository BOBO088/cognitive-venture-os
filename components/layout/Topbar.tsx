import { isDemoMode } from '@/lib/env';
import { Badge } from '@/components/ui/Badge';
import { getServerUser } from '@/lib/auth/session';
import { signOutAction } from '@/app/login/actions';

const TONE_BY_ROLE = {
  owner: 'accent' as const,
  editor: 'ok' as const,
  viewer: 'neutral' as const,
};

export async function Topbar() {
  const demo = isDemoMode();
  const user = await getServerUser();

  return (
    <header className="h-12 shrink-0 border-b border-border bg-panel flex items-center px-4 gap-3">
      <div className="text-sm text-muted">Search</div>
      <div className="ml-auto flex items-center gap-3">
        {demo && (
          <Badge tone="warn" className="uppercase">
            Demo mode · mock data
          </Badge>
        )}
        {user ? (
          <>
            <Badge tone={TONE_BY_ROLE[user.role]} className="uppercase">
              {user.role}
            </Badge>
            <div className="text-sm text-text">{user.email}</div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-sm text-muted hover:text-text"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <div className="text-sm text-muted">Not signed in</div>
        )}
      </div>
    </header>
  );
}
