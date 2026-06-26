import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { DomainStat } from '@/lib/services/dashboardService';

/**
 * 7 大域统计网格。点击卡片跳转对应域主入口。
 */
export function StatGrid({ stats }: { stats: DomainStat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Link key={s.key} href={s.href} className="block group">
          <Card className="transition group-hover:border-accent">
            <div className="text-xs uppercase tracking-wider text-muted">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold text-text">{s.count}</div>
            <div className="mt-1 text-xs text-muted">{s.hint}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
