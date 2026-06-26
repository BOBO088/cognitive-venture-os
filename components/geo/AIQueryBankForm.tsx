'use client';

/**
 * AIQueryBankForm — create / edit AI query bank item.
 *
 * 7 个字段：brandEntityId select / query / intent / platform / priority / status / linkedAssetIds。
 * brandEntityId + linkedAssetIds 用 picker（参考 BrandEntityProfileForm 的"Available" 折叠面板）。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  AI_QUERY_BANK_INTENTS,
  AI_QUERY_BANK_INTENT_LABEL,
  AI_QUERY_BANK_PLATFORMS,
  AI_QUERY_BANK_PLATFORM_LABEL,
  AI_QUERY_BANK_PRIORITIES,
  AI_QUERY_BANK_PRIORITY_LABEL,
  AI_QUERY_BANK_STATUSES,
  AI_QUERY_BANK_STATUS_LABEL,
} from '@/types';
import type {
  AIQueryBankItem,
  BrandEntityProfile,
  GEOContentAsset,
} from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  initial?: AIQueryBankItem;
  onSubmit: (formData: FormData) => Promise<void>;
  mode: 'create' | 'edit';
  /** 给 select / picker 用。 */
  brandProfiles: BrandEntityProfile[];
  contentAssets: GEOContentAsset[];
  /** create 模式用：?brandEntityId= 预填。 */
  defaultBrandEntityId?: string;
  defaultLinkedAssetIds?: string[];
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

export function AIQueryBankForm({
  initial,
  onSubmit,
  mode,
  brandProfiles,
  contentAssets,
  defaultBrandEntityId,
  defaultLinkedAssetIds,
  onDelete,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // linkedAssetIds: textarea → JSON array
    data.set(
      'linkedAssetIds',
      JSON.stringify(textareaToList((data.get('linkedAssetIds') as string) ?? '')),
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
      !window.confirm('Delete this AI query bank item?')
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
  const initialLinked = initial?.linkedAssetIds ?? defaultLinkedAssetIds ?? [];

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
            — pick a brand profile —
          </option>
          {brandProfiles.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.category}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="query" className={labelClass}>
          Query (natural-language question) <span className="text-danger">*</span>
        </label>
        <textarea
          id="query"
          name="query"
          required
          rows={2}
          maxLength={500}
          defaultValue={initial?.query ?? ''}
          placeholder="e.g. what is generative engine optimization"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="intent" className={labelClass}>
            Intent <span className="text-danger">*</span>
          </label>
          <select
            id="intent"
            name="intent"
            required
            defaultValue={initial?.intent ?? 'informational'}
            className={inputClass}
          >
            {AI_QUERY_BANK_INTENTS.map((i) => (
              <option key={i} value={i}>
                {AI_QUERY_BANK_INTENT_LABEL[i]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="platform" className={labelClass}>
            Platform <span className="text-danger">*</span>
          </label>
          <select
            id="platform"
            name="platform"
            required
            defaultValue={initial?.platform ?? 'chatgpt'}
            className={inputClass}
          >
            {AI_QUERY_BANK_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {AI_QUERY_BANK_PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="priority" className={labelClass}>
            Priority <span className="text-danger">*</span>
          </label>
          <select
            id="priority"
            name="priority"
            required
            defaultValue={initial?.priority ?? 'medium'}
            className={inputClass}
          >
            {AI_QUERY_BANK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {AI_QUERY_BANK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className={labelClass}>
            Status <span className="text-danger">*</span>
          </label>
          <select
            id="status"
            name="status"
            required
            defaultValue={initial?.status ?? 'active'}
            className={inputClass}
          >
            {AI_QUERY_BANK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {AI_QUERY_BANK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="linkedAssetIds" className={labelClass}>
          Linked content assets (one id per line)
        </label>
        <textarea
          id="linkedAssetIds"
          name="linkedAssetIds"
          rows={3}
          defaultValue={listToTextarea(initialLinked)}
          placeholder={'asset_xxx'}
          className={inputClass + ' font-mono text-xs'}
        />
        <details className="text-[10px] text-muted">
          <summary className="cursor-pointer hover:text-text">
            Available content assets ({contentAssets.length})
          </summary>
          <ul className="mt-1 ml-3 flex flex-col gap-0.5 font-mono text-[10px] max-h-40 overflow-auto">
            {contentAssets.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    const ta = document.getElementById(
                      'linkedAssetIds',
                    ) as HTMLTextAreaElement | null;
                    if (!ta) return;
                    if (
                      ta.value
                        .split('\n')
                        .map((s) => s.trim())
                        .includes(a.id)
                    )
                      return;
                    ta.value = ta.value
                      ? `${ta.value.replace(/\n+$/, '')}\n${a.id}`
                      : a.id;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                  }}
                  className="hover:text-accent text-left"
                >
                  {a.id} — {a.title}
                </button>
              </li>
            ))}
          </ul>
        </details>
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
              ? 'Save query'
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
