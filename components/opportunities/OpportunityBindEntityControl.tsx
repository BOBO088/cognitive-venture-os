'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { bindEntityAction, unbindEntityAction } from '@/app/opportunities/actions';
import type { GraphEntity } from '@/types';

interface Props {
  opportunityId: string;
  boundIds: string[];
  candidates: GraphEntity[];
}

export function OpportunityBindEntityControl({ opportunityId, boundIds, candidates }: Props) {
  const [picked, setPicked] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const boundSet = new Set(boundIds);
  const bound = boundIds
    .map((id) => candidates.find((e) => e.id === id))
    .filter((e): e is GraphEntity => Boolean(e));
  const available = candidates.filter((e) => !boundSet.has(e.id));

  function handleBind() {
    if (!picked) return;
    setError(null);
    start(async () => {
      try {
        await bindEntityAction(opportunityId, picked);
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
        await unbindEntityAction(opportunityId, id);
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
          aria-label="select graph entity to bind"
        >
          <option value="">— select an entity —</option>
          {available.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.kind})
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
          {bound.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 text-sm border border-border rounded px-2 py-1.5 bg-panel-2"
            >
              <span className="text-text">
                {e.name}
                <span className="ml-2 text-xs text-muted">({e.kind})</span>
              </span>
              <button
                type="button"
                onClick={() => handleUnbind(e.id)}
                disabled={pending}
                className="text-xs text-muted hover:text-danger shrink-0"
                aria-label={`unbind ${e.name}`}
              >
                Unbind
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-muted">No entities bound yet.</div>
      )}
      {boundIds.length !== bound.length && (
        <div className="text-[10px] text-warn">
          {boundIds.length - bound.length} bound id(s) reference missing entities.
        </div>
      )}
    </div>
  );
}
