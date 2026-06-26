/**
 * /geo/citation-monitor/[id] — 单条 AI 引用检查详情。
 *
 * 展示：platform / mentioned / citedUrl / answerSummary / score /
 * competitors + 关联 query 跳转 + 关联 brand 跳转。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { buildCitationReportContext } from '@/lib/services/citationMonitorService';
import {
  CITATION_PLATFORM_LABEL,
} from '@/types';
import type { CitationPlatform } from '@/types';

export const metadata = {
  title: 'Citation check · Cognitive Venture OS',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function scoreTone(score: number): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  if (score > 0) return 'danger';
  return 'neutral';
}

function fmtDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}

export default async function CitationCheckDetailPage({ params }: PageProps) {
  const { id } = await params;
  const ctx = await buildCitationReportContext(id);
  if (!ctx) notFound();
  const { check, query, brand, citedUrlIsTarget } = ctx;
  const platformLabel = CITATION_PLATFORM_LABEL[check.platform as CitationPlatform];

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link
          href="/geo/citation-monitor"
          className="text-sm text-muted hover:text-text"
        >
          &larr; Back to monitor
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">
                Citation check
              </h1>
              <Badge tone="accent">{platformLabel}</Badge>
              <Badge tone={check.mentioned ? 'ok' : 'danger'}>
                {check.mentioned ? 'mentioned' : 'absent'}
              </Badge>
              {check.citedUrl && (
                <Badge tone={citedUrlIsTarget ? 'ok' : 'warn'}>
                  {citedUrlIsTarget ? 'cited target URL' : 'cited third-party URL'}
                </Badge>
              )}
              <Badge tone={scoreTone(check.geoScore)}>
                GEO {check.geoScore}
              </Badge>
            </div>
            <div className="mt-1.5 text-xs text-muted flex items-center gap-2 flex-wrap">
              <span className="font-mono">{check.id}</span>
              <span className="mx-1">&middot;</span>
              <span>checked {fmtDate(check.checkedAt)}</span>
              <span className="mx-1">&middot;</span>
              <span>created {fmtDate(check.createdAt)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Query
          </h2>
          {query ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-text whitespace-pre-wrap">
                {query.query}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <span className="font-mono">{query.id}</span>
                <span>&middot;</span>
                <span>platform: {query.platform}</span>
                <span>&middot;</span>
                <span>intent: {query.intent}</span>
              </div>
              <Link
                href={`/geo/queries/${query.id}`}
                className="text-xs text-accent hover:underline"
              >
                Open query &rarr;
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-danger">Query not found</span>
              <span className="text-xs text-muted font-mono">
                {check.queryId}
              </span>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">Brand</h2>
          {brand ? (
            <div className="flex flex-col gap-1.5">
              <Link
                href={`/geo/brands/${brand.id}`}
                className="text-sm text-accent hover:underline"
              >
                {brand.name}
              </Link>
              <span className="text-xs text-muted">{brand.category}</span>
              {ctx.targetBrandUrls.length > 0 && (
                <div className="mt-1 text-[10px] text-muted">
                  target URLs: {ctx.targetBrandUrls.length}
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted">
              Brand profile not found.
            </span>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">
          Answer summary
        </h2>
        <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
          {check.answerSummary}
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">
          Cited URL
        </h2>
        {check.citedUrl ? (
          <div className="flex flex-col gap-1.5">
            <a
              href={check.citedUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-accent hover:underline break-all"
            >
              {check.citedUrl}
            </a>
            <span className="text-[10px] text-muted">
              {citedUrlIsTarget
                ? '✓ matches one of the brand official links'
                : '× does not match brand official links (third-party source)'}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted italic">
            No URL was cited in the answer.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">
          Competitor mentions ({check.competitorMentions.length})
        </h2>
        {check.competitorMentions.length === 0 ? (
          <p className="text-sm text-muted italic">
            No competitor brand names detected.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {check.competitorMentions.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-md border border-border bg-panel-2 px-2 py-0.5 text-xs text-text"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
