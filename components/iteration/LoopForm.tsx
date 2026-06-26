'use client';

/**
 * LoopForm — create / edit loop version.
 *
 * 5 个字段：name / steps (newline-separated) / stopCondition / evaluationCriteria / score。
 * steps 通过换行分隔：每行一个 step（service trim + 校验 1-200 字符）。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type { LoopVersion } from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: LoopVersion;
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  /** create 模式用：?loopId=<id> 预填 name 去做"v+1" */
  defaultName?: string;
  onDelete?: () => Promise<void>;
}

function stepsToTextarea(steps: string[] | undefined): string {
  return (steps ?? []).join('\n');
}

function textareaToSteps(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function LoopForm({
  initial,
  onSubmit,
  mode,
  defaultName,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // steps 走 hidden 字段把 newline 字符串转回数组
    const stepsRaw = (data.get('steps') as string | null) ?? '';
    const steps = textareaToSteps(stepsRaw);
    if (steps.length === 0) {
      setError('At least one step is required.');
      return;
    }
    data.set('steps', JSON.stringify(steps));
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
      !window.confirm('Delete this loop version?')
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
  const initialStepsText = stepsToTextarea(initial?.steps);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}

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
          placeholder="e.g. Weekly review loop"
          className={inputClass}
        />
        <p className="text-[10px] text-muted -mt-0.5">
          Service auto-increments version on the same name.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="steps" className={labelClass}>
          Steps <span className="text-danger">*</span>
        </label>
        <textarea
          id="steps"
          name="steps"
          required
          rows={6}
          defaultValue={initialStepsText}
          placeholder={'one step per line, e.g.\nGather launch metrics\nScore each launch\nWrite retro for failed launches\nUpdate scoring weights'}
          className={inputClass + ' font-mono text-xs'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="stopCondition" className={labelClass}>
            Stop condition <span className="text-danger">*</span>
          </label>
          <textarea
            id="stopCondition"
            name="stopCondition"
            required
            rows={3}
            maxLength={2000}
            defaultValue={initial?.stopCondition ?? ''}
            placeholder="When does this loop terminate?"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="evaluationCriteria" className={labelClass}>
            Evaluation criteria <span className="text-danger">*</span>
          </label>
          <textarea
            id="evaluationCriteria"
            name="evaluationCriteria"
            required
            rows={3}
            maxLength={2000}
            defaultValue={initial?.evaluationCriteria ?? ''}
            placeholder="How do you judge each loop iteration?"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 max-w-xs">
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
              ? 'Save loop version'
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
