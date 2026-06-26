import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OpportunityStatusBadge } from './OpportunityStatusBadge';
import type { Opportunity } from '@/types';

interface Row {
  opportunity: Opportunity;
  boundCount: number;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function OpportunityList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No opportunities match the current filter. Try adjusting the status or create a new opportunity.
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
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Target user</th>
            <th className="px-4 py-2 font-medium text-right">Signals / Cards / Entities</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ opportunity: o, boundCount }) => (
            <tr
              key={o.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/opportunities/${o.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {o.title}
                </Link>
                <div className="text-xs text-muted mt-0.5 truncate max-w-md">
                  {o.painPoint}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <OpportunityStatusBadge status={o.status} />
              </td>
              <td className="px-4 py-2.5 text-xs text-muted truncate max-w-xs">
                {o.targetUser}
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-text tabular-nums">
                <span title="signals">{o.relatedSignalIds.length}</span>
                <span className="text-muted"> / </span>
                <span title="cards">{o.relatedResearchCardIds.length}</span>
                <span className="text-muted"> / </span>
                <span title="entities">{o.relatedEntityIds.length}</span>
                {boundCount > 0 && (
                  <Badge tone="ok" className="ml-2">{boundCount}</Badge>
                )}
              </td>
              <td className="px-4 py-2.5 text-muted text-xs">{fmtDate(o.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
