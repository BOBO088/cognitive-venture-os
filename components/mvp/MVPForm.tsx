'use client';

/**
 * MVPForm — create / edit MVPProject.
 *
 * Stage / opportunity / owner / 财务字段 + 立项 / 上线日期 + 复盘。
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MVP_STAGE_LABEL, MVP_STAGES } from '@/types';
import type { MVPProject, MVPStage } from '@/types';

interface OppOption {
  id: string;
  title: string;
  status: string;
}

interface Props {
  initial?: MVPProject;
  opportunities: OppOption[];
  submitLabel: string;
  formAction: (formData: FormData) => Promise<void>;
  preselectOpportunityId?: string;
  /** form id for client-side validation hooks */
  formId?: string;
}

export function MVPForm({
  initial,
  opportunities,
  submitLabel,
  formAction,
  preselectOpportunityId,
  formId,
}: Props) {
  const [stage, setStage] = useState<MVPStage>(initial?.stage ?? 'idea');
  const [revenue, setRevenue] = useState<string>(
    initial?.revenue != null ? String(initial.revenue) : '0',
  );
  const [cost, setCost] = useState<string>(
    initial?.cost != null ? String(initial.cost) : '0',
  );

  const showLaunchDate =
    stage === 'launched' || stage === 'revenue' || stage === 'killed';

  return (
    <form
      id={formId}
      action={formAction}
      className="flex flex-col gap-4 max-w-3xl"
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="opportunityId" className="text-xs text-muted">
            Source opportunity <span className="text-danger">*</span>
          </label>
          <select
            id="opportunityId"
            name="opportunityId"
            required
            defaultValue={initial?.opportunityId ?? preselectOpportunityId ?? ''}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            <option value="" disabled>— pick an opportunity —</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title} ({o.status})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="stage" className="text-xs text-muted">
            Stage <span className="text-danger">*</span>
          </label>
          <select
            id="stage"
            name="stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as MVPStage)}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            {MVP_STAGES.map((s) => (
              <option key={s} value={s}>{MVP_STAGE_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs text-muted">
          Name <span className="text-danger">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          defaultValue={initial?.name}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          placeholder="e.g. GEO Pulse, CiteBoost"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-xs text-muted">
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={1}
          maxLength={4000}
          rows={3}
          defaultValue={initial?.description}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          placeholder="What is being built, who is it for, what does success look like?"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="owner" className="text-xs text-muted">
            Owner <span className="text-danger">*</span>
          </label>
          <input
            id="owner"
            name="owner"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.owner}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            placeholder="founder_1 / team / role"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-xs text-muted">
            Start date <span className="text-danger">*</span>
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={initial?.startDate}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="launchDate" className="text-xs text-muted">
            Launch date{' '}
            <span className="text-muted/70">
              ({showLaunchDate ? 'required' : 'optional'})
            </span>
          </label>
          <input
            id="launchDate"
            name="launchDate"
            type="date"
            defaultValue={initial?.launchDate ?? ''}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="revenue" className="text-xs text-muted">
            Revenue (cumulative)
          </label>
          <input
            id="revenue"
            name="revenue"
            type="number"
            min={0}
            step="0.01"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text tabular-nums focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cost" className="text-xs text-muted">
            Cost (cumulative)
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text tabular-nums focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="lessons" className="text-xs text-muted">
          Lessons (复盘)
        </label>
        <textarea
          id="lessons"
          name="lessons"
          maxLength={4000}
          rows={3}
          defaultValue={initial?.lessons}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          placeholder="What worked, what didn't, what to try next time."
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary">{submitLabel}</Button>
      </div>
    </form>
  );
}
