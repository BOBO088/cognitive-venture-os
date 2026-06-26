'use client';

/**
 * OpportunityForm — create / edit Opportunity.
 *
 * AI draft 按钮放在主 <form> **外部**（沿用 CardForm / RelationForm 约定），
 * 通过 ref 读取主表单字段值并写入预填内容。
 */

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { STATUSES, STATUS_LABEL_MAP } from './OpportunityStatusBadge';
import { generateOpportunityDraftAction } from '@/app/opportunities/actions';
import type { Opportunity, OpportunityStatus } from '@/types';
import type { OpportunityDraft } from '@/lib/providers/llm';

interface OpportunityFormProps {
  initial?: Opportunity;
  submitLabel: string;
  formAction: (formData: FormData) => Promise<void>;
  signalId?: string;
}

export function OpportunityForm({
  initial,
  submitLabel,
  formAction,
  signalId,
}: OpportunityFormProps) {
  const [status, setStatus] = useState<OpportunityStatus>(initial?.status ?? 'draft');
  const [pending, start] = useTransition();
  const [draftError, setDraftError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const targetUserRef = useRef<HTMLInputElement>(null);
  const painPointRef = useRef<HTMLTextAreaElement>(null);
  const solutionIdeaRef = useRef<HTMLTextAreaElement>(null);
  const relatedSignalIdsRef = useRef<HTMLTextAreaElement>(null);
  const relatedResearchCardIdsRef = useRef<HTMLTextAreaElement>(null);

  function applyDraft(d: OpportunityDraft) {
    if (titleRef.current) titleRef.current.value = d.title;
    if (descriptionRef.current) descriptionRef.current.value = d.description;
    if (targetUserRef.current) targetUserRef.current.value = d.targetUser;
    if (painPointRef.current) painPointRef.current.value = d.painPoint;
    if (solutionIdeaRef.current) solutionIdeaRef.current.value = d.solutionIdea;
  }

  function handleGenerateDraft() {
    setDraftError(null);
    const signalIds = (relatedSignalIdsRef.current?.value ?? '')
      .split('\n').map((l) => l.trim()).filter(Boolean);
    const cardIds = (relatedResearchCardIdsRef.current?.value ?? '')
      .split('\n').map((l) => l.trim()).filter(Boolean);
    start(async () => {
      try {
        const d = await generateOpportunityDraftAction({ signalIds, researchCardIds: cardIds });
        applyDraft(d);
      } catch (e) {
        setDraftError(e instanceof Error ? e.message : 'draft generation failed');
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* AI draft section — outside main <form> */}
      <div className="rounded border border-dashed border-accent/40 bg-accent/5 p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted">
          <span className="text-text">AI draft</span> — pull current signal/card ids from the
          form below and synthesize a starter draft via the LLM provider.
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleGenerateDraft}
          disabled={pending}
        >
          {pending ? 'Generating…' : 'Generate AI draft'}
        </Button>
      </div>
      {draftError && (
        <div className="text-xs text-danger" role="alert">{draftError}</div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        {initial && <input type="hidden" name="id" value={initial.id} />}
        {signalId && !initial && <input type="hidden" name="preselectSignalId" value={signalId} />}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-xs text-muted">
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={initial?.title}
            ref={titleRef}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-xs text-muted">Status <span className="text-danger">*</span></label>
            <select
              id="status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OpportunityStatus)}
              className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL_MAP[s]}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="targetUser" className="text-xs text-muted">Target user <span className="text-danger">*</span></label>
            <input
              id="targetUser"
              name="targetUser"
              type="text"
              required
              maxLength={500}
              defaultValue={initial?.targetUser}
              ref={targetUserRef}
              className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-xs text-muted">Description <span className="text-danger">*</span></label>
          <textarea
            id="description"
            name="description"
            required
            maxLength={2000}
            rows={3}
            defaultValue={initial?.description}
            ref={descriptionRef}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="painPoint" className="text-xs text-muted">Pain point <span className="text-danger">*</span></label>
          <textarea
            id="painPoint"
            name="painPoint"
            required
            maxLength={2000}
            rows={3}
            defaultValue={initial?.painPoint}
            ref={painPointRef}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="solutionIdea" className="text-xs text-muted">Solution idea <span className="text-danger">*</span></label>
          <textarea
            id="solutionIdea"
            name="solutionIdea"
            required
            maxLength={2000}
            rows={3}
            defaultValue={initial?.solutionIdea}
            ref={solutionIdeaRef}
            className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="relatedSignalIds" className="text-xs text-muted">
              Related Signal IDs <span className="text-muted/70">(one per line)</span>
            </label>
            <textarea
              id="relatedSignalIds"
              name="relatedSignalIds"
              rows={4}
              defaultValue={
                initial?.relatedSignalIds.join('\n') ??
                (signalId ? signalId : '')
              }
              ref={relatedSignalIdsRef}
              className="rounded border border-border bg-bg px-3 py-2 text-sm text-text font-mono focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="relatedResearchCardIds" className="text-xs text-muted">
              Related Card IDs <span className="text-muted/70">(one per line)</span>
            </label>
            <textarea
              id="relatedResearchCardIds"
              name="relatedResearchCardIds"
              rows={4}
              defaultValue={initial?.relatedResearchCardIds.join('\n')}
              ref={relatedResearchCardIdsRef}
              className="rounded border border-border bg-bg px-3 py-2 text-sm text-text font-mono focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="relatedEntityIds" className="text-xs text-muted">
              Related Entity IDs <span className="text-muted/70">(one per line)</span>
            </label>
            <textarea
              id="relatedEntityIds"
              name="relatedEntityIds"
              rows={4}
              defaultValue={initial?.relatedEntityIds.join('\n')}
              className="rounded border border-border bg-bg px-3 py-2 text-sm text-text font-mono focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" variant="primary">{submitLabel}</Button>
        </div>
      </form>
    </div>
  );
}
