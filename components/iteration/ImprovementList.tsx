/**
 * ImprovementList — 改进建议列表。
 * RSC；按 updatedAt desc 排（service 已排好）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IMPROVEMENT_TARGET_TYPE_LABEL } from '@/types';
import type { ImprovementLog, ImprovementTargetType } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function statusTone(
  result: string,
): 'ok' | 'warn' | 'neutral' {
  if (result.trim().length > 0) return 'ok';
  return 'warn';
}

function statusLabel(result: string): 'Applied' | 'Pending' {
  return result.trim().length > 0 ? 'Applied' : 'Pending';
}

const TARGET_TONE: Record<ImprovementTargetType, 'ok' | 'warn' | 'accent' | 'neutral'> = {
  prompt: 'accent',
  loop: 'accent',
  score_model: 'ok',
  other: 'neutral',
};

export function ImprovementList({
  logs,
}: {
  logs: ImprovementLog[];
}) {
  if (logs.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No improvement logs yet. Capture a problem + suggestion to start
          closing the iteration loop.
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Target</th>
            <th className="px-4 py-2 font-medium">Target ID</th>
            <th className="px-4 py-2 font-medium">Problem</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr
              key={l.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Badge tone={TARGET_TONE[l.targetType]}>
                  {IMPROVEMENT_TARGET_TYPE_LABEL[l.targetType]}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/learning/improvements/${l.id}`}
                  className="text-text hover:text-accent font-mono text-xs"
                >
                  {l.targetId}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-xs text-muted max-w-md truncate">
                {l.problem}
              </td>
              <td className="px-4 py-2.5">
                <Badge tone={statusTone(l.result)}>{statusLabel(l.result)}</Badge>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                {fmtDate(l.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
