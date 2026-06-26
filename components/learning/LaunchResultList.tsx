/**
 * LaunchResultList — 上线结果列表。
 * RSC；按 launchDate desc 排（service 已排好）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LaunchResultStatusBadge } from './LaunchResultStatusBadge';
import type { LaunchResult, MVPProject } from '@/types';

interface Row {
  result: LaunchResult;
  mvpProject: MVPProject | undefined;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function LaunchResultList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No launches recorded yet. Record your first launch to start the
          learning loop.
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">MVP</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Users</th>
            <th className="px-4 py-2 font-medium text-right">Signups</th>
            <th className="px-4 py-2 font-medium text-right">Conv.</th>
            <th className="px-4 py-2 font-medium text-right">Retention</th>
            <th className="px-4 py-2 font-medium text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ result, mvpProject }) => (
            <tr
              key={result.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5 whitespace-nowrap">
                <Link
                  href={`/learning/launch-results/${result.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {fmtDate(result.launchDate)}
                </Link>
                <div className="text-[10px] text-muted font-mono mt-0.5">
                  {result.id}
                </div>
              </td>
              <td className="px-4 py-2.5">
                {mvpProject ? (
                  <Link
                    href={`/mvp/${mvpProject.id}`}
                    className="text-muted hover:text-accent"
                  >
                    {mvpProject.name}
                  </Link>
                ) : (
                  <span className="text-muted">{result.mvpProjectId}</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <LaunchResultStatusBadge status={result.resultStatus} />
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {result.users}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {result.signups}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {result.conversionRate.toFixed(1)}%
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {result.retentionRate.toFixed(1)}%
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {fmtMoney(result.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
