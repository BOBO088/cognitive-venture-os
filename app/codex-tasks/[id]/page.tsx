/**
 * /codex-tasks/[id] — 一次 Codex Task Generator run 的详情。
 *
 * 数据流：
 *   page (RSC)
 *     → lib/services/codexTaskGeneratorService.getCodexTaskRun
 *     → lib/services/mvpProjectService.getMVPProject
 *     → lib/services/prdService.getPRD
 *
 * 渲染：
 *   - Header：run id / MVP / PRD 链接 / summary / 状态汇总
 *   - 6 个 task 卡片：状态、优先级、phase、category、codexCommand + 复制按钮
 *   - 底部：export run（markdown）/ delete run
 *   - 每个 task 卡片含"Open in Task Board →"链接到 /tasks/[id]
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { CodexTaskCategoryBadge } from '@/components/codex-tasks/CodexTaskCategoryBadge';
import { CodexCommandCopyButton } from '@/components/codex-tasks/CodexCommandCopyButton';
import { CodexTaskRunReportButton } from '@/components/codex-tasks/CodexTaskRunReportButton';
import { getCodexTaskRun } from '@/lib/services/codexTaskGeneratorService';
import { getMVPProject } from '@/lib/services/mvpProjectService';
import { getPRD } from '@/lib/services/prdService';
import { deleteCodexTaskRunAction } from '../actions';
import { CODEX_TASK_CATEGORIES, type CodexTaskCategory } from '@/types';
import type { Task } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

const CATEGORY_BY_KEYWORD: Array<[CodexTaskCategory, RegExp]> = [
  ['architecture', /架构|目录骨架/i],
  ['data_model', /数据模型|repo|mock 数据/i],
  ['page', /页面|form/i],
  ['api', /API|REST/i],
  ['test', /测试|test/i],
  ['deploy', /部署|环境变量|\.env/i],
];

function detectCategory(task: Task): CodexTaskCategory | undefined {
  for (const [cat, re] of CATEGORY_BY_KEYWORD) {
    if (re.test(task.title)) return cat;
  }
  return undefined;
}

export default async function CodexTaskRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  const run = await getCodexTaskRun(id);
  if (!run) notFound();

  const [mvp, prd] = await Promise.all([
    getMVPProject(run.mvpProjectId),
    getPRD(run.sourcePRDid),
  ]);

  // 统计
  const byStatus: Record<string, number> = {};
  for (const t of run.tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  }

  const reportInput = {
    generatedAt: '2026-06-25T12:00:00.000Z',
    run,
    mvpProject: mvp ?? {
      id: run.mvpProjectId,
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
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    },
    prd: prd ?? {
      id: run.sourcePRDid,
      mvpProjectId: run.mvpProjectId,
      version: 1,
      title: '(unknown PRD)',
      productPositioning: '',
      targetUsers: '',
      corePainPoints: '',
      mvpFeatureScope: '',
      pageStructure: '',
      dataModel: '',
      apiDesign: '',
      acceptanceCriteria: '',
      devPlan: '',
      generatedByMock: false,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    },
    tasks: run.tasks,
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <Link href="/codex-tasks" className="text-sm text-muted hover:text-text">
          ← Back to Codex Task Generator
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">
                Codex run — {mvp?.name ?? run.mvpProjectId}
              </h1>
              {prd && (
                <Link
                  href={`/prd/${prd.id}`}
                  className="text-sm text-accent hover:underline"
                >
                  {prd.title} v{prd.version}
                </Link>
              )}
              <Badge tone="accent">{run.tasks.length} tasks</Badge>
            </div>
            {run.summary && (
              <p className="mt-2 text-sm text-text whitespace-pre-wrap">
                {run.summary}
              </p>
            )}
            <div className="mt-2 text-xs text-muted flex items-center gap-2 flex-wrap">
              <span>created {fmtDate(run.createdAt)}</span>
              <span>·</span>
              <span>updated {fmtDate(run.updatedAt)}</span>
              <span>·</span>
              <span className="font-mono">{run.id}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted flex-wrap">
              {(['backlog', 'doing', 'review', 'done', 'failed'] as const).map((s) => (
                <span key={s}>
                  <Badge tone={s === 'done' ? 'ok' : s === 'failed' ? 'danger' : s === 'doing' ? 'accent' : s === 'review' ? 'warn' : 'neutral'}>
                    {s}
                  </Badge>
                  <span className="ml-1 mr-2">{byStatus[s] ?? 0}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <CodexTaskRunReportButton input={reportInput} />
            <form
              action={async () => {
                'use server';
                await deleteCodexTaskRunAction(run.id);
              }}
            >
              <Button type="submit" variant="ghost">Delete run</Button>
            </form>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">Generated tasks</h2>
        {run.tasks.map((t, i) => {
          const cat = detectCategory(t);
          return (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted font-mono">#{i + 1}</span>
                    <Link
                      href={`/tasks/${t.id}`}
                      className="text-sm font-semibold text-text hover:text-accent"
                    >
                      {t.title}
                    </Link>
                    <TaskStatusBadge status={t.status} />
                    <TaskPriorityBadge priority={t.priority} />
                    {cat && <CodexTaskCategoryBadge category={cat} />}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    <span>phase: {t.phase ?? '—'}</span>
                    <span className="mx-2">·</span>
                    <span className="font-mono">{t.id}</span>
                  </div>
                  {t.description && (
                    <p className="mt-2 text-sm text-text whitespace-pre-wrap">
                      {t.description}
                    </p>
                  )}
                  {t.changedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-muted">
                      <span className="text-text">Expected files:</span>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {t.changedFiles.map((f) => (
                          <li key={f} className="font-mono">
                            · {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {t.codexCommand && (
                  <div className="flex flex-col items-end gap-2 shrink-0 min-w-0 max-w-md">
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      Codex command
                    </span>
                    <pre className="w-full text-[11px] font-mono bg-panel-2 border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                      {t.codexCommand}
                    </pre>
                    <CodexCommandCopyButton command={t.codexCommand} />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">Category coverage</h2>
        <p className="text-xs text-muted mb-2">
          6 大分类（{CODEX_TASK_CATEGORIES.length} 个）的覆盖情况（按 task 标题关键词反查）：
        </p>
        <ul className="text-xs flex flex-col gap-1">
          {CODEX_TASK_CATEGORIES.map((c) => {
            const matched = run.tasks.filter((t) => detectCategory(t) === c);
            return (
              <li key={c} className="flex items-center gap-2">
                <CodexTaskCategoryBadge category={c} />
                <span className="text-muted">{matched.length} task(s)</span>
                {matched.length === 0 && (
                  <span className="text-[10px] text-warn">（可能没匹配上）</span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
