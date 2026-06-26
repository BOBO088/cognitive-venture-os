import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SignalCategoryBadge } from './SignalCategoryBadge';
import { SignalConfidenceBar } from './SignalConfidenceBar';
import type { Signal } from '@/types';

interface Row {
  signal: Signal;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function SignalList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No signals match the current filters. Try adjusting the category or create a new signal.
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
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 font-medium">Source</th>
            <th className="px-4 py-2 font-medium">Confidence</th>
            <th className="px-4 py-2 font-medium text-right">Bindings</th>
            <th className="px-4 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ signal: s }) => {
            const totalBinds = s.linkedEntityIds.length + s.linkedResearchCardIds.length;
            return (
              <tr
                key={s.id}
                className="border-t border-border hover:bg-panel-2 transition"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/opportunities/signals/${s.id}`}
                    className="text-text hover:text-accent font-medium"
                  >
                    {s.title}
                  </Link>
                  <div className="text-xs text-muted mt-0.5 truncate max-w-md">
                    {s.description}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <SignalCategoryBadge category={s.category} />
                </td>
                <td className="px-4 py-2.5 text-xs text-muted font-mono truncate max-w-[200px]">
                  {s.source}
                </td>
                <td className="px-4 py-2.5">
                  <SignalConfidenceBar confidence={s.confidence} />
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-text">
                  {totalBinds > 0 ? (
                    <Badge tone="ok">{totalBinds}</Badge>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted text-xs">{fmtDate(s.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
