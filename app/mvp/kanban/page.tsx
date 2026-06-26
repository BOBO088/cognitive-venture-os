/**
 * /mvp/kanban — 7 列 kanban 看板。
 * Stage 列顺序固定 = MVP_STAGES（与 service 共享）。
 */

import Link from 'next/link';
import { MVPFinancialsPanel } from '@/components/mvp/MVPFinancialsPanel';
import { MVPKanbanBoard } from '@/components/mvp/MVPKanbanBoard';
import {
  listMVPProjectsGroupedByStage,
  computeFinancialSummary,
} from '@/lib/services/mvpProjectService';
import { listOpportunities } from '@/lib/services/opportunityService';
import { transitionStageAction } from '../actions';

export const metadata = {
  title: 'MVP kanban · Cognitive Venture OS',
};

export default async function MVPKanbanPage() {
  const [grouped, opps, summary] = await Promise.all([
    listMVPProjectsGroupedByStage(),
    listOpportunities(),
    computeFinancialSummary(),
  ]);

  const titleById = new Map(opps.map((o) => [o.id, o.title]));

  // 注入 opportunityTitle 到每个 card
  const groupedWithTitles = {} as Record<
    keyof typeof grouped,
    { project: (typeof grouped)[keyof typeof grouped][number]; opportunityTitle?: string }[]
  >;
  for (const k of Object.keys(grouped) as (keyof typeof grouped)[]) {
    groupedWithTitles[k] = grouped[k].map((project) => ({
      project,
      opportunityTitle: titleById.get(project.opportunityId),
    }));
  }

  return (
    <div className="flex flex-col gap-4 max-w-[120rem]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">MVP kanban</h1>
          <p className="text-sm text-muted">
            {summary.projectCount} project{summary.projectCount === 1 ? '' : 's'} across 7 stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/mvp" className="text-sm text-muted hover:text-text">List view</Link>
          <Link href="/mvp/new" className="text-sm text-accent hover:underline">+ New MVP</Link>
        </div>
      </div>

      <MVPFinancialsPanel summary={summary} />

      <MVPKanbanBoard grouped={groupedWithTitles} moveToNextAction={transitionStageAction} />
    </div>
  );
}
