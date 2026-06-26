'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import type {
  SourceItem,
  SourceType,
  ResearchTopic,
} from '@/types';

const TYPE_OPTIONS: SourceType[] = [
  'article', 'paper', 'video', 'website', 'note', 'report', 'book', 'podcast',
];

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: SourceItem;
  topics: ResearchTopic[];
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  onDelete?: () => Promise<void>;
}

function tagsToString(tags: string[] | undefined): string {
  return (tags ?? []).join(', ');
}

export function SourceForm({ initial, topics, onSubmit, mode, onDelete }: Props) {
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
    if (typeof window !== 'undefined' && !window.confirm('Delete this source?')) {
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
          placeholder="一句话描述这条资料"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className={labelClass}>Type</label>
          <select
            id="type"
            name="type"
            defaultValue={initial?.type ?? 'article'}
            className={inputClass}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="topicId" className={labelClass}>Topic</label>
          <select
            id="topicId"
            name="topicId"
            defaultValue={initial?.topicId ?? ''}
            className={inputClass}
          >
            <option value="">— none —</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="url" className={labelClass}>URL</label>
        <input
          id="url"
          name="url"
          type="url"
          defaultValue={initial?.url}
          placeholder="https://..."
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="summary" className={labelClass}>Summary</label>
        <textarea
          id="summary"
          name="summary"
          rows={3}
          defaultValue={initial?.summary}
          placeholder="一段摘要 / 关键观点"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="credibilityScore" className={labelClass}>Credibility (0-100)</label>
          <input
            id="credibilityScore"
            name="credibilityScore"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={initial?.credibilityScore}
            placeholder="85"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="author" className={labelClass}>Author</label>
          <input
            id="author"
            name="author"
            type="text"
            defaultValue={initial?.author}
            placeholder="发布方 / 作者"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="tags" className={labelClass}>Tags (comma or newline separated)</label>
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={tagsToString(initial?.tags)}
          placeholder="geo, ai-search"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className={labelClass}>Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={initial?.notes}
          placeholder="私人评论 / 思考"
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
          {pending ? 'Saving…' : mode === 'create' ? 'Create source' : 'Save changes'}
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
