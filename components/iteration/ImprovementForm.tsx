'use client';

/**
 * ImprovementForm — create / edit improvement log.
 *
 * 5 个字段：targetType select / targetId (free text) / problem / suggestion / result (optional)。
 * targetId 当 type=prompt/loop 时必须指向存在的实体；当 type=score_model/other 时是自由 sentinel。
 *
 * 当传 defaultTargetId 时，targetId 会被预填到 hidden 字段（"v+1 of X" 流程的逆向：用户从某条
 * prompt/loop 详情跳到"记录针对它的改进"，不需要再选一次）。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { IMPROVEMENT_TARGET_TYPES, IMPROVEMENT_TARGET_TYPE_LABEL } from '@/types';
import type { ImprovementLog, ImprovementTargetType } from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: ImprovementLog;
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  defaultTargetId?: string;
  defaultTargetType?: ImprovementTargetType;
  onDelete?: () => Promise<void>;
}

export function ImprovementForm({
  initial,
  onSubmit,
  mode,
  defaultTargetId,
  defaultTargetType,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!data.get('targetId')) {
      setError('Target ID is required.');
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
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this improvement log?')
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

  const initialType: ImprovementTargetType =
    initial?.targetType ?? defaultTargetType ?? 'score_model';
  const initialTargetId = initial?.targetId ?? defaultTargetId ?? '';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="targetType" className={labelClass}>
            Target type <span className="text-danger">*</span>
          </label>
          <select
            id="targetType"
            name="targetType"
            required
            defaultValue={initialType}
            className={inputClass}
          >
            {IMPROVEMENT_TARGET_TYPES.map((t) => (
              <option key={t} value={t}>
                {IMPROVEMENT_TARGET_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <label htmlFor="targetId" className={labelClass}>
            Target ID <span className="text-danger">*</span>
          </label>
          <input
            id="targetId"
            name="targetId"
            type="text"
            required
            maxLength={200}
            defaultValue={initialTargetId}
            placeholder="prompt_xxx / loop_xxx / opportunity_score_model / free sentinel"
            className={inputClass + ' font-mono text-xs'}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="problem" className={labelClass}>
          Problem <span className="text-danger">*</span>
        </label>
        <textarea
          id="problem"
          name="problem"
          required
          rows={3}
          maxLength={4000}
          defaultValue={initial?.problem ?? ''}
          placeholder="What is the symptom / data point / pain?"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="suggestion" className={labelClass}>
          Suggestion <span className="text-danger">*</span>
        </label>
        <textarea
          id="suggestion"
          name="suggestion"
          required
          rows={4}
          maxLength={4000}
          defaultValue={initial?.suggestion ?? ''}
          placeholder="Specific, executable change."
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="result" className={labelClass}>
          Result (optional)
        </label>
        <textarea
          id="result"
          name="result"
          rows={3}
          maxLength={4000}
          defaultValue={initial?.result ?? ''}
          placeholder="Leave empty until suggestion is applied. Then capture: what changed, what was the outcome."
          className={inputClass}
        />
        <p className="text-[10px] text-muted -mt-0.5">
          Empty = pending. Non-empty = applied (status flips to Applied on list).
        </p>
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
              ? 'Save improvement log'
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
