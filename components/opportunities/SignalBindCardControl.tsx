'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { bindCardAction, unbindCardAction } from '@/app/opportunities/signals/actions';
import type { ResearchCard } from '@/types';

interface Props {
  signalId: string;
  /** 已绑定的 card id 列表。 */
  boundIds: string[];
  /** 候选 cards。 */
  candidates: ResearchCard[];
}

export function SignalBindCardControl({ signalId, boundIds, candidates }: Props) {
  const [picked, setPicked] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const boundSet = new Set(boundIds);
  const boundCards = boundIds
    .map((id) => candidates.find((c) => c.id === id))
    .filter((c): c is ResearchCard => Boolean(c));
  const available = candidates.filter((c) => !boundSet.has(c.id));

  function handleBind() {
    if (!picked) return;
    setError(null);
    start(async () => {
      try {
        await bindCardAction(signalId, picked);
        setPicked('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'bind failed');
      }
    });
  }

  function handleUnbind(cardId: string) {
    setError(null);
    start(async () => {
      try {
        await unbindCardAction(signalId, cardId);
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
          aria-label="select research card to bind"
        >
          <option value="">— select a card —</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="primary"
          onClick={handleBind}
          disabled={!picked || pending}
        >
          {pending ? 'Binding…' : 'Bind'}
        </Button>
      </div>
      {error && (
        <div className="text-xs text-danger" role="alert">{error}</div>
      )}
      {boundCards.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {boundCards.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 text-sm border border-border rounded px-2 py-1.5 bg-panel-2"
            >
              <span className="text-text truncate">{c.title}</span>
              <button
                type="button"
                onClick={() => handleUnbind(c.id)}
                disabled={pending}
                className="text-xs text-muted hover:text-danger shrink-0"
                aria-label={`unbind ${c.title}`}
              >
                Unbind
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-muted">No research cards bound yet.</div>
      )}
      {boundIds.length !== boundCards.length && (
        <div className="text-[10px] text-warn">
          {boundIds.length - boundCards.length} bound id(s) reference missing cards.
        </div>
      )}
    </div>
  );
}
