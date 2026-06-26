/**
 * /geo/metrics — 7 GEO 健康指标 dashboard。
 *
 * 数据流：page (RSC) → citationMonitorService.computeGeoMetrics
 *                   → aiQueryService / geoBrandService / contentAssetService
 *                   → 7 Stat cards
 *
 * 设计：单一 brand 视图（默认第一个 brand）。未来加 brand 切换器。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { computeGeoMetrics } from '@/lib/services/citationMonitorService';
import { listAIQueryBankItems } from '@/lib/services/aiQueryService';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import { listContentAssets } from '@/lib/services/contentAssetService';
import { listAICitationChecks } from '@/lib/services/citationMonitorService';

export const metadata = {
  title: 'GEO metrics · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ brandEntityId?: string }>;
}

const REFERENCE_DATE = '2026-06-25';

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** 7 个指标的展示配置（label / hint / 阈值）—— 与 GEO_METRICS.md 完全对齐。 */
const METRIC_HINTS: Record<
  | 'brandMentionRate'
  | 'citationRate'
  | 'competitorMentionRate'
  | 'answerInclusionRate'
  | 'queryCoverage'
  | 'contentFreshnessDays'
  | 'entityConsistency',
  { label: string; hint: string; healthy: string; action: string }
> = {
  brandMentionRate: {
    label: 'Brand mention rate',
    hint: 'target brand named in answer',
    healthy: '≥ 50% is healthy',
    action: 'If low: add FAQ / comparison pages that name the brand explicitly.',
  },
  citationRate: {
    label: 'Citation rate',
    hint: 'citedUrl = brand official link',
    healthy: '≥ 30% is healthy',
    action:
      'If low: ensure every AIQueryBankItem has at least one targetQueryIds asset.',
  },
  competitorMentionRate: {
    label: 'Competitor mention rate',
    hint: '% checks with ≥1 competitor',
    healthy: '≤ 50% (lower = less competitive pressure)',
    action:
      'If high: study competitor content structure; ship differentiated pages.',
  },
  answerInclusionRate: {
    label: 'Answer inclusion rate',
    hint: 'canonicalName OR any alias in answer',
    healthy: '≥ 60% is healthy',
    action: 'If low: spread canonical name across more public assets.',
  },
  queryCoverage: {
    label: 'Query coverage',
    hint: 'active bank items with ≥1 check',
    healthy: '≥ 80% is healthy',
    action: 'If low: schedule checks for the un-covered active bank items.',
  },
  contentFreshnessDays: {
    label: 'Content freshness (days)',
    hint: 'avg updatedAt distance from today',
    healthy: '≤ 60 days is healthy',
    action: 'If high: refresh or republish the stale content assets.',
  },
  entityConsistency: {
    label: 'Entity consistency',
    hint: 'canonicalName (not alias) in answer',
    healthy: '≥ 80% is healthy',
    action:
      'If low: rewrite top-cited third-party sources to use the canonical form.',
  },
};

export default async function GeoMetricsPage({ searchParams }: PageProps) {
  const { brandEntityId: brandEntityIdRaw } = await searchParams;
  const [brands, bankItems, contentAssets, checks] = await Promise.all([
    listBrandEntityProfiles(),
    listAIQueryBankItems(),
    listContentAssets(),
    listAICitationChecks(),
  ]);

  const brand =
    (brandEntityIdRaw
      ? brands.find((b) => b.id === brandEntityIdRaw)
      : undefined) ?? brands[0];

  if (!brand) {
    return (
      <div className="flex flex-col gap-4 max-w-4xl">
        <h1 className="text-lg font-semibold text-text">GEO metrics</h1>
        <p className="text-sm text-muted">
          No brand profiles yet. Create one in{' '}
          <Link href="/geo/brands" className="text-accent hover:underline">
            GEO brand profiles
          </Link>{' '}
          first.
        </p>
      </div>
    );
  }

  const m = await computeGeoMetrics({
    checks,
    bankItems,
    brand,
    contentAssets,
    referenceDate: REFERENCE_DATE,
  });

  const brandBank = bankItems.filter((q) => q.brandEntityId === brand.id);
  const activeBankCount = brandBank.filter((q) => q.status === 'active').length;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-text">GEO metrics</h1>
        <p className="text-sm text-muted">
          7 operational GEO health indicators for{' '}
          <span className="text-text font-medium">{brand.name}</span>.
          Reference date: {REFERENCE_DATE}.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted">
        <span>brand:</span>
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/geo/metrics?brandEntityId=${b.id}`}
            className={
              b.id === brand.id
                ? 'text-accent font-medium'
                : 'text-text hover:underline'
            }
          >
            {b.name}
          </Link>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
          <Badge tone="neutral">total checks: {m.totalChecks}</Badge>
          <Badge tone="neutral">active bank items: {activeBankCount}</Badge>
          <Badge tone="neutral">content assets: {contentAssets.length}</Badge>
          <Link
            href="/geo/citation-monitor"
            className="ml-auto text-accent hover:underline"
          >
            Citation monitor &rarr;
          </Link>
          <Link
            href="/geo/reports"
            className="text-accent hover:underline"
          >
            Weekly report &rarr;
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label={METRIC_HINTS.brandMentionRate.label}
          value={fmtPct(m.brandMentionRate)}
          hint={METRIC_HINTS.brandMentionRate.hint}
        />
        <Stat
          label={METRIC_HINTS.citationRate.label}
          value={fmtPct(m.citationRate)}
          hint={METRIC_HINTS.citationRate.hint}
        />
        <Stat
          label={METRIC_HINTS.competitorMentionRate.label}
          value={fmtPct(m.competitorMentionRate)}
          hint={METRIC_HINTS.competitorMentionRate.hint}
        />
        <Stat
          label={METRIC_HINTS.answerInclusionRate.label}
          value={fmtPct(m.answerInclusionRate)}
          hint={METRIC_HINTS.answerInclusionRate.hint}
        />
        <Stat
          label={METRIC_HINTS.queryCoverage.label}
          value={fmtPct(m.queryCoverage)}
          hint={METRIC_HINTS.queryCoverage.hint}
        />
        <Stat
          label={METRIC_HINTS.contentFreshnessDays.label}
          value={m.contentFreshnessDays.toFixed(1)}
          hint={METRIC_HINTS.contentFreshnessDays.hint}
        />
        <Stat
          label={METRIC_HINTS.entityConsistency.label}
          value={fmtPct(m.entityConsistency)}
          hint={METRIC_HINTS.entityConsistency.hint}
        />
        <Stat
          label="Total citation checks"
          value={m.totalChecks}
          hint="across all bank items"
        />
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          What each metric means
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-text">
          {(Object.keys(METRIC_HINTS) as Array<keyof typeof METRIC_HINTS>).map(
            (k) => (
              <div
                key={k}
                className="rounded border border-border bg-panel-2 p-3"
              >
                <div className="font-medium text-sm">{METRIC_HINTS[k].label}</div>
                <div className="mt-1 text-muted">{METRIC_HINTS[k].hint}</div>
                <div className="mt-1.5 text-[10px] text-muted">
                  <span className="uppercase tracking-wider">healthy:</span>{' '}
                  {METRIC_HINTS[k].healthy}
                </div>
                <div className="mt-0.5 text-[10px] text-muted">
                  <span className="uppercase tracking-wider">action:</span>{' '}
                  {METRIC_HINTS[k].action}
                </div>
              </div>
            ),
          )}
        </div>
        <p className="mt-3 text-[10px] text-muted">
          Formulas / data sources / thresholds documented in{' '}
          <Link
            href="https://github.com"
            className="text-accent hover:underline"
          >
            GEO_METRICS.md
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
