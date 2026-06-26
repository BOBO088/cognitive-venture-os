'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type { Task, TaskStatus, TaskPriority, TaskPhase, TestResult } from '@/types';

const STATUS_OPTIONS: TaskStatus[] = ['backlog', 'doing', 'review', 'done', 'failed'];
const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const PHASE_OPTIONS: TaskPhase[] = ['research', 'scout', 'build', 'launch', 'learn'];

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: Task;
  /** 提交到 server action 的回调。 */
  onSubmit: (formData: FormData) => Promise<void>;
  /** 是否处于编辑模式（影响 title 字段是否锁定 + 删除按钮）。 */
  mode: 'create' | 'edit';
  /** 删除回调，仅 edit 模式使用。 */
  onDelete?: () => Promise<void>;
}

function changedFilesToString(files: string[] | undefined): string {
  return (files ?? []).join('\n');
}

function testResultToString(tr: TestResult | undefined): string {
  if (!tr) return '';
  if (tr.total > 0 || tr.passed > 0) {
    return `${tr.passed}/${tr.total}`;
  }
  return tr.summary ?? '';
}

export function TaskForm({ initial, onSubmit, mode, onDelete }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (mode === 'create' && !data.get('title')) {
      setError('Title is required.');
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
    if (typeof window !== 'undefined' && !window.confirm('Delete this task?')) {
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
        <label htmlFor="title" className={labelClass}>Title</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          placeholder="一句话描述这个任务"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className={labelClass}>Description</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description}
          placeholder="补充上下文、目标、范围"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className={labelClass}>Status</label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? 'backlog'}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="priority" className={labelClass}>Priority</label>
          <select
            id="priority"
            name="priority"
            defaultValue={initial?.priority ?? 'medium'}
            className={inputClass}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="phase" className={labelClass}>Phase</label>
          <select
            id="phase"
            name="phase"
            defaultValue={initial?.phase ?? ''}
            className={inputClass}
          >
            <option value="">— none —</option>
            {PHASE_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="codexCommand" className={labelClass}>Codex command</label>
        <input
          id="codexCommand"
          name="codexCommand"
          type="text"
          defaultValue={initial?.codexCommand}
          placeholder="例如：npm run build"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="changedFiles" className={labelClass}>Changed files (one per line)</label>
        <textarea
          id="changedFiles"
          name="changedFiles"
          rows={3}
          defaultValue={changedFilesToString(initial?.changedFiles)}
          placeholder={'app/tasks/page.tsx\nlib/repos/tasks.ts'}
          className={`${inputClass} font-mono text-xs`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="testResult" className={labelClass}>Test result (passed/total)</label>
          <input
            id="testResult"
            name="testResult"
            type="text"
            defaultValue={testResultToString(initial?.testResult)}
            placeholder="3/3"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="failureReason" className={labelClass}>Failure reason</label>
          <input
            id="failureReason"
            name="failureReason"
            type="text"
            defaultValue={initial?.failureReason}
            placeholder="status=failed 时回填"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reviewNotes" className={labelClass}>Review notes</label>
        <textarea
          id="reviewNotes"
          name="reviewNotes"
          rows={3}
          defaultValue={initial?.reviewNotes}
          placeholder="复盘结论 / 下一步行动"
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
          {pending ? 'Saving…' : mode === 'create' ? 'Create task' : 'Save changes'}
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
