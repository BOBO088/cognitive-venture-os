/**
 * PromptList — 提示词版本列表。
 * RSC；按 updatedAt desc 排（service 已排好）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PROMPT_TYPE_LABEL } from '@/types';
import type { PromptVersion } from '@/types';

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

export function PromptList({ prompts }: { prompts: PromptVersion[] }) {
  if (prompts.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No prompt versions yet. Save your first prompt to start the
          iteration loop.
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
            <th className="px-4 py-2 font-medium text-right">Version</th>
            <th className="px-4 py-2 font-medium text-right">Score</th>
            <th className="px-4 py-2 font-medium">Used for</th>
            <th className="px-4 py-2 font-medium text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {prompts.map((p) => (
            <tr
              key={p.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/learning/prompts/${p.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {p.name}
                </Link>
                <div className="text-[10px] text-muted font-mono mt-0.5">
                  {p.id}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <Badge tone="neutral">{PROMPT_TYPE_LABEL[p.type]}</Badge>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                v{p.version}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Badge tone={scoreTone(p.score)}>{fmtScore(p.score)}</Badge>
              </td>
              <td className="px-4 py-2.5 text-muted text-xs max-w-xs truncate">
                {p.usedFor}
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
