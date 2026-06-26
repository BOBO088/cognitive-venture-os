'use client';

/**
 * EvaluationForm — create an OpportunityEvaluation.
 *
 * 9 个维度使用 range slider + number input 双向同步（沿用 SignalForm / RelationForm 约定）。
 * 提交后由 page 端 server action 写入 + 自动 status 流转。
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SCORING_WEIGHTS, type ScoringDimension } from '@/types';

interface DimConfig {
  dim: ScoringDimension;
  label: string;
  default: number;
  hint: string;
}

const DIMS: DimConfig[] = [
  { dim: 'marketSize', label: 'Market size', default: 60, hint: 'Higher = larger TAM' },
  { dim: 'painIntensity', label: 'Pain intensity', default: 60, hint: 'Higher = more acute pain' },
  { dim: 'competition', label: 'Competition gap', default: 60, hint: 'Higher = LESS competition (inverted polarity)' },
  { dim: 'technicalFeasibility', label: 'Technical feasibility', default: 60, hint: 'Higher = easier to build' },
  { dim: 'monetization', label: 'Monetization', default: 60, hint: 'Higher = cleaner revenue model' },
  { dim: 'speedToMarket', label: 'Speed to market', default: 60, hint: 'Higher = faster to first dollar' },
  { dim: 'founderFit', label: 'Founder fit', default: 60, hint: 'Higher = stronger team fit' },
  { dim: 'geoPotential', label: 'GEO potential', default: 60, hint: 'Higher = stronger AI-search visibility upside' },
  { dim: 'ipPotential', label: 'IP potential', default: 50, hint: 'Higher = stronger IP / moat upside' },
];

interface Props {
  /** 可选 opportunities 列表：id → title */
  opportunities: Array<{ id: string; title: string }>;
  /** 预选 opportunity id（来自 URL ?focus=...） */
  preselectOpportunityId?: string;
  /** form action：createEvaluationAction */
  formAction: (formData: FormData) => Promise<void>;
  submitLabel: string;
  /** 来自 service 的错误（被 server action 抛出） */
  errorMessage?: string;
}

function clampInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function EvaluationForm({
  opportunities,
  preselectOpportunityId,
  formAction,
  submitLabel,
  errorMessage,
}: Props) {
  const [scores, setScores] = useState<Record<ScoringDimension, number>>(() => {
    const init = {} as Record<ScoringDimension, number>;
    for (const d of DIMS) init[d.dim] = d.default;
    return init;
  });

  const setScore = (dim: ScoringDimension, n: number) => {
    setScores((s) => ({ ...s, [dim]: clampInt(n) }));
  };

  // 加权预估（用于显示"如果现在提交会得几分"）
  const total = (() => {
    let t = 0;
    for (const d of DIMS) t += SCORING_WEIGHTS[d.dim] * scores[d.dim];
    return Math.round(t * 10) / 10;
  })();

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="opportunityId" className="text-xs text-muted">
          Opportunity <span className="text-danger">*</span>
        </label>
        <select
          id="opportunityId"
          name="opportunityId"
          required
          defaultValue={preselectOpportunityId ?? ''}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          <option value="" disabled>— pick an opportunity —</option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title} ({o.id})
            </option>
          ))}
        </select>
      </div>

      <div className="rounded border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-xs text-muted flex items-center justify-between gap-3 flex-wrap">
        <span>
          Estimated weighted total: <span className="text-text tabular-nums">{total.toFixed(1)}</span> / 100.
        </span>
        <span className="text-[10px]">
          ≥ 70 → mvp · &lt; 40 → archived (auto on save)
        </span>
      </div>

      {DIMS.map(({ dim, label, default: def, hint }) => (
        <div key={dim} className="flex flex-col gap-1.5">
          <label htmlFor={dim} className="text-xs text-muted flex items-center justify-between">
            <span>
              {label}{' '}
              <span className="text-[10px] text-muted/70">— {hint}</span>
            </span>
            <span className="text-text tabular-nums">{scores[dim]}/100</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              id={dim}
              name={dim}
              type="range"
              min={0}
              max={100}
              step={1}
              value={scores[dim]}
              onChange={(e) => setScore(dim, Number(e.target.value))}
              className="flex-1"
              aria-label={`${label} slider`}
            />
            <input
              type="number"
              min={0}
              max={100}
              value={scores[dim]}
              onChange={(e) => setScore(dim, Number(e.target.value))}
              onBlur={(e) => {
                // 失焦时如果为空 / 越界，回到 def
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) setScore(dim, def);
              }}
              className="w-20 rounded border border-border bg-bg px-2 py-1.5 text-sm text-text tabular-nums text-right focus:border-accent focus:outline-none"
              aria-label={`${label} numeric input`}
            />
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="explanation" className="text-xs text-muted">
          Explanation <span className="text-danger">*</span>
        </label>
        <textarea
          id="explanation"
          name="explanation"
          required
          minLength={1}
          maxLength={2000}
          rows={3}
          placeholder="Why this score? Key drivers, risks, recommended next step."
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        />
      </div>

      {errorMessage && (
        <div className="text-xs text-danger" role="alert">{errorMessage}</div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary">{submitLabel}</Button>
      </div>
    </form>
  );
}

