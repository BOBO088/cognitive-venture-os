'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type {
  ResearchTopic,
  ResearchTopicStatus,
  ResearchCategory,
  ResearchPriority,
} from '@/types';

const STATUS_OPTIONS: ResearchTopicStatus[] = ['active', 'completed', 'archived'];
const CATEGORY_OPTIONS: ResearchCategory[] = [
  'ai', 'ip', 'geo', 'short_video', 'saas', 'investment', 'other',
];
const PRIORITY_OPTIONS: ResearchPriority[] = ['low', 'medium', 'high'];

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: ResearchTopic;
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  onDelete?: () => Promise<void>;
}

function tagsToString(tags: string[] | undefined): string {
  return (tags ?? []).join(', ');
}

export function TopicForm({ initial, onSubmit, mode, onDelete }: Props) {
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
    if (typeof window !== 'undefined' && !window.confirm('Delete this topic?')) {
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
          placeholder="一句话描述这个研究主题"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className={labelClass}>Description</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description}
          placeholder="补充上下文、目标"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className={labelClass}>Status</label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? 'active'}
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
          <label htmlFor="category" className={labelClass}>Category</label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? ''}
            className={inputClass}
          >
            <option value="">— none —</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tags" className={labelClass}>Tags (comma or newline separated)</label>
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={tagsToString(initial?.tags)}
          placeholder="tam, q3-2026"
          className={inputClass}
        />
      </div>

      <details className="rounded-md border border-border bg-bg p-3">
        <summary className="text-xs text-muted cursor-pointer">
          高级字段（question / scope）
        </summary>
        <div className="flex flex-col gap-3 mt-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="question" className={labelClass}>Research question</label>
            <input
              id="question"
              name="question"
              type="text"
              defaultValue={initial?.question}
              placeholder="研究的核心问题（自然语言）"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="scope" className={labelClass}>Scope</label>
            <textarea
              id="scope"
              name="scope"
              rows={2}
              defaultValue={initial?.scope}
              placeholder="包含什么 / 不包含什么"
              className={inputClass}
            />
          </div>
        </div>
      </details>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Saving…' : mode === 'create' ? 'Create topic' : 'Save changes'}
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
