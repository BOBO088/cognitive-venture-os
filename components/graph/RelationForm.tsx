'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { RelationTypeBadge } from './RelationTypeBadge';
import { RELATION_KINDS, KIND_LABEL_MAP } from './RelationTypeBadge';
import type { GraphRelation, GraphEntity, GraphRelationKind } from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface EntityOption {
  id: string;
  name: string;
  kind: GraphEntity['kind'];
}

interface Props {
  initial?: GraphRelation;
  entities: EntityOption[];
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  onDelete?: () => Promise<void>;
}

function linkedCardsToMultiline(arr: string[] | undefined): string {
  return (arr ?? []).join('\n');
}

export function RelationForm({ initial, entities, onSubmit, mode, onDelete }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [strength, setStrength] = useState<number>(initial?.strength ?? 50);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const source = data.get('sourceEntityId');
    const target = data.get('targetEntityId');
    if (!source) { setError('Source entity is required.'); return; }
    if (!target) { setError('Target entity is required.'); return; }
    if (source === target) { setError('Source and target must be different (self-loop).'); return; }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this relation?')) {
      return;
    }
    startTransition(async () => {
      try {
        await onDelete();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-col gap-1">
        <label htmlFor="relationType" className={labelClass}>Type</label>
        <select
          id="relationType"
          name="relationType"
          defaultValue={initial?.relationType ?? 'competes_with'}
          className={inputClass}
        >
          {RELATION_KINDS.map((k: GraphRelationKind) => (
            <option key={k} value={k}>{KIND_LABEL_MAP[k]}</option>
          ))}
        </select>
        <div className="text-xs text-muted mt-1">
          预览：<RelationTypeBadge relationType={(initial?.relationType ?? 'competes_with') as GraphRelationKind} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="sourceEntityId" className={labelClass}>Source entity</label>
          <select
            id="sourceEntityId"
            name="sourceEntityId"
            required
            defaultValue={initial?.sourceEntityId ?? ''}
            className={inputClass}
          >
            <option value="">— pick a source entity —</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.id})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="targetEntityId" className={labelClass}>Target entity</label>
          <select
            id="targetEntityId"
            name="targetEntityId"
            required
            defaultValue={initial?.targetEntityId ?? ''}
            className={inputClass}
          >
            <option value="">— pick a target entity —</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="strength" className={labelClass}>
          Strength ({strength}/100)
        </label>
        <input
          id="strength"
          name="strength"
          type="range"
          min={0}
          max={100}
          step={1}
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={strength}
            onChange={(e) => setStrength(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            className={`${inputClass} w-24 tabular-nums`}
            aria-label="Strength numeric input"
          />
          <span className="text-xs text-muted">0 = 弱, 100 = 强</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="evidence" className={labelClass}>Evidence (optional)</label>
        <textarea
          id="evidence"
          name="evidence"
          rows={3}
          defaultValue={initial?.evidence}
          placeholder="支撑该关系的证据（自然语言描述或 URL）"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="linkedResearchCardIds" className={labelClass}>
          Linked research card IDs (one per line, manual)
        </label>
        <textarea
          id="linkedResearchCardIds"
          name="linkedResearchCardIds"
          rows={2}
          defaultValue={linkedCardsToMultiline(initial?.linkedResearchCardIds)}
          placeholder="card_geo_definition"
          className={`${inputClass} font-mono text-xs`}
        />
        <div className="text-xs text-muted">
          手动管理：也可以在详情页用 Bind 控件添加。
        </div>
      </div>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Saving…' : mode === 'create' ? 'Create relation' : 'Save changes'}
        </Button>
        {mode === 'edit' && onDelete && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={handleDelete}
            className="text-danger"
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
