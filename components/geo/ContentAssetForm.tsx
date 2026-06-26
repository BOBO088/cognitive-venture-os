'use client';

/**
 * ContentAssetForm — create / edit content asset.
 *
 * 9 个字段：brandEntityId select / title / url / type / summary /
 * targetQueryIds (textarea + picker) / structuredEvidence (textarea) /
 * lastUpdated (date) / geoScore (number 0-100)。
 *
 * 表单约束：
 *   - url 必须是 http(s)
 *   - geoScore 0-100 整数
 *   - targetQueryIds 每项必须指向存在的 AIQueryBankItem
 *   - structuredEvidence 每行一条 claim（source / quote 暂不收集）
 *   - lastUpdated 必填（date input，落地时拼成 ISO 8601 datetime）
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  CONTENT_ASSET_TYPES,
  CONTENT_ASSET_TYPE_LABEL,
} from '@/types';
import type {
  ContentAsset,
  ContentAssetType,
  BrandEntityProfile,
  AIQueryBankItem,
} from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: ContentAsset;
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  brandProfiles: BrandEntityProfile[];
  bankItems: AIQueryBankItem[];
  defaultBrandEntityId?: string;
  defaultTargetQueryIds?: string[];
  onDelete?: () => Promise<void>;
}

function listToTextarea(items: string[] | undefined): string {
  return (items ?? []).join('\n');
}

function textareaToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function evidenceToTextarea(
  ev: ContentAsset['structuredEvidence'] | undefined,
): string {
  if (!ev) return '';
  return ev.map((e) => e.claim).join('\n');
}

function lastUpdatedToInput(iso: string | undefined): string {
  if (!iso) return '';
  // iso = "2026-06-20T10:00:00.000Z" -> "2026-06-20"
  return iso.slice(0, 10);
}

export function ContentAssetForm({
  initial,
  onSubmit,
  mode,
  brandProfiles,
  bankItems,
  defaultBrandEntityId,
  defaultTargetQueryIds,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // targetQueryIds: textarea -> JSON array
    data.set(
      'targetQueryIds',
      JSON.stringify(textareaToList((data.get('targetQueryIds') as string) ?? '')),
    );
    // structuredEvidence: textarea -> JSON array of { claim }
    const claims = textareaToList(
      (data.get('structuredEvidence') as string) ?? '',
    );
    data.set(
      'structuredEvidence',
      JSON.stringify(claims.map((claim) => ({ claim }))),
    );
    if (!data.get('brandEntityId')) {
      setError('Brand profile is required.');
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
      !window.confirm('Delete this content asset?')
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

  const initialBrandId = initial?.brandEntityId ?? defaultBrandEntityId ?? '';
  const initialQueries = initial?.targetQueryIds ?? defaultTargetQueryIds ?? [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="brandEntityId" className={labelClass}>
          Brand profile <span className="text-danger">*</span>
        </label>
        <select
          id="brandEntityId"
          name="brandEntityId"
          required
          defaultValue={initialBrandId}
          className={inputClass}
        >
          <option value="" disabled>
            &mdash; pick a brand profile &mdash;
          </option>
          {brandProfiles.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} &mdash; {b.category}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className={labelClass}>
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={initial?.title ?? ''}
            placeholder="The 2026 GEO Playbook"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="url" className={labelClass}>
            URL <span className="text-danger">*</span>
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            defaultValue={initial?.url ?? ''}
            placeholder="https://example.com/..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className={labelClass}>
            Type <span className="text-danger">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={initial?.type ?? 'blog_post'}
            className={inputClass}
          >
            {CONTENT_ASSET_TYPES.map((t: ContentAssetType) => (
              <option key={t} value={t}>
                {CONTENT_ASSET_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="geoScore" className={labelClass}>
            GEO score (0-100) <span className="text-danger">*</span>
          </label>
          <input
            id="geoScore"
            name="geoScore"
            type="number"
            min={0}
            max={100}
            step={1}
            required
            defaultValue={initial?.geoScore ?? 50}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="summary" className={labelClass}>
          Summary <span className="text-danger">*</span>
        </label>
        <textarea
          id="summary"
          name="summary"
          required
          rows={3}
          maxLength={1000}
          defaultValue={initial?.summary ?? ''}
          placeholder="1-2 sentences describing the asset."
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="lastUpdated" className={labelClass}>
          Content last updated <span className="text-danger">*</span>
        </label>
        <input
          id="lastUpdated"
          name="lastUpdated"
          type="date"
          required
          defaultValue={lastUpdatedToInput(initial?.lastUpdated) || '2026-06-25'}
          className={inputClass}
        />
        <p className="text-[10px] text-muted">
          When the content itself was last refreshed (independent of when
          this record was edited).
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="targetQueryIds" className={labelClass}>
          Target AI queries (one id per line)
        </label>
        <textarea
          id="targetQueryIds"
          name="targetQueryIds"
          rows={3}
          defaultValue={listToTextarea(initialQueries)}
          placeholder={'bank_xxx'}
          className={inputClass + ' font-mono text-xs'}
        />
        <details className="text-[10px] text-muted">
          <summary className="cursor-pointer hover:text-text">
            Available bank items ({bankItems.length})
          </summary>
          <ul className="mt-1 ml-3 flex flex-col gap-0.5 font-mono text-[10px] max-h-40 overflow-auto">
            {bankItems.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => {
                    const ta = document.getElementById(
                      'targetQueryIds',
                    ) as HTMLTextAreaElement | null;
                    if (!ta) return;
                    if (
                      ta.value
                        .split('\n')
                        .map((s) => s.trim())
                        .includes(q.id)
                    )
                      return;
                    ta.value = ta.value
                      ? `${ta.value.replace(/\n+$/, '')}\n${q.id}`
                      : q.id;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                  }}
                  className="hover:text-accent text-left"
                >
                  {q.id} &mdash; {q.query}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="structuredEvidence" className={labelClass}>
          Structured evidence (one claim per line)
        </label>
        <textarea
          id="structuredEvidence"
          name="structuredEvidence"
          rows={4}
          defaultValue={evidenceToTextarea(initial?.structuredEvidence)}
          placeholder="A specific, citable claim this asset makes."
          className={inputClass}
        />
        <p className="text-[10px] text-muted">
          Each line becomes a <span className="font-mono">claim</span> entry.
          Source / quote fields are reserved for a later iteration.
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
            ? 'Saving...'
            : mode === 'create'
              ? 'Save asset'
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
