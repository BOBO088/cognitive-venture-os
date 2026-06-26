'use client';

/**
 * LaunchResultForm — create / edit launch result.
 *
 * 13 个字段：date + 6 个数字 + 1 textarea + 1 status select + mvpProjectId。
 * 数字字段 signups/users/traffic/revenue 接受整数（HTML input type=number min=0）；
 * 百分比字段 conversionRate / retentionRate 接受小数（step=0.1）。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { LAUNCH_RESULT_STATUSES, LAUNCH_RESULT_STATUS_LABEL } from '@/types';
import type {
  LaunchResult,
  LaunchResultStatus,
  MVPProject,
} from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: LaunchResult;
  /** 提交到 server action 的回调。 */
  onSubmit: (formData: FormData) => Promise<void>;
  /** create 或 edit 模式。 */
  mode: 'create' | 'edit';
  /** 可选 MVP 项目列表（create 模式必填；edit 模式可改 mvp 关联）。 */
  mvpProjects: MVPProject[];
  /** 默认选中的 MVP（new 页用 ?projectId=… 预填）。 */
  defaultMvpProjectId?: string;
  /** 删除回调，仅 edit 模式使用。 */
  onDelete?: () => Promise<void>;
}

export function LaunchResultForm({
  initial,
  onSubmit,
  mode,
  mvpProjects,
  defaultMvpProjectId,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (mode === 'create' && !data.get('mvpProjectId')) {
      setError('MVP project is required.');
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
    if (typeof window !== 'undefined' && !window.confirm('Delete this launch result?')) {
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

  const defaultStatus: LaunchResultStatus = initial?.resultStatus ?? 'unknown';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="mvpProjectId" className={labelClass}>
            MVP project <span className="text-danger">*</span>
          </label>
          <select
            id="mvpProjectId"
            name="mvpProjectId"
            required
            defaultValue={initial?.mvpProjectId ?? defaultMvpProjectId ?? ''}
            className={inputClass}
          >
            <option value="" disabled>— pick an MVP project —</option>
            {mvpProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.stage}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="launchDate" className={labelClass}>
            Launch date <span className="text-danger">*</span>
          </label>
          <input
            id="launchDate"
            name="launchDate"
            type="date"
            required
            defaultValue={initial?.launchDate ?? '2026-06-25'}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="users" className={labelClass}>
            Users (total reach)
          </label>
          <input
            id="users"
            name="users"
            type="number"
            min="0"
            step="1"
            defaultValue={initial?.users ?? 0}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="signups" className={labelClass}>
            Signups
          </label>
          <input
            id="signups"
            name="signups"
            type="number"
            min="0"
            step="1"
            defaultValue={initial?.signups ?? 0}
            placeholder="0"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="traffic" className={labelClass}>
            Traffic (PV / sessions)
          </label>
          <input
            id="traffic"
            name="traffic"
            type="number"
            min="0"
            step="1"
            defaultValue={initial?.traffic ?? 0}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="revenue" className={labelClass}>
            Revenue (cumulative)
          </label>
          <input
            id="revenue"
            name="revenue"
            type="number"
            min="0"
            step="1"
            defaultValue={initial?.revenue ?? 0}
            placeholder="0"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="conversionRate" className={labelClass}>
            Conversion rate (%)
          </label>
          <input
            id="conversionRate"
            name="conversionRate"
            type="number"
            min="0"
            max="100"
            step="0.1"
            defaultValue={initial?.conversionRate ?? 0}
            placeholder="0.0"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="retentionRate" className={labelClass}>
            7-day retention (%)
          </label>
          <input
            id="retentionRate"
            name="retentionRate"
            type="number"
            min="0"
            max="100"
            step="0.1"
            defaultValue={initial?.retentionRate ?? 0}
            placeholder="0.0"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="resultStatus" className={labelClass}>
          Result status
        </label>
        <select
          id="resultStatus"
          name="resultStatus"
          defaultValue={defaultStatus}
          className={inputClass}
        >
          {LAUNCH_RESULT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LAUNCH_RESULT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted -mt-0.5">
          Auto-inferred from metrics if left at &quot;Unknown&quot; during creation.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="feedbackSummary" className={labelClass}>
          Feedback summary
        </label>
        <textarea
          id="feedbackSummary"
          name="feedbackSummary"
          rows={4}
          defaultValue={initial?.feedbackSummary ?? ''}
          placeholder="What did users say? What surprised you? What would you change?"
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
              ? 'Record launch'
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
