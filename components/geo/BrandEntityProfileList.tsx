/**
 * BrandEntityProfileList — 品牌实体档案列表。
 * RSC；按 updatedAt desc 排（service 已排好）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BRAND_ENTITY_CATEGORY_LABEL } from '@/types';
import type { BrandEntityProfile } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function BrandEntityProfileList({
  profiles,
}: {
  profiles: BrandEntityProfile[];
}) {
  if (profiles.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No brand entity profiles yet. Create your first profile to start
          tracking how the brand should be referenced in AI search.
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 font-medium text-right">
              Competitors
            </th>
            <th className="px-4 py-2 font-medium text-right">Claims</th>
            <th className="px-4 py-2 font-medium text-right">Proofs</th>
            <th className="px-4 py-2 font-medium text-right">Links</th>
            <th className="px-4 py-2 font-medium text-right">
              MVPs · Entities
            </th>
            <th className="px-4 py-2 font-medium text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr
              key={p.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/geo/brands/${p.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {p.name}
                </Link>
                <div className="text-[10px] text-muted font-mono mt-0.5">
                  {p.id}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <Badge tone="neutral">
                  {BRAND_ENTITY_CATEGORY_LABEL[p.category]}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {p.competitors.length}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {p.keyClaims.length}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {p.proofPoints.length}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {p.officialLinks.length}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                {p.relatedProjectIds.length} · {p.relatedEntityIds.length}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                {fmtDate(p.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
