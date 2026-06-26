/**
 * /geo/content-assets/[id] — 单条 content asset 详情 + 编辑 + 删除 + 报告导出。
 *
 * 展示：title / type / URL / brand / geoScore / lastUpdated / summary / evidence / target queries。
 * 编辑：复用 ContentAssetForm（mode="edit"）。
 * 报告：复用 ContentAssetReport（client-side markdown export）。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ContentAssetForm } from '@/components/geo/ContentAssetForm';
import { ContentAssetReport } from '@/components/geo/ContentAssetReport';
import {
  getContentAsset,
  buildContentAssetReportContext,
} from '@/lib/services/contentAssetService';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import { listAIQueryBankItems } from '@/lib/services/aiQueryService';
import { CONTENT_ASSET_TYPE_LABEL } from '@/types';
import {
  updateContentAssetAction,
  deleteContentAssetAction,
} from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function scoreTone(score: number): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  if (score > 0) return 'danger';
  return 'neutral';
}

export default async function ContentAssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const asset = await getContentAsset(id);
  if (!asset) notFound();

  const [brandProfiles, bankItems, reportCtx] = await Promise.all([
    listBrandEntityProfiles(),
    listAIQueryBankItems(),
    buildContentAssetReportContext(id),
  ]);
  if (!reportCtx) notFound();

  const brandMap = new Map(brandProfiles.map((b) => [b.id, b]));
  const bankMap = new Map(bankItems.map((q) => [q.id, q]));
  const brand = brandMap.get(asset.brandEntityId);

  const onDelete = deleteContentAssetAction.bind(null, asset.id);

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <Link
          href="/geo/content-assets"
          className="text-sm text-muted hover:text-text"
        >
          &larr; Back to library
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">
                {asset.title}
              </h1>
              <Badge tone="accent">
                {CONTENT_ASSET_TYPE_LABEL[asset.type]}
              </Badge>
              <Badge tone={scoreTone(asset.geoScore)}>
                GEO {asset.geoScore}
              </Badge>
            </div>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              <a
                href={asset.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent hover:underline break-all"
              >
                {asset.url}
              </a>
              <span className="mx-1">&middot;</span>
              <span>
                content updated {fmtDate(asset.lastUpdated)} &middot; record
                updated {fmtDate(asset.updatedAt)}
              </span>
              <span className="mx-1">&middot;</span>
              <span className="font-mono">{asset.id}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href="/geo/content-assets"
              className="text-xs text-muted hover:text-text"
            >
              All assets
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Brand profile
          </h2>
          {brand ? (
            <div className="flex flex-col gap-1.5">
              <Link
                href={`/geo/brands/${brand.id}`}
                className="text-sm text-accent hover:underline"
              >
                {brand.name}
              </Link>
              <span className="text-xs text-muted">
                {brand.category}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-danger">Brand not found</span>
              <span className="text-xs text-muted font-mono">
                {asset.brandEntityId}
              </span>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Target AI queries ({asset.targetQueryIds.length})
          </h2>
          {asset.targetQueryIds.length === 0 ? (
            <p className="text-xs text-muted">
              No target queries linked. Use the form below to attach one.
            </p>
          ) : (
            <ul className="text-sm flex flex-col gap-1.5">
              {asset.targetQueryIds.map((qid) => {
                const q = bankMap.get(qid);
                return (
                  <li key={qid} className="flex items-start gap-2">
                    <span className="text-muted">&middot;</span>
                    <div className="min-w-0 flex-1">
                      {q ? (
                        <Link
                          href={`/geo/queries/${q.id}`}
                          className="text-accent hover:underline"
                        >
                          {q.query}
                        </Link>
                      ) : (
                        <span className="text-danger text-xs font-mono">
                          {qid} (not found)
                        </span>
                      )}
                      {q && (
                        <span className="text-xs text-muted ml-2">
                          &middot; {q.intent}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">Summary</h2>
        <p className="text-sm text-text whitespace-pre-wrap">
          {asset.summary}
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">
          Structured evidence ({asset.structuredEvidence.length})
        </h2>
        {asset.structuredEvidence.length === 0 ? (
          <p className="text-xs text-muted">No evidence recorded.</p>
        ) : (
          <ul className="text-sm text-text flex flex-col gap-2">
            {asset.structuredEvidence.map((ev, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span>
                  <span className="text-accent">{i + 1}.</span> {ev.claim}
                </span>
                {ev.source && (
                  <span className="text-xs text-muted ml-4">
                    Source: {ev.source}
                  </span>
                )}
                {ev.quote && (
                  <span className="text-xs text-muted ml-4 italic">
                    &ldquo;{ev.quote}&rdquo;
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Export report (Markdown)
        </h2>
        <ContentAssetReport
          asset={asset}
          brand={reportCtx.brand}
          targetQueries={reportCtx.targetQueries}
        />
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <ContentAssetForm
          initial={asset}
          mode="edit"
          onSubmit={updateContentAssetAction}
          onDelete={onDelete}
          brandProfiles={brandProfiles}
          bankItems={bankItems}
        />
      </Card>
    </div>
  );
}
