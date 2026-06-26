'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { signInAction, quickSignInAction, type LoginFormState } from './actions';
import { isDemoMode } from '@/lib/env';

const initial: LoginFormState = {};

interface Props {
  next: string;
  error?: string;
}

export function LoginForm({ next, error }: Props) {
  const [state, formAction, pending] = useActionState(signInAction, initial);
  const demo = isDemoMode();
  const topError = error ?? state.error;

  return (
    <div className="flex flex-col gap-3">
      {topError && (
        <div className="rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {topError}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder={demo ? 'owner@demo.local' : 'you@example.com'}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-muted">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder={demo ? 'demo' : '••••••••'}
          />
        </label>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {demo && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="text-xs uppercase tracking-wider text-muted">Quick login (demo)</div>
          <div className="grid grid-cols-3 gap-2">
            <form action={quickSignInAction}>
              <input type="hidden" name="role" value="owner" />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="secondary" className="w-full">
                Owner
              </Button>
            </form>
            <form action={quickSignInAction}>
              <input type="hidden" name="role" value="editor" />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="secondary" className="w-full">
                Editor
              </Button>
            </form>
            <form action={quickSignInAction}>
              <input type="hidden" name="role" value="viewer" />
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="secondary" className="w-full">
                Viewer
              </Button>
            </form>
          </div>
          <p className="text-[11px] text-muted">
            Password for all mock users: <code className="text-text">demo</code>
          </p>
        </div>
      )}
    </div>
  );
}
