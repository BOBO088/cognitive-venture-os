'use client';

/**
 * RecordCitationCheckForm — 人工录入一次 AI 引用检查。
 *
 * 与 `CitationCheckForm` 的区别：
 *   - CitationCheckForm：只填 queryId / platform / checkedAt → 调 connector 拿结果
 *   - RecordCitationCheckForm：填完整答案（mentioned / citedUrl / competitorMentions /
 *     answerSummary / geoScore）→ 不调 connector，直接写入
 *
 * 用途：在 Browser MCP / Search API 还没接进来的阶段，让人把 ChatGPT / Perplexity
 * / Gemini / Google AI Overview / Claude 的实际答案沉淀成可追踪数据。
 *
 * 字段顺序按录入心智模型：先选 query / platform / time，再填答案，最后打分。
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
  return iso.slice(0, 16);
}

function datetimeLocalToIso(v: string | undefined): string {
  if (!v) return '';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v ?? '';
  return `${v}:00.000Z`;
}

function splitLines(v: string): string[] {
  return v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function RecordCitationCheckForm({
  bankItems,
  onSubmit,
  defaultQueryId,
  defaultPlatform,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mentioned, setMentioned] = useState(true);
  const [geoScore, setGeoScore] = useState(50);

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
    const dt = String(data.get('checkedAt') ?? '');
    if (!dt) {
      setError('Checked-at time is required.');
      return;
    }
    const summary = String(data.get('answerSummary') ?? '').trim();
    if (summary.length === 0) {
      setError('Answer summary is required.');
      return;
    }
    if (summary.length > 2000) {
      setError('Answer summary must be ≤ 2000 characters.');
      return;
    }

    // 归一化
    data.set('checkedAt', datetimeLocalToIso(dt));
    const compsRaw = String(data.get('competitorMentions') ?? '');
    data.set('competitorMentions', JSON.stringify(splitLines(compsRaw)));
    data.set('mentioned', mentioned ? 'true' : 'false');
    data.set('geoScore', String(geoScore));

    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Record failed');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="rc-queryId" className={labelClass}>
            Monitoring query <span className="text-danger">*</span>
          </label>
          <select
            id="rc-queryId"
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
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rc-platform" className={labelClass}>
            Platform <span className="text-danger">*</span>
          </label>
          <select
            id="rc-platform"
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
          <label htmlFor="rc-checkedAt" className={labelClass}>
            Checked at <span className="text-danger">*</span>
          </label>
          <input
            id="rc-checkedAt"
            name="checkedAt"
            type="datetime-local"
            required
            defaultValue={isoToDatetimeLocal('2026-06-25T12:00:00.000Z')}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="rc-mentioned" className={labelClass}>
            Mentioned target brand?
          </label>
          <div className="flex items-center gap-3 text-sm text-text">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="mentioned-radio"
                checked={mentioned}
                onChange={() => setMentioned(true)}
              />
              <span>Yes</span>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="radio"
                name="mentioned-radio"
                checked={!mentioned}
                onChange={() => setMentioned(false)}
              />
              <span>No</span>
            </label>
          </div>
          <p className="text-[10px] text-muted">
            Did the AI answer mention the target brand by any name?
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rc-citedUrl" className={labelClass}>
            Cited URL
          </label>
          <input
            id="rc-citedUrl"
            name="citedUrl"
            type="url"
            placeholder="https://..."
            className={inputClass}
          />
          <p className="text-[10px] text-muted">
            Optional. URL the AI answer cited (may be 3rd-party).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rc-competitorMentions" className={labelClass}>
          Competitor mentions (one per line)
        </label>
        <textarea
          id="rc-competitorMentions"
          name="competitorMentions"
          rows={3}
          placeholder={'Profound\nOtterly'}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rc-answerSummary" className={labelClass}>
          Answer summary <span className="text-danger">*</span>
        </label>
        <textarea
          id="rc-answerSummary"
          name="answerSummary"
          rows={5}
          required
          maxLength={2000}
          placeholder="Paste the relevant snippet of the AI answer (1-2000 characters)."
          className={inputClass}
        />
        <p className="text-[10px] text-muted">
          The exact text you saw in the AI answer — used to compute mention /
          inclusion / consistency metrics later.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="rc-geoScore" className={labelClass}>
          GEO score: <span className="text-text font-mono">{geoScore}</span>
        </label>
        <input
          id="rc-geoScore"
          name="geoScore-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={geoScore}
          onChange={(e) => setGeoScore(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex items-center justify-between text-[10px] text-muted font-mono">
          <span>0 (absent)</span>
          <span>50 (mentioned, no URL)</span>
          <span>100 (cited as target URL)</span>
        </div>
      </div>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Recording...' : 'Record check'}
        </Button>
        <span className="text-[10px] text-muted">
          Manual entry: AI capability (Browser MCP / Search Console) ships later
          — for now you can backfill real ChatGPT / Perplexity answers.
        </span>
      </div>
    </form>
  );
}
