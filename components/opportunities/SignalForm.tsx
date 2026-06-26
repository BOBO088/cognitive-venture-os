'use client';

/**
 * SignalForm — create / edit Signal.
 *
 * confidence 使用 range slider + number input 双向同步（与 RelationForm 一致）。
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SIGNAL_CATEGORIES, CATEGORY_LABEL_MAP } from './SignalCategoryBadge';
import type { Signal, SignalCategory } from '@/types';

interface SignalFormProps {
  /** 编辑模式时传入现有 signal；创建模式省略。 */
  initial?: Signal;
  /** create 模式提交后跳转目标；由 page 注入。 */
  submitLabel: string;
  /** form action：createSignalAction / updateSignalAction。 */
  formAction: (formData: FormData) => Promise<void>;
  /** update 模式需要 id hidden field。 */
  signalId?: string;
}

export function SignalForm({ initial, submitLabel, formAction, signalId }: SignalFormProps) {
  const [confidence, setConfidence] = useState<number>(initial?.confidence ?? 70);
  const [category, setCategory] = useState<SignalCategory>(
    initial?.category ?? 'geo_trend',
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-3xl">
      {signalId && <input type="hidden" name="id" value={signalId} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-xs text-muted">Title <span className="text-danger">*</span></label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={initial?.title}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          placeholder="Brief, specific title for the signal"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-xs text-muted">Category <span className="text-danger">*</span></label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SignalCategory)}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            {SIGNAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL_MAP[c]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="source" className="text-xs text-muted">Source <span className="text-danger">*</span></label>
          <input
            id="source"
            name="source"
            type="text"
            required
            maxLength={500}
            defaultValue={initial?.source}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text font-mono focus:border-accent focus:outline-none"
            placeholder="URL / connector name / manual"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confidence" className="text-xs text-muted">
          Confidence ({confidence}/100) <span className="text-danger">*</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            id="confidence"
            name="confidence"
            type="range"
            min={0}
            max={100}
            step={1}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="flex-1"
            aria-label="confidence 0 to 100"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={confidence}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) {
                setConfidence(Math.max(0, Math.min(100, Math.round(n))));
              }
            }}
            className="w-20 rounded border border-border bg-bg px-2 py-1.5 text-sm text-text tabular-nums text-right focus:border-accent focus:outline-none"
            aria-label="confidence numeric input"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-xs text-muted">Description <span className="text-danger">*</span></label>
        <textarea
          id="description"
          name="description"
          required
          maxLength={4000}
          rows={4}
          defaultValue={initial?.description}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          placeholder="What is observed, why it matters"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="evidence" className="text-xs text-muted">Evidence</label>
        <textarea
          id="evidence"
          name="evidence"
          maxLength={2000}
          rows={3}
          defaultValue={initial?.evidence}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          placeholder="Links, citations, snippets supporting this signal"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="linkedEntityIds" className="text-xs text-muted">
            Linked GraphEntity IDs <span className="text-muted/70">(one per line, optional)</span>
          </label>
          <textarea
            id="linkedEntityIds"
            name="linkedEntityIds"
            rows={3}
            defaultValue={initial?.linkedEntityIds.join('\n')}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text font-mono focus:border-accent focus:outline-none"
            placeholder="ent_anthropic"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="linkedResearchCardIds" className="text-xs text-muted">
            Linked ResearchCard IDs <span className="text-muted/70">(one per line, optional)</span>
          </label>
          <textarea
            id="linkedResearchCardIds"
            name="linkedResearchCardIds"
            rows={3}
            defaultValue={initial?.linkedResearchCardIds.join('\n')}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text font-mono focus:border-accent focus:outline-none"
            placeholder="card_aarw_principle"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary">{submitLabel}</Button>
      </div>
    </form>
  );
}
