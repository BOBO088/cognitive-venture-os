import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EntityTypeBadge } from './EntityTypeBadge';
import type { GraphEntity } from '@/types';

interface Row {
  entity: GraphEntity;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function EntityList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          没有匹配的实体。试试调整筛选条件或新建一个。
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
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Tags</th>
            <th className="px-4 py-2 font-medium text-right">Cards</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ entity: e }) => (
            <tr
              key={e.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/graph/entities/${e.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {e.name}
                </Link>
                {e.description && (
                  <div className="text-xs text-muted mt-0.5 truncate max-w-md">
                    {e.description}
                  </div>
                )}
              </td>
              <td className="px-4 py-2.5">
                <EntityTypeBadge kind={e.kind} />
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">
                {e.tags.length > 0
                  ? e.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="inline-block mr-1 px-1.5 py-0.5 rounded border border-border"
                      >
                        {t}
                      </span>
                    ))
                  : '—'}
              </td>
              <td className="px-4 py-2.5 text-text text-xs tabular-nums text-right">
                {e.linkedResearchCardIds.length > 0 ? (
                  <Badge tone="ok">{e.linkedResearchCardIds.length}</Badge>
                ) : (
                  <span className="text-muted">0</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-muted text-xs">
                {fmtDate(e.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
