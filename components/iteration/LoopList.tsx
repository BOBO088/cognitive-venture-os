/**
 * LoopList — 循环工程版本列表。
 * RSC；按 updatedAt desc 排（service 已排好）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { LoopVersion } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtScore(s: number | null): string {
  if (s === null) return '—';
  return s.toString();
}

function scoreTone(s: number | null): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (s === null) return 'neutral';
  if (s >= 75) return 'ok';
  if (s >= 50) return 'warn';
  return 'danger';
}

export function LoopList({ loops }: { loops: LoopVersion[] }) {
  if (loops.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No loop versions yet. Save your first loop to start tracking
          iteration cycles.
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
            <th className="px-4 py-2 font-medium text-right">Version</th>
            <th className="px-4 py-2 font-medium text-right">Steps</th>
            <th className="px-4 py-2 font-medium text-right">Score</th>
            <th className="px-4 py-2 font-medium">Stop condition</th>
            <th className="px-4 py-2 font-medium text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {loops.map((l) => (
            <tr
              key={l.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/learning/loops/${l.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {l.name}
                </Link>
                <div className="text-[10px] text-muted font-mono mt-0.5">
                  {l.id}
                </div>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                v{l.version}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {l.steps.length}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Badge tone={scoreTone(l.score)}>{fmtScore(l.score)}</Badge>
              </td>
              <td className="px-4 py-2.5 text-muted text-xs max-w-xs truncate">
                {l.stopCondition}
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
