'use client';

/**
 * GEOOptimizerForm — 创建一次 GEO 审计。
 *
 * 字段：assetId (select from content assets) + inputType (select from 6)。
 * 通过 server action `runGEOAuditAction` 提交。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  OPTIMIZER_INPUT_TYPES,
  OPTIMIZER_INPUT_TYPE_LABEL,
} from '@/types';
import type {
  ContentAsset,
  OptimizerInputType,
} from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  contentAssets: ContentAsset[];
  onSubmit: (formData: FormData) => Promise<void>;
  defaultAssetId?: string;
}

export function GEOOptimizerForm({
  contentAssets,
  onSubmit,
  defaultAssetId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!data.get('assetId')) {
      setError('Content asset is required.');
      return;
    }
    if (!data.get('inputType')) {
      setError('Input type is required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Audit failed');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-2xl">
      <div className="flex flex-col gap-1">
        <label htmlFor="assetId" className={labelClass}>
          Content asset <span className="text-danger">*</span>
        </label>
        <select
          id="assetId"
          name="assetId"
          required
          defaultValue={defaultAssetId ?? ''}
          className={inputClass}
        >
          <option value="" disabled>
            &mdash; pick a content asset &mdash;
          </option>
          {contentAssets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} &mdash; GEO {a.geoScore}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted">
          Which content asset to audit. The audit pulls the brand profile,
          bank queries, and graph entities linked to this asset.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="inputType" className={labelClass}>
          Input type <span className="text-danger">*</span>
        </label>
        <select
          id="inputType"
          name="inputType"
          required
          defaultValue="article"
          className={inputClass}
        >
          {OPTIMIZER_INPUT_TYPES.map((t: OptimizerInputType) => (
            <option key={t} value={t}>
              {OPTIMIZER_INPUT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-muted">
          Tunes the suggestion template defaults for the type of content
          you&apos;re optimizing.
        </p>
      </div>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Running audit...' : 'Run audit'}
        </Button>
      </div>
    </form>
  );
}
