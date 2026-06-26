/**
 * /geo/optimizer — GEO Content Optimizer 工作台。
 *
 *   ?assetId=<id>   聚焦某条 content asset：显示其最新 audit + 历史 + 表单预选
 *
 * 数据流：page (RSC) → contentAssetService + geoOptimizerService
 *                   → GEOAuditView / GEOOptimizerForm / GEOAuditReport
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { GEOAuditView } from '@/components/geo/GEOAuditView';
import { GEOOptimizerForm } from '@/components/geo/GEOOptimizerForm';
import { GEOAuditReport } from '@/components/geo/GEOAuditReport';
import {
  listContentAssets,
  getContentAsset,
} from '@/lib/services/contentAssetService';
import {
  listGEOAudits,
  getLatestAuditForAsset,
  listGEOAuditsByAsset,
  computeGEOAuditStats,
  buildAuditReportContext,
} from '@/lib/services/geoOptimizerService';
import { listAIQueryBankItems } from '@/lib/services/aiQueryService';
import { CONTENT_ASSET_TYPE_LABEL } from '@/types';
import {
  runGEOAuditAction,
} from './actions';

export const metadata = {
  title: 'GEO Content Optimizer · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ assetId?: string }>;
}

function scoreTone(score: number): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  if (score > 0) return 'danger';
  return 'neutral';
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export default async function GEOOptimizerPage({ searchParams }: PageProps) {
  const { assetId } = await searchParams;

  const [contentAssets, stats, allAudits, allBank] = await Promise.all([
    listContentAssets(),
    computeGEOAuditStats(),
    listGEOAudits(),
    listAIQueryBankItems(),
  ]);

  // --- assetId preselect view ---
  if (assetId) {
    const asset = await getContentAsset(assetId);
    if (!asset) notFound();
    const [latest, history, reportCtx] = await Promise.all([
      getLatestAuditForAsset(assetId),
      listGEOAuditsByAsset(assetId),
      buildAuditReportContext(
        // reportCtx is per-audit; we'll rebuild for latest below
        (await getLatestAuditForAsset(assetId))?.id ?? '',
      ),
    ]);
    return (
      <div className="flex flex-col gap-4 max-w-6xl">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <Link
              href="/geo/optimizer"
              className="text-sm text-muted hover:text-text"
            >
              &larr; Back to optimizer
            </Link>
            <h1 className="mt-1 text-lg font-semibold text-text">
              GEO audit for {asset.title}
            </h1>
          </div>
          <Link
            href={`/geo/content-assets/${asset.id}`}
            className="text-xs text-accent hover:underline"
          >
            Open content asset &rarr;
          </Link>
        </div>

        <Card>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-text">{asset.title}</span>
                <Badge tone={scoreTone(asset.geoScore)}>
                  GEO {asset.geoScore}
                </Badge>
                <Badge tone="accent">
                  {CONTENT_ASSET_TYPE_LABEL[asset.type]}
                </Badge>
              </div>
              <a
                href={asset.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 text-xs text-accent hover:underline break-all block"
              >
                {asset.url}
              </a>
              <p className="mt-1.5 text-sm text-text whitespace-pre-wrap">
                {asset.summary}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <h2 className="text-sm font-medium text-muted mb-3">
              Run a new audit
            </h2>
            <GEOOptimizerForm
              contentAssets={contentAssets}
              onSubmit={runGEOAuditAction}
              defaultAssetId={asset.id}
            />
          </Card>
          <Card>
            <h2 className="text-sm font-medium text-muted mb-3">
              Latest audit
            </h2>
            {latest ? (
              <div className="flex flex-col gap-2">
                <div className="text-sm text-text">
                  Score:{' '}
                  <span className="font-mono font-semibold">
                    {latest.score.geoScore.toFixed(1)}
                  </span>{' '}
                  <span className="text-xs text-muted">
                    ({latest.inputType}, model {latest.scoringModelVersion},{' '}
                    {fmtDate(latest.createdAt)})
                  </span>
                </div>
                <p className="text-xs text-muted whitespace-pre-wrap">
                  {latest.explanation}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No audit yet for this asset. Run one with the form on the
                left to see 7-dim scores and 9 suggestion buckets.
              </p>
            )}
          </Card>
        </div>

        {latest && (
          <GEOAuditView
            audit={latest}
            asset={{
              id: asset.id,
              title: asset.title,
              url: asset.url,
              type: asset.type,
            }}
            bankItems={allBank}
          />
        )}

        {latest && reportCtx && (
          <Card>
            <h2 className="text-sm font-medium text-muted mb-3">
              Export audit (Markdown)
            </h2>
            <GEOAuditReport
              audit={latest}
              asset={reportCtx.asset}
              brand={reportCtx.brand}
              targetQueries={reportCtx.targetQueries}
            />
          </Card>
        )}

        <Card>
          <h2 className="text-sm font-medium text-muted mb-3">
            Audit history ({history.length})
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted">No audits recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-border">
                  <th className="py-1.5 pr-3 font-medium">ID</th>
                  <th className="py-1.5 pr-3 font-medium">Input</th>
                  <th className="py-1.5 pr-3 font-medium">Score</th>
                  <th className="py-1.5 pr-3 font-medium">Model</th>
                  <th className="py-1.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-1.5 pr-3 font-mono text-xs text-text">
                      {a.id}
                    </td>
                    <td className="py-1.5 pr-3 text-text">{a.inputType}</td>
                    <td className="py-1.5 pr-3">
                      <Badge tone={scoreTone(a.score.geoScore)}>
                        {a.score.geoScore.toFixed(1)}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-3 text-xs text-muted font-mono">
                      {a.scoringModelVersion}
                    </td>
                    <td className="py-1.5 text-xs text-muted">
                      {fmtDate(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    );
  }

  // --- default overview view ---
  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-text">
          GEO Content Optimizer
        </h1>
        <p className="text-sm text-muted">
          Run 7-dimension GEO audits on a content asset to surface 9
          suggestion buckets and an optimized outline. Append-only history.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat
          label="Total audits"
          value={stats.totalAudits}
          hint="across all assets and input types"
        />
        <Stat
          label="Average GEO score"
          value={stats.averageGeoScore.toFixed(1)}
          hint="0-100, weighted by GEO_AUDIT_WEIGHTS"
        />
        <Stat
          label="Content assets"
          value={contentAssets.length}
          hint="in the library; pick one below to audit"
        />
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Run a new audit
        </h2>
        <GEOOptimizerForm
          contentAssets={contentAssets}
          onSubmit={runGEOAuditAction}
        />
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Recent audits
        </h2>
        {allAudits.length === 0 ? (
          <p className="text-sm text-muted">
            No audits yet. Pick a content asset above and run one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted border-b border-border">
                <th className="py-1.5 pr-3 font-medium">Asset</th>
                <th className="py-1.5 pr-3 font-medium">Input</th>
                <th className="py-1.5 pr-3 font-medium">Score</th>
                <th className="py-1.5 pr-3 font-medium">Model</th>
                <th className="py-1.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {allAudits.slice(0, 20).map((a) => {
                const asset = contentAssets.find((c) => c.id === a.assetId);
                return (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-1.5 pr-3">
                      <Link
                        href={`/geo/optimizer?assetId=${a.assetId}`}
                        className="text-accent hover:underline"
                      >
                        {asset?.title ?? a.assetId}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-3 text-text">{a.inputType}</td>
                    <td className="py-1.5 pr-3">
                      <Badge tone={scoreTone(a.score.geoScore)}>
                        {a.score.geoScore.toFixed(1)}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-3 text-xs text-muted font-mono">
                      {a.scoringModelVersion}
                    </td>
                    <td className="py-1.5 text-xs text-muted">
                      {fmtDate(a.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
