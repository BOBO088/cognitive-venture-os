/**
 * ContentAssetList — Content Asset Library 列表。
 * RSC；按 updatedAt desc 排（service 已排好）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CONTENT_ASSET_TYPE_LABEL } from '@/types';
import type { ContentAsset } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function scoreTone(score: number): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  if (score > 0) return 'danger';
  return 'neutral';
}

export function ContentAssetList({
  items,
  brandNameById,
}: {
  items: ContentAsset[];
  brandNameById: Map<string, string>;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No content assets in the library yet. Add your first asset to start
          scoring, linking, and exporting reports.
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Title</th>
            <th className="px-4 py-2 font-medium">Brand</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium text-right">Score</th>
            <th className="px-4 py-2 font-medium text-right">Queries</th>
            <th className="px-4 py-2 font-medium text-right">Evidence</th>
            <th className="px-4 py-2 font-medium text-right">Last updated</th>
            <th className="px-4 py-2 font-medium text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr
              key={a.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5 max-w-md">
                <Link
                  href={`/geo/content-assets/${a.id}`}
                  className="text-text hover:text-accent font-medium line-clamp-1"
                >
                  {a.title}
                </Link>
                <div className="text-[10px] text-muted font-mono mt-0.5 break-all">
                  {a.url}
                </div>
              </td>
              <td className="px-4 py-2.5">
                {brandNameById.get(a.brandEntityId) ? (
                  <Link
                    href={`/geo/brands/${a.brandEntityId}`}
                    className="text-muted hover:text-accent"
                  >
                    {brandNameById.get(a.brandEntityId)}
                  </Link>
                ) : (
                  <span className="text-muted text-xs font-mono">
                    {a.brandEntityId}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs">
                {CONTENT_ASSET_TYPE_LABEL[a.type]}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Badge tone={scoreTone(a.geoScore)}>{a.geoScore}</Badge>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {a.targetQueryIds.length}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {a.structuredEvidence.length}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                {fmtDate(a.lastUpdated)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                {fmtDate(a.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
