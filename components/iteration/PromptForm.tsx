'use client';

/**
 * PromptForm — create / edit prompt version.
 *
 * 6 个字段：name / type select / content textarea / usedFor / score number
 * + 可选 hidden id（edit 模式）。
 * name + type 共同决定 (type, name) 版本号，service 自动管理 version。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { PROMPT_TYPES, PROMPT_TYPE_LABEL } from '@/types';
import type { PromptType, PromptVersion } from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: PromptVersion;
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  /** create 模式用：?promptId=<id> 预填 name/type 去做"v+1" */
  defaultName?: string;
  defaultType?: PromptType;
  onDelete?: () => Promise<void>;
}

export function PromptForm({
  initial,
  onSubmit,
  mode,
  defaultName,
  defaultType,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
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
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this prompt version?')
    ) {
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

  const initialName = initial?.name ?? defaultName ?? '';
  const initialType: PromptType = initial?.type ?? defaultType ?? 'other';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className={labelClass}>
            Name <span className="text-danger">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={200}
            defaultValue={initialName}
            placeholder="e.g. GEO Pulse PRD generator"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className={labelClass}>
            Type <span className="text-danger">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={initialType}
            className={inputClass}
          >
            {PROMPT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROMPT_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content" className={labelClass}>
          Prompt content <span className="text-danger">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={10}
          defaultValue={initial?.content ?? ''}
          placeholder="The actual prompt body sent to the LLM."
          className={inputClass + ' font-mono text-xs'}
        />
        <p className="text-[10px] text-muted -mt-0.5">
          The full prompt template. Service auto-increments version on the
          same (name, type) pair.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="usedFor" className={labelClass}>
            Used for <span className="text-danger">*</span>
          </label>
          <input
            id="usedFor"
            name="usedFor"
            type="text"
            required
            maxLength={1000}
            defaultValue={initial?.usedFor ?? ''}
            placeholder="e.g. mvp_geo_pulse_paid (v2 of PRD gen)"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="score" className={labelClass}>
            Score (0-100)
          </label>
          <input
            id="score"
            name="score"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue={initial?.score ?? ''}
            placeholder="leave empty for unrated"
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending
            ? 'Saving…'
            : mode === 'create'
              ? 'Save prompt version'
              : 'Save changes'}
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
