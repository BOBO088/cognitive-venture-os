/**
 * /geo/reports — GEO 周报生成。
 *
 *   ?brandEntityId=<id>  按 brand 过滤
 *   ?start=YYYY-MM-DD    起始日（默认 7 天前）
 *   ?end=YYYY-MM-DD      截止日（默认今天）
 *
 * 数据流：page (RSC) → citationMonitorService.generateWeeklyReport
 *                   → WeeklyReport (client, Markdown export)
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { WeeklyReportClient } from '@/components/geo/WeeklyReport';
import { CitationTrendChart } from '@/components/geo/CitationTrendChart';
import { generateWeeklyReport } from '@/lib/services/citationMonitorService';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import { CITATION_PLATFORM_LABEL } from '@/types';
import type { CitationPlatform } from '@/types';

export const metadata = {
  title: 'GEO weekly report · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    brandEntityId?: string;
    start?: string;
    end?: string;
  }>;
}

const DEFAULT_END = '2026-06-25';
const DEFAULT_START = '2026-06-12';

function isValidDate(v: string | undefined): v is string {
  if (!v) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

function scoreTone(score: number): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  if (score > 0) return 'danger';
  return 'neutral';
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const { brandEntityId, start: startRaw, end: endRaw } = await searchParams;
  const start = isValidDate(startRaw) ? startRaw : DEFAULT_START;
  const end = isValidDate(endRaw) ? endRaw : DEFAULT_END;

  const brandProfiles = await listBrandEntityProfiles();
  const brand = brandEntityId
    ? brandProfiles.find((b) => b.id === brandEntityId)
    : undefined;

  const report = await generateWeeklyReport({
    startDate: start,
    endDate: end,
    ...(brandEntityId ? { brandEntityId } : {}),
  });

  // 组装传给 WeeklyReportClient 的 brand
  const reportBrand = brand
    ? { id: brand.id, name: brand.name, category: brand.category }
    : undefined;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-text">GEO Weekly Report</h1>
        <p className="text-sm text-muted">
          Aggregated citation check stats over a date range. Markdown export
          for sharing and handoff.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Filters</h2>
        <form className="flex flex-col md:flex-row gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="brandEntityId" className="text-[10px] uppercase tracking-wider text-muted">
              Brand
            </label>
            <select
              id="brandEntityId"
              name="brandEntityId"
              defaultValue={brandEntityId ?? ''}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
            >
              <option value="">All brands</option>
              {brandProfiles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} &mdash; {b.category}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="start" className="text-[10px] uppercase tracking-wider text-muted">
              Start
            </label>
            <input
              id="start"
              name="start"
              type="date"
              defaultValue={start}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="end" className="text-[10px] uppercase tracking-wider text-muted">
              End
            </label>
            <input
              id="end"
              name="end"
              type="date"
              defaultValue={end}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-accent bg-accent text-white px-3 py-1.5 text-sm hover:opacity-90"
          >
            Apply
          </button>
          <Link
            href="/geo/reports"
            className="text-xs text-muted hover:text-text"
          >
            Reset
          </Link>
        </form>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Window"
          value={`${report.startDate} → ${report.endDate}`}
          hint={`${report.trend.length} day(s)`}
        />
        <Stat
          label="Total checks"
          value={report.totalChecks}
          hint="in window"
        />
        <Stat
          label="Mention rate"
          value={fmtPct(report.mentionRate)}
          hint="target brand named"
        />
        <Stat
          label="Citation rate"
          value={fmtPct(report.citationRate)}
          hint="citedUrl = target"
        />
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Daily trend
        </h2>
        <CitationTrendChart points={report.trend} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-3">
            By platform
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border">
                <th className="py-1.5 pr-3 font-medium">Platform</th>
                <th className="py-1.5 pr-3 font-medium">Checks</th>
                <th className="py-1.5 pr-3 font-medium">Mention</th>
                <th className="py-1.5 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(report.byPlatform) as CitationPlatform[]).map((p) => {
                const s = report.byPlatform[p];
                return (
                  <tr key={p} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-3 text-text">
                      {CITATION_PLATFORM_LABEL[p]}
                    </td>
                    <td className="py-1.5 pr-3 text-muted">{s.count}</td>
                    <td className="py-1.5 pr-3">
                      <Badge tone={s.mentionRate >= 0.5 ? 'ok' : 'warn'}>
                        {fmtPct(s.mentionRate)}
                      </Badge>
                    </td>
                    <td className="py-1.5">
                      <Badge tone={scoreTone(s.averageGeoScore)}>
                        {s.averageGeoScore.toFixed(1)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-muted mb-3">
            Top competitors
          </h2>
          {report.topCompetitors.length === 0 ? (
            <p className="text-sm text-muted">
              No competitor mentions in this window.
            </p>
          ) : (
            <ul className="text-sm flex flex-col gap-1.5">
              {report.topCompetitors.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-text">{c.name}</span>
                  <Badge tone="neutral">{c.count}x</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {report.byQuery.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-muted mb-3">
            By query
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border">
                <th className="py-1.5 pr-3 font-medium">Query</th>
                <th className="py-1.5 pr-3 font-medium">Checks</th>
                <th className="py-1.5 pr-3 font-medium">Mention</th>
                <th className="py-1.5 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {report.byQuery.map((q) => (
                <tr
                  key={q.queryId}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-1.5 pr-3 text-text">
                    {q.queryText}
                  </td>
                  <td className="py-1.5 pr-3 text-muted">{q.count}</td>
                  <td className="py-1.5 pr-3">
                    <Badge tone={q.mentionRate >= 0.5 ? 'ok' : 'warn'}>
                      {fmtPct(q.mentionRate)}
                    </Badge>
                  </td>
                  <td className="py-1.5">
                    <Badge tone={scoreTone(q.averageGeoScore)}>
                      {q.averageGeoScore.toFixed(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {report.topCitedUrls.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-muted mb-3">
            Top cited URLs
          </h2>
          <ul className="text-sm flex flex-col gap-1.5">
            {report.topCitedUrls.map((u) => (
              <li key={u.url} className="flex items-center justify-between gap-2">
                <a
                  href={u.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent hover:underline break-all"
                >
                  {u.url}
                </a>
                <Badge tone="neutral">{u.count}x</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Export report (Markdown)
        </h2>
        <WeeklyReportClient report={report} brand={reportBrand} />
      </Card>
    </div>
  );
}
