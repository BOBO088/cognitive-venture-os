/**
 * /mvp/[id] — MVP 项目详情 + 编辑。
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MVPForm } from '@/components/mvp/MVPForm';
import { MVPStageBadge } from '@/components/mvp/MVPStageBadge';
import { MVPFinancialsPanel } from '@/components/mvp/MVPFinancialsPanel';
import { MVPReportButton } from '@/components/mvp/MVPReportButton';
import { getMVPProject } from '@/lib/services/mvpProjectService';
import { listPRDsByMVP } from '@/lib/services/prdService';
import { listLaunchResultsByMVP } from '@/lib/repos/mvp';
import { listLessonsByProject } from '@/lib/services/lessonService';
import { getOpportunity } from '@/lib/services/opportunityService';
import { listOpportunities } from '@/lib/services/opportunityService';
import { updateMVPProjectAction, deleteMVPProjectAction } from '../actions';
import type { OpportunityStatus } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default async function MVPDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getMVPProject(id);
  if (!project) notFound();

  const [opp, allOpps, launches, prds, lessons] = await Promise.all([
    getOpportunity(project.opportunityId),
    listOpportunities(),
    listLaunchResultsByMVP(id),
    listPRDsByMVP(id),
    listLessonsByProject(id),
  ]);

  // 单项目"财务"展示 = 项目自身
  const singleSummary = summaryFromProject([project]);

  const reportInput = {
    generatedAt: '2026-06-25T12:00:00.000Z',
    project,
    ...(opp ? { opportunity: opp } : {}),
    launches,
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link href="/mvp" className="text-sm text-muted hover:text-text">
          ← Back to MVP pipeline
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">{project.name}</h1>
              <MVPStageBadge stage={project.stage} />
            </div>
            <div className="mt-1.5 text-sm text-muted">
              <span>started {fmtDate(project.startDate)}</span>
              {project.launchDate && (
                <>
                  <span className="mx-2">·</span>
                  <span>launched {fmtDate(project.launchDate)}</span>
                </>
              )}
              <span className="mx-2">·</span>
              <span>owner {project.owner}</span>
              <span className="mx-2">·</span>
              <span className="font-mono">{project.id}</span>
            </div>
            {opp && (
              <div className="mt-2 text-sm">
                From{' '}
                <Link
                  href={`/opportunities/${opp.id}`}
                  className="text-accent hover:underline"
                >
                  {opp.title}
                </Link>{' '}
                <span className="text-xs text-muted">({opp.status})</span>
              </div>
            )}
            <p className="mt-3 text-sm text-text whitespace-pre-wrap">
              {project.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <MVPReportButton input={reportInput} />
            {prds.length > 0 ? (
              <Link href={`/prd/${prds[0]!.id}`}>
                <Button variant="secondary">View latest PRD (v{prds[0]!.version}) →</Button>
              </Link>
            ) : (
              <Link href={`/prd/new?mvpProjectId=${project.id}`}>
                <Button variant="secondary">Generate PRD →</Button>
              </Link>
            )}
            <Link href="/prd" className="text-xs text-muted hover:text-text">
              PRD library{prds.length > 1 ? ` (${prds.length})` : ''}
            </Link>
            <Link href={`/learning/launch-results?projectId=${project.id}`} className="text-xs text-muted hover:text-text">
              Launch results{launches.length > 0 ? ` (${launches.length})` : ''}
            </Link>
            <Link href={`/learning/launch-results/new?projectId=${project.id}`}>
              <Button variant="secondary">Record launch →</Button>
            </Link>
            <Link href={`/learning/lessons/new?projectId=${project.id}`}>
              <Button variant="secondary">Write retro →</Button>
            </Link>
            <form
              action={async () => {
                'use server';
                await deleteMVPProjectAction(project.id);
              }}
            >
              <Button type="submit" variant="ghost">Delete project</Button>
            </form>
          </div>
        </div>
      </Card>

      <MVPFinancialsPanel summary={singleSummary} />

      {project.lessons.trim().length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">Lessons</h2>
          <p className="text-sm text-text whitespace-pre-wrap">
            {project.lessons}
          </p>
        </Card>
      )}

      {launches.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-sm font-medium text-muted">
              Launch history <span className="text-text">({launches.length})</span>
            </h2>
            <Link
              href={`/learning/launch-results?projectId=${project.id}`}
              className="text-xs text-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          <ul className="text-sm flex flex-col gap-2">
            {launches.map((l) => (
              <li key={l.id} className="border-l-2 border-border pl-3">
                <div className="text-xs text-muted">
                  <Link
                    href={`/learning/launch-results/${l.id}`}
                    className="hover:text-accent"
                  >
                    {fmtDate(l.launchDate)}
                  </Link>
                  {' · '}
                  <span className="uppercase">{l.resultStatus}</span>
                  <span> · users {l.users}</span>
                  <span> · signups {l.signups}</span>
                  <span> · traffic {l.traffic}</span>
                  <span> · conv {l.conversionRate.toFixed(1)}%</span>
                  <span> · ret {l.retentionRate.toFixed(1)}%</span>
                  {l.revenue > 0 && <span> · rev {fmtMoney(l.revenue)}</span>}
                </div>
                {l.feedbackSummary && (
                  <div className="mt-0.5 text-text">{l.feedbackSummary}</div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {lessons.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-sm font-medium text-muted">
              Lessons <span className="text-text">({lessons.length})</span>
            </h2>
            <Link
              href={`/learning/lessons?projectId=${project.id}`}
              className="text-xs text-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          <ul className="text-sm flex flex-col gap-2">
            {lessons.map((l) => (
              <li key={l.id} className="border-l-2 border-border pl-3">
                <div className="text-xs text-muted">
                  <Link
                    href={`/learning/lessons/${l.id}`}
                    className="hover:text-accent"
                  >
                    {fmtDate(l.updatedAt)}
                  </Link>
                  {l.launchResultId && (
                    <>
                      {' · '}
                      <Link
                        href={`/learning/launch-results/${l.launchResultId}`}
                        className="hover:text-accent"
                      >
                        from launch
                      </Link>
                    </>
                  )}
                </div>
                <div className="mt-0.5 text-text line-clamp-2">
                  {l.whatWorked.split('\n')[0]}
                </div>
                {l.nextAction && (
                  <div className="mt-0.5 text-xs text-muted italic">
                    → {l.nextAction.split('\n')[0]}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <MVPForm
          initial={project}
          opportunities={allOpps.map((o) => ({
            id: o.id,
            title: o.title,
            status: o.status as OpportunityStatus,
          }))}
          submitLabel="Save changes"
          formAction={updateMVPProjectAction}
        />
      </Card>
    </div>
  );
}

function summaryFromProject(
  projects: { revenue: number; cost: number; stage: string }[],
): {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  roi: number | null;
  revenueStageCount: number;
  killedStageCount: number;
  projectCount: number;
} {
  let totalRevenue = 0;
  let totalCost = 0;
  let revenueStageCount = 0;
  let killedStageCount = 0;
  for (const p of projects) {
    totalRevenue += p.revenue;
    totalCost += p.cost;
    if (p.stage === 'revenue') revenueStageCount += 1;
    if (p.stage === 'killed') killedStageCount += 1;
  }
  const netProfit = totalRevenue - totalCost;
  const roi = totalCost === 0 ? null : Math.round((netProfit / totalCost) * 1000) / 10;
  return {
    totalRevenue,
    totalCost,
    netProfit,
    roi,
    revenueStageCount,
    killedStageCount,
    projectCount: projects.length,
  };
}
