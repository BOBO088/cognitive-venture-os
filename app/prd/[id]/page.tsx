/**
 * /prd/[id] — PRD 详情 + 编辑 + 导出。
 *
 * 数据流：
 *   page (RSC)
 *     → lib/services/prdService.getPRD
 *     → lib/services/mvpProjectService.getMVPProject
 *     → lib/services/opportunityService.getOpportunity
 *     → lib/services/prdService.listPRDsByMVP  (展示 "其他版本" 链接)
 *
 * 9 个 section 用 Card 只读展示 + 底部一个 PRDForm（10 个字段 title + 9 sections）。
 * 顶部右侧 = export + generate new version + delete。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PRDForm } from '@/components/prd/PRDForm';
import { PRDVersionBadge } from '@/components/prd/PRDVersionBadge';
import { PRDDraftNotice } from '@/components/prd/PRDDraftNotice';
import { PRDReportButton } from '@/components/prd/PRDReportButton';
import {
  getPRD,
  listPRDsByMVP,
} from '@/lib/services/prdService';
import { listTasks } from '@/lib/repos/tasks';
import { getMVPProject } from '@/lib/services/mvpProjectService';
import { getOpportunity } from '@/lib/services/opportunityService';
import { updatePRDAction, deletePRDAction } from '../actions';
import type { MVPProject, PRD } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

const SECTIONS: Array<{
  key: keyof Pick<
    PRD,
    | 'productPositioning'
    | 'targetUsers'
    | 'corePainPoints'
    | 'mvpFeatureScope'
    | 'pageStructure'
    | 'dataModel'
    | 'apiDesign'
    | 'acceptanceCriteria'
    | 'devPlan'
  >;
  title: string;
}> = [
  { key: 'productPositioning', title: '1. 产品定位' },
  { key: 'targetUsers', title: '2. 目标用户' },
  { key: 'corePainPoints', title: '3. 核心痛点' },
  { key: 'mvpFeatureScope', title: '4. MVP 功能范围' },
  { key: 'pageStructure', title: '5. 页面结构' },
  { key: 'dataModel', title: '6. 数据模型' },
  { key: 'apiDesign', title: '7. API 设计' },
  { key: 'acceptanceCriteria', title: '8. 验收标准' },
  { key: 'devPlan', title: '9. 7 天开发计划' },
];

function fallbackMVP(prd: PRD): MVPProject {
  return {
    id: prd.mvpProjectId,
    opportunityId: '',
    name: '(unknown MVP)',
    description: '',
    stage: 'idea',
    owner: '',
    startDate: '2026-01-01',
    launchDate: undefined,
    revenue: 0,
    cost: 0,
    lessons: '',
    createdAt: prd.createdAt,
    updatedAt: prd.updatedAt,
  };
}

export default async function PRDDetailPage({ params }: PageProps) {
  const { id } = await params;
  const prd = await getPRD(id);
  if (!prd) notFound();

  const allTasks = await listTasks();
  const relatedTasks = allTasks
    .filter((t) => t.sourcePRDid === prd.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const relatedRuns = Array.from(
    new Set(relatedTasks.map((t) => t.generatorRunId).filter((x): x is string => !!x)),
  );
  const [mvp, allVersions] = await Promise.all([
    getMVPProject(prd.mvpProjectId),
    listPRDsByMVP(prd.mvpProjectId),
  ]);
  const opportunity = mvp ? await getOpportunity(mvp.opportunityId) : undefined;

  // 其他版本：当前 id 排除
  const otherVersions = allVersions.filter((p) => p.id !== prd.id);

  const reportInput = {
    generatedAt: '2026-06-25T12:00:00.000Z',
    project: prd,
    mvpProject: mvp ?? fallbackMVP(prd),
    ...(opportunity ? { opportunity } : {}),
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <Link href="/prd" className="text-sm text-muted hover:text-text">
          ← Back to PRD library
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">{prd.title}</h1>
              <PRDVersionBadge version={prd.version} />
              {prd.generatedByMock && <Badge tone="warn">mock</Badge>}
            </div>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              <Link
                href={`/mvp/${prd.mvpProjectId}`}
                className="text-muted hover:text-accent"
              >
                {mvp?.name ?? prd.mvpProjectId}
              </Link>
              <span className="mx-1">·</span>
              <span>
                created {fmtDate(prd.createdAt)} · updated {fmtDate(prd.updatedAt)}
              </span>
              <span className="mx-1">·</span>
              <span className="font-mono">{prd.id}</span>
            </div>
            {opportunity && (
              <div className="mt-2 text-sm">
                From{' '}
                <Link
                  href={`/opportunities/${opportunity.id}`}
                  className="text-accent hover:underline"
                >
                  {opportunity.title}
                </Link>{' '}
                <span className="text-xs text-muted">({opportunity.status})</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <PRDReportButton input={reportInput} />
            <Link href={`/prd/new?mvpProjectId=${prd.mvpProjectId}`}>
              <Button variant="secondary">Generate new version</Button>
            </Link>
            {relatedRuns.length > 0 ? (
              <Link href={`/codex-tasks/${relatedRuns[0]!}`}>
                <Button variant="secondary">View latest Codex run →</Button>
              </Link>
            ) : (
              <Link href={`/codex-tasks/new?prdId=${prd.id}`}>
                <Button variant="secondary">Generate Codex task list →</Button>
              </Link>
            )}
            <Link
              href="/codex-tasks"
              className="text-xs text-muted hover:text-text"
            >
              Codex generator{relatedTasks.length > 0 ? ` (${relatedTasks.length} task${relatedTasks.length === 1 ? '' : 's'})` : ''}
            </Link>
            <form
              action={async () => {
                'use server';
                await deletePRDAction(prd.id);
              }}
            >
              <Button type="submit" variant="ghost">Delete PRD</Button>
            </form>
          </div>
        </div>
      </Card>

      <PRDDraftNotice visible={prd.generatedByMock} />

      {otherVersions.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Other versions of this PRD{' '}
            <span className="text-text">({otherVersions.length})</span>
          </h2>
          <ul className="text-sm flex flex-col gap-1.5">
            {otherVersions.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <PRDVersionBadge version={p.version} />
                <Link
                  href={`/prd/${p.id}`}
                  className="text-text hover:text-accent"
                >
                  {p.title}
                </Link>
                <span className="text-xs text-muted">
                  · updated {fmtDate(p.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">PRD content</h2>
        {SECTIONS.map((s) => (
          <Card key={s.key}>
            <h3 className="text-sm font-medium text-text mb-2">{s.title}</h3>
            <p className="text-sm text-text whitespace-pre-wrap font-mono">
              {prd[s.key]}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <PRDForm
          initial={prd}
          submitLabel="Save changes"
          formAction={updatePRDAction}
        />
      </Card>
    </div>
  );
}
