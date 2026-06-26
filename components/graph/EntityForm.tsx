'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { ENTITY_KINDS, KIND_LABEL_MAP } from './EntityTypeBadge';
import type { GraphEntity, GraphEntityKind } from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: GraphEntity;
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  onDelete?: () => Promise<void>;
}

function aliasesToMultiline(arr: string[] | undefined): string {
  return (arr ?? []).join('\n');
}

function tagsToCsv(arr: string[] | undefined): string {
  return (arr ?? []).join(', ');
}

function metadataToMultiline(meta: Record<string, string | number | boolean> | undefined): string {
  if (!meta) return '';
  return Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n');
}

export function EntityForm({ initial, onSubmit, mode, onDelete }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!data.get('name')) {
      setError('Name is required.');
      return;
    }
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
    if (typeof window !== 'undefined' && !window.confirm('Delete this entity?')) {
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
      <div className="grid grid-cols-[1fr_200px] gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className={labelClass}>Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initial?.name}
            placeholder="实体名"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="kind" className={labelClass}>Type</label>
          <select
            id="kind"
            name="kind"
            defaultValue={initial?.kind ?? 'company'}
            className={inputClass}
          >
            {ENTITY_KINDS.map((k: GraphEntityKind) => (
              <option key={k} value={k}>{KIND_LABEL_MAP[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className={labelClass}>Description</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description}
          placeholder="一段话说清楚这个实体是什么"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="aliases" className={labelClass}>Aliases (one per line)</label>
        <textarea
          id="aliases"
          name="aliases"
          rows={2}
          defaultValue={aliasesToMultiline(initial?.aliases)}
          placeholder="拼写变体 / 缩写 / 旧名"
          className={`${inputClass} font-mono text-xs`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tags" className={labelClass}>Tags (comma or newline separated)</label>
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={tagsToCsv(initial?.tags)}
          placeholder="ai-search, llm, geo"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="metadata" className={labelClass}>
          Metadata (key: value, one per line)
        </label>
        <textarea
          id="metadata"
          name="metadata"
          rows={3}
          defaultValue={metadataToMultiline(initial?.metadata)}
          placeholder={'country: US\nfounded: 2022'}
          className={`${inputClass} font-mono text-xs`}
        />
      </div>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Saving…' : mode === 'create' ? 'Create entity' : 'Save changes'}
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
