/**
 * /mvp — MVP 项目列表 + 阶段过滤 + 财务汇总。
 */

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MVPList } from '@/components/mvp/MVPList';
import { MVPFinancialsPanel } from '@/components/mvp/MVPFinancialsPanel';
import { MVP_STAGES, MVP_STAGE_LABEL, type MVPStage } from '@/types';
import {
  listMVPProjectsFiltered,
  computeFinancialSummary,
} from '@/lib/services/mvpProjectService';
import { listOpportunities } from '@/lib/services/opportunityService';

export const metadata = {
  title: 'MVP pipeline · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ stage?: string }>;
}

export default async function MVPPage({ searchParams }: PageProps) {
  const { stage } = await searchParams;
  const stageFilter: MVPStage | undefined = MVP_STAGES.includes(
    stage as MVPStage,
  )
    ? (stage as MVPStage)
    : undefined;

  const [projects, opps, summary] = await Promise.all([
    listMVPProjectsFiltered({ stage: stageFilter }),
    listOpportunities(),
    computeFinancialSummary(),
  ]);

  const titleById = new Map(opps.map((o) => [o.id, o.title]));
  const rows = projects.map((p) => ({
    project: p,
    opportunityTitle: titleById.get(p.opportunityId),
  }));

  // chip 计数 = 全量 projects 按 stage 分组
  const allProjects = await listMVPProjectsFiltered({});
  const totalByStage: Record<string, number> = {};
  for (const p of allProjects) {
    totalByStage[p.stage] = (totalByStage[p.stage] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">MVP pipeline</h1>
          <p className="text-sm text-muted">
            {projects.length} project{projects.length === 1 ? '' : 's'}
            {stageFilter && (
              <span> · filtered by stage: <span className="text-text">{MVP_STAGE_LABEL[stageFilter]}</span></span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/mvp/kanban" className="text-sm text-muted hover:text-text">Kanban</Link>
          <Link href="/opportunities/ranking" className="text-sm text-muted hover:text-text">Opportunity ranking</Link>
          <Link href="/prd" className="text-sm text-muted hover:text-text">PRD library</Link>
          <Link href="/mvp/new">
            <Button variant="primary">New MVP project</Button>
          </Link>
        </div>
      </div>

      <MVPFinancialsPanel summary={summary} />

      <Card>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted mr-1">Stage:</span>
          <Link
            href="/mvp"
            className={
              'text-xs px-2 py-1 rounded border ' +
              (!stageFilter
                ? 'border-accent text-accent bg-accent/5'
                : 'border-border text-muted hover:text-text')
            }
          >
            All ({allProjects.length})
          </Link>
          {MVP_STAGES.map((s) => {
            const active = stageFilter === s;
            return (
              <Link
                key={s}
                href={active ? '/mvp' : `/mvp?stage=${s}`}
                className={
                  'text-xs px-2 py-1 rounded border ' +
                  (active
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-border text-muted hover:text-text')
                }
              >
                {MVP_STAGE_LABEL[s]} ({totalByStage[s] ?? 0})
              </Link>
            );
          })}
        </div>
      </Card>

      <MVPList rows={rows} />
    </div>
  );
}
