import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RelationTypeBadge } from './RelationTypeBadge';
import { RelationStrengthBar } from './RelationStrengthBar';
import type { GraphRelation, GraphEntity } from '@/types';

interface Row {
  relation: GraphRelation;
  source: GraphEntity | undefined;
  target: GraphEntity | undefined;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function RelationList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          没有匹配的关系。试试调整筛选条件或新建一条。
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Source → Target</th>
            <th className="px-4 py-2 font-medium">Strength</th>
            <th className="px-4 py-2 font-medium text-right">Cards</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ relation: r, source, target }) => (
            <tr
              key={r.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <RelationTypeBadge relationType={r.relationType} />
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  {source ? (
                    <Link
                      href={`/graph/entities/${source.id}`}
                      className="text-text hover:text-accent font-medium"
                    >
                      {source.name}
                    </Link>
                  ) : (
                    <span className="text-danger font-mono text-xs">{r.sourceEntityId} (missing)</span>
                  )}
                  <span className="text-muted">→</span>
                  {target ? (
                    <Link
                      href={`/graph/entities/${target.id}`}
                      className="text-text hover:text-accent font-medium"
                    >
                      {target.name}
                    </Link>
                  ) : (
                    <span className="text-danger font-mono text-xs">{r.targetEntityId} (missing)</span>
                  )}
                </div>
                {r.evidence && (
                  <div className="text-xs text-muted mt-1 truncate max-w-xl">
                    {r.evidence}
                  </div>
                )}
                <div className="text-xs text-muted mt-0.5">
                  <Link
                    href={`/graph/relations/${r.id}`}
                    className="hover:text-accent font-mono"
                  >
                    {r.id}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-2.5">
                <RelationStrengthBar strength={r.strength} />
              </td>
              <td className="px-4 py-2.5 text-text text-xs tabular-nums text-right">
                {r.linkedResearchCardIds.length > 0 ? (
                  <Badge tone="ok">{r.linkedResearchCardIds.length}</Badge>
                ) : (
                  <span className="text-muted">0</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-muted text-xs">
                {fmtDate(r.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
