'use client';

/**
 * BatchGenerateForm — 一次性生成 N 条 AI query bank 草稿并落库。
 *
 * 字段：brandEntityId / intent / platform / count (1-50) / defaultPriority / defaultStatus。
 * 生成逻辑走 mock LLMProvider（在 service 层调用，不在本组件里）。
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
  BrandEntityProfile,
  AIQueryBankIntent,
  AIQueryBankPlatform,
  AIQueryBankPriority,
  AIQueryBankStatus,
} from '@/types';

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent';
const labelClass = 'text-xs uppercase tracking-wider text-muted';

interface Props {
  brandProfiles: BrandEntityProfile[];
  action: (formData: FormData) => Promise<void>;
  defaultBrandEntityId?: string;
}

export function BatchGenerateForm({
  brandProfiles,
  action,
  defaultBrandEntityId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(3);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (!data.get('brandEntityId')) {
      setError('Brand profile is required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await action(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generate failed');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl">
      <p className="text-xs text-muted">
        Generates via mock LLMProvider — produces mock content based on
        brand name + intent + platform. The provider returns a
        <span className="font-mono"> priorityScore </span>
        (0-100) that the service maps to
        <span className="font-mono"> priority </span>
        (&ge;75 urgent, &ge;50 high, &ge;25 medium, else low).
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="batch-brandEntityId" className={labelClass}>
          Brand profile <span className="text-danger">*</span>
        </label>
        <select
          id="batch-brandEntityId"
          name="brandEntityId"
          required
          defaultValue={defaultBrandEntityId ?? ''}
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="batch-intent" className={labelClass}>
            Intent <span className="text-danger">*</span>
          </label>
          <select
            id="batch-intent"
            name="intent"
            required
            defaultValue="informational"
            className={inputClass}
          >
            {AI_QUERY_BANK_INTENTS.map((i: AIQueryBankIntent) => (
              <option key={i} value={i}>
                {AI_QUERY_BANK_INTENT_LABEL[i]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="batch-platform" className={labelClass}>
            Platform <span className="text-danger">*</span>
          </label>
          <select
            id="batch-platform"
            name="platform"
            required
            defaultValue="chatgpt"
            className={inputClass}
          >
            {AI_QUERY_BANK_PLATFORMS.map((p: AIQueryBankPlatform) => (
              <option key={p} value={p}>
                {AI_QUERY_BANK_PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="batch-count" className={labelClass}>
          Count (1-50)
        </label>
        <input
          id="batch-count"
          name="count"
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) {
              setCount(Math.max(1, Math.min(50, Math.floor(n))));
            }
          }}
          className={inputClass}
        />
        <p className="text-[10px] text-muted">
          How many queries to generate in this batch.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="batch-defaultPriority" className={labelClass}>
            Default priority (override)
          </label>
          <select
            id="batch-defaultPriority"
            name="defaultPriority"
            defaultValue="medium"
            className={inputClass}
          >
            {AI_QUERY_BANK_PRIORITIES.map((p: AIQueryBankPriority) => (
              <option key={p} value={p}>
                {AI_QUERY_BANK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted">
            Reserved; the LLM-driven priorityScore is the primary signal.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="batch-defaultStatus" className={labelClass}>
            Default status
          </label>
          <select
            id="batch-defaultStatus"
            name="defaultStatus"
            defaultValue="active"
            className={inputClass}
          >
            {AI_QUERY_BANK_STATUSES.map((s: AIQueryBankStatus) => (
              <option key={s} value={s}>
                {AI_QUERY_BANK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending
            ? `Generating ${count}...`
            : `Generate ${count} quer${count === 1 ? 'y' : 'ies'}`}
        </Button>
      </div>
    </form>
  );
}
