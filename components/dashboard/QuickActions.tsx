import Link from 'next/link';
import { Card } from '@/components/ui/Card';

/** 7 大域 + 4 个跨域工具 = 11 个入口。 */
const ACTIONS = [
  { href: '/research/topics/new',     label: 'New research topic' },
  { href: '/graph/entities/new',      label: 'New graph entity' },
  { href: '/opportunities/signals/new', label: 'New signal' },
  { href: '/opportunities/new',       label: 'New opportunity' },
  { href: '/mvp/new',                 label: 'New MVP project' },
  { href: '/geo/brands/new',          label: 'New GEO brand' },
  { href: '/codex-tasks/new',         label: 'New Codex task' },
  { href: '/prd/new',                 label: 'Generate PRD' },
  { href: '/learning/lessons/new',    label: 'Log lesson learned' },
  { href: '/learning/launch-results/new', label: 'Record launch' },
  { href: '/tasks/new',               label: 'Quick task' },
] as const;

export function QuickActions() {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Quick actions</h2>
        <span className="text-xs text-muted">{ACTIONS.length} entry points</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text hover:border-accent transition"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
