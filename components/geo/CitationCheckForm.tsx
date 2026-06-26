'use client';

/**
 * CitationCheckForm — 创建一次 AI 引用检查。
 *
 * 字段：queryId (select) + platform (select) + checkedAt (datetime-local)。
 * 提交后调 `runCitationCheckAction`。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  CITATION_PLATFORMS,
  CITATION_PLATFORM_LABEL,
} from '@/types';
import type { AIQueryBankItem, CitationPlatform } from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  bankItems: AIQueryBankItem[];
  onSubmit: (formData: FormData) => Promise<void>;
  defaultQueryId?: string;
  defaultPlatform?: CitationPlatform;
}

function isoToDatetimeLocal(iso: string | undefined): string {
  if (!iso) return '';
  // "2026-06-25T12:00:00.000Z" -> "2026-06-25T12:00"
  return iso.slice(0, 16);
}

function datetimeLocalToIso(v: string | undefined): string {
  if (!v) return '';
  // "2026-06-25T12:00" -> "2026-06-25T12:00:00.000Z"
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v ?? '';
  return `${v}:00.000Z`;
}

export function CitationCheckForm({
  bankItems,
  onSubmit,
  defaultQueryId,
  defaultPlatform,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!data.get('queryId')) {
      setError('Query is required.');
      return;
    }
    if (!data.get('platform')) {
      setError('Platform is required.');
      return;
    }
    if (!data.get('checkedAt')) {
      setError('Checked-at time is required.');
      return;
    }
    // checkedAt = "2026-06-25T12:00" -> ISO
    const dt = String(data.get('checkedAt') ?? '');
    const iso = datetimeLocalToIso(dt);
    data.set('checkedAt', iso);
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Check failed');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-2xl">
      <div className="flex flex-col gap-1">
        <label htmlFor="queryId" className={labelClass}>
          Monitoring query <span className="text-danger">*</span>
        </label>
        <select
          id="queryId"
          name="queryId"
          required
          defaultValue={defaultQueryId ?? ''}
          className={inputClass}
        >
          <option value="" disabled>
            &mdash; pick a query &mdash;
          </option>
          {bankItems.map((q) => (
            <option key={q.id} value={q.id}>
              {q.query}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted">
          Which monitoring question this check answers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="platform" className={labelClass}>
            Platform <span className="text-danger">*</span>
          </label>
          <select
            id="platform"
            name="platform"
            required
            defaultValue={defaultPlatform ?? 'chatgpt'}
            className={inputClass}
          >
            {CITATION_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {CITATION_PLATFORM_LABEL[p as CitationPlatform]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="checkedAt" className={labelClass}>
            Checked at <span className="text-danger">*</span>
          </label>
          <input
            id="checkedAt"
            name="checkedAt"
            type="datetime-local"
            required
            defaultValue={isoToDatetimeLocal('2026-06-25T12:00:00.000Z')}
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
          {pending ? 'Running check...' : 'Run check'}
        </Button>
      </div>
    </form>
  );
}
