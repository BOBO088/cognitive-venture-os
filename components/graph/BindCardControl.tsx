'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';

interface CardOption {
  id: string;
  title: string;
  topicId: string;
}

interface Props {
  entityId: string;
  available: CardOption[];
  onBind: (cardId: string) => Promise<void>;
  onUnbind: (cardId: string) => Promise<void>;
  boundIds: string[];
}

export function BindCardControl({ entityId, available, onBind, onUnbind, boundIds }: Props) {
  const [pending, startTransition] = useTransition();
  const [pickedId, setPickedId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const bound = new Set(boundIds);
  const candidates = available.filter((c) => !bound.has(c.id));

  const handleBind = () => {
    if (!pickedId) return;
    setError(null);
    startTransition(async () => {
      try {
        await onBind(pickedId);
        setPickedId('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bind failed');
      }
    });
  };

  const handleUnbind = (cardId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await onUnbind(cardId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbind failed');
      }
    });
  };

  return (
    <div className="flex flex-col gap-2" data-entity-id={entityId}>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={pickedId}
          onChange={(e) => setPickedId(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
        >
          <option value="">
            {candidates.length === 0 ? '— no more cards to bind —' : '— pick a card to bind —'}
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.id})
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          onClick={handleBind}
          disabled={pending || !pickedId}
        >
          {pending ? '…' : 'Bind'}
        </Button>
      </div>
      {error && (
        <div className="text-xs text-danger">{error}</div>
      )}
      {boundIds.length > 0 && (
        <ul className="flex flex-col gap-1 mt-1">
          {boundIds.map((cid) => {
            const meta = available.find((c) => c.id === cid);
            return (
              <li
                key={cid}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-text flex-1 truncate">
                  {meta?.title ?? cid}{' '}
                  <span className="text-muted font-mono text-xs">{cid}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => handleUnbind(cid)}
                  className="text-danger text-xs"
                >
                  Unbind
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
