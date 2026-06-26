'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { bindSignalAction, unbindSignalAction } from '@/app/opportunities/actions';
import type { Signal, SignalCategory } from '@/types';
import { CATEGORY_LABEL_MAP, SIGNAL_CATEGORIES } from '@/components/opportunities/SignalCategoryBadge';

interface Props {
  opportunityId: string;
  boundIds: string[];
  candidates: Signal[];
}

export function OpportunityBindSignalControl({ opportunityId, boundIds, candidates }: Props) {
  const [picked, setPicked] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const boundSet = new Set(boundIds);
  const bound = boundIds
    .map((id) => candidates.find((s) => s.id === id))
    .filter((s): s is Signal => Boolean(s));
  const available = candidates.filter((s) => !boundSet.has(s.id));

  function handleBind() {
    if (!picked) return;
    setError(null);
    start(async () => {
      try {
        await bindSignalAction(opportunityId, picked);
        setPicked('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'bind failed');
      }
    });
  }

  function handleUnbind(id: string) {
    setError(null);
    start(async () => {
      try {
        await unbindSignalAction(opportunityId, id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'unbind failed');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          className="flex-1 min-w-[180px] rounded border border-border bg-bg px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
          aria-label="select signal to bind"
        >
          <option value="">— select a signal —</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({CATEGORY_LABEL_MAP[s.category as SignalCategory] ?? s.category})
            </option>
          ))}
        </select>
        <Button type="button" variant="primary" onClick={handleBind} disabled={!picked || pending}>
          {pending ? 'Binding…' : 'Bind'}
        </Button>
      </div>
      {error && <div className="text-xs text-danger" role="alert">{error}</div>}
      {bound.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {bound.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 text-sm border border-border rounded px-2 py-1.5 bg-panel-2"
            >
              <span className="text-text truncate">
                {s.title}
                <span className="ml-2 text-xs text-muted">
                  ({CATEGORY_LABEL_MAP[s.category as SignalCategory] ?? s.category}, conf {s.confidence})
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleUnbind(s.id)}
                disabled={pending}
                className="text-xs text-muted hover:text-danger shrink-0"
                aria-label={`unbind ${s.title}`}
              >
                Unbind
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-muted">No signals bound yet.</div>
      )}
      {boundIds.length !== bound.length && (
        <div className="text-[10px] text-warn">
          {boundIds.length - bound.length} bound id(s) reference missing signals.
        </div>
      )}
      {/* keep export live to avoid unused warning when SERVICE_CATEGORIES not needed here */}
      <span className="hidden">{SIGNAL_CATEGORIES.length}</span>
    </div>
  );
}
