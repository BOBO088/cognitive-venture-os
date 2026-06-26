import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { RecentItem } from '@/lib/services/dashboardService';

const DOMAIN_TONE: Record<string, 'accent' | 'ok' | 'warn' | 'neutral'> = {
  research: 'accent',
  graph: 'ok',
  opportunities: 'warn',
  mvp: 'accent',
  geo: 'ok',
  learning: 'warn',
  codex: 'neutral',
};

function rel(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentUpdates({ items }: { items: RecentItem[] }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Recent updates</h2>
        <span className="text-xs text-muted">last {items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted">No updates yet.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li key={`${it.domain}:${it.id}`} className="flex items-center gap-3 text-sm">
              <Badge tone={DOMAIN_TONE[it.domain] ?? 'neutral'}>{it.domain}</Badge>
              <Link
                href={it.href}
                className="text-text flex-1 truncate hover:text-accent transition"
              >
                {it.title}
              </Link>
              <span className="text-xs text-muted shrink-0">{rel(it.updatedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
