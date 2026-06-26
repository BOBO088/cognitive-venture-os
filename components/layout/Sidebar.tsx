'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/** Sidebar 入口：Dashboard + 7 大域 + 4 个跨域工具。 */
const NAV = [
  { href: '/',                          label: 'Dashboard' },
  { href: '/research/topics',           label: 'Research' },
  { href: '/graph/entities',            label: 'Knowledge graph' },
  { href: '/opportunities',             label: 'Opportunities' },
  { href: '/mvp',                       label: 'MVP pipeline' },
  { href: '/geo/brands',                label: 'GEO engine' },
  { href: '/learning/launch-results',   label: 'Learning loop' },
  { href: '/codex-tasks',               label: 'Codex tasks' },
  { href: '/tasks',                     label: 'Quick tasks' },
  { href: '/prd',                       label: 'PRD library' },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-panel">
      <div className="px-4 py-4 border-b border-border">
        <div className="text-sm font-semibold text-text">Cognitive Venture OS</div>
        <div className="text-xs text-muted">MVP · v0.1</div>
      </div>
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {NAV.map((item) => {
          // active 判定：精确匹配或带 `/` 前缀的子路径
          const active = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition',
                active
                  ? 'bg-panel-2 text-text border border-border'
                  : 'text-muted hover:text-text hover:bg-panel-2',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-border text-xs text-muted">
        mock data layer
      </div>
    </aside>
  );
}
