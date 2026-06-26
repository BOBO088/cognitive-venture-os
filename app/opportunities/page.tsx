import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OpportunityList } from '@/components/opportunities/OpportunityList';
import { STATUSES, STATUS_LABEL_MAP } from '@/components/opportunities/OpportunityStatusBadge';
import { listOpportunities, listOpportunitiesFiltered } from '@/lib/services/opportunityService';
import type { OpportunityStatus } from '@/types';

export const metadata = {
  title: 'Opportunities · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function OpportunitiesPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const s: OpportunityStatus | undefined = STATUSES.includes(status as OpportunityStatus)
    ? (status as OpportunityStatus)
    : undefined;

  const opps = await listOpportunitiesFiltered({ status: s });

  // chip 计数 = 全量 opportunities 按 status 分组
  const all = await listOpportunities();
  const totalByStatus: Record<string, number> = {};
  for (const o of all) {
    totalByStatus[o.status] = (totalByStatus[o.status] ?? 0) + 1;
  }

  const rows = opps.map((o) => ({
    opportunity: o,
    boundCount:
      o.relatedSignalIds.length +
      o.relatedResearchCardIds.length +
      o.relatedEntityIds.length,
  }));

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Opportunities</h1>
          <p className="text-sm text-muted">
            {opps.length} opportunit{opps.length === 1 ? 'y' : 'ies'}
            {s && (
              <span> · filtered by status: <span className="text-text">{STATUS_LABEL_MAP[s]}</span></span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/opportunities/signals" className="text-sm text-muted hover:text-text">Signals</Link>
          <Link href="/opportunities/evaluations" className="text-sm text-muted hover:text-text">Evaluations</Link>
          <Link href="/opportunities/ranking" className="text-sm text-muted hover:text-text">Ranking</Link>
          <Link href="/mvp" className="text-sm text-muted hover:text-text">MVP pipeline</Link>
          <Link href="/opportunities/new">
            <Button variant="primary">New opportunity</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted mr-1">Status:</span>
          <Link
            href="/opportunities"
            className={
              'text-xs px-2 py-1 rounded border ' +
              (!s
                ? 'border-accent text-accent bg-accent/5'
                : 'border-border text-muted hover:text-text')
            }
          >
            All ({all.length})
          </Link>
          {STATUSES.map((st) => {
            const active = s === st;
            const href = active ? '/opportunities' : `/opportunities?status=${st}`;
            return (
              <Link
                key={st}
                href={href}
                className={
                  'text-xs px-2 py-1 rounded border ' +
                  (active
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-border text-muted hover:text-text')
                }
              >
                {STATUS_LABEL_MAP[st]} ({totalByStatus[st] ?? 0})
              </Link>
            );
          })}
        </div>
      </Card>

      <OpportunityList rows={rows} />
    </div>
  );
}
