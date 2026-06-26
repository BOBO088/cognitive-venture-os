/**
 * MVPList — 列表视图。
 * RSC；按 updatedAt desc 排（由 service 排序）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MVPStageBadge } from './MVPStageBadge';
import type { MVPProject } from '@/types';

interface Row {
  project: MVPProject;
  opportunityTitle?: string;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function MVPList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No MVP projects yet. Create one to get started.
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Project</th>
            <th className="px-4 py-2 font-medium">Stage</th>
            <th className="px-4 py-2 font-medium">Owner</th>
            <th className="px-4 py-2 font-medium">Revenue / Cost</th>
            <th className="px-4 py-2 font-medium">Start</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ project: p, opportunityTitle }) => {
            const net = p.revenue - p.cost;
            const netTone = net > 0 ? 'ok' : net < 0 ? 'danger' : 'neutral';
            return (
              <tr
                key={p.id}
                className="border-t border-border hover:bg-panel-2 transition"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/mvp/${p.id}`}
                    className="text-text hover:text-accent font-medium"
                  >
                    {p.name}
                  </Link>
                  <div className="text-xs text-muted mt-0.5 truncate max-w-md">
                    {p.description}
                  </div>
                  {opportunityTitle && (
                    <div className="text-[10px] text-muted mt-0.5">
                      from{' '}
                      <Link
                        href={`/opportunities/${p.opportunityId}`}
                        className="text-muted hover:text-accent"
                      >
                        {opportunityTitle}
                      </Link>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <MVPStageBadge stage={p.stage} />
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">{p.owner}</td>
                <td className="px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="tabular-nums text-text">
                      {fmtMoney(p.revenue)}
                    </span>
                    <span className="text-muted">/</span>
                    <span className="tabular-nums text-muted">
                      {fmtMoney(p.cost)}
                    </span>
                  </div>
                  <Badge tone={netTone} className="mt-1">
                    {net > 0 ? '+' : ''}
                    {fmtMoney(net)}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">
                  {fmtDate(p.startDate)}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">
                  {fmtDate(p.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
