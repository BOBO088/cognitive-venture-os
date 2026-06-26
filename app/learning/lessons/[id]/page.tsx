/**
 * /learning/lessons/[id] — 复盘详情 + 编辑 + 删除 + 导出 markdown。
 *
 * 数据流：
 *   page (RSC) → lessonService.getLesson
 *              → mvpProjectService.getMVPProject（关联项目）
 *              → launchResultService.getLaunchResult（关联 launch）
 *              → listMVPProjects + listLaunchResults（编辑表单下拉用）
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { LessonForm } from '@/components/learning/LessonForm';
import { LessonReportButton } from '@/components/learning/LessonReportButton';
import { getLesson } from '@/lib/services/lessonService';
import {
  getMVPProject,
  listMVPProjects,
} from '@/lib/services/mvpProjectService';
import {
  getLaunchResult,
  listLaunchResultsFiltered,
} from '@/lib/services/launchResultService';
import { updateLessonAction, deleteLessonAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export default async function LessonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) notFound();

  const [mvp, launch, allMvps, allLaunches] = await Promise.all([
    getMVPProject(lesson.projectId),
    lesson.launchResultId
      ? getLaunchResult(lesson.launchResultId)
      : Promise.resolve(undefined),
    listMVPProjects(),
    listLaunchResultsFiltered({}),
  ]);

  const reportInput = {
    generatedAt: '2026-06-25T12:00:00.000Z',
    lesson,
    ...(mvp ? { mvpProject: mvp } : {}),
    ...(launch ? { launchResult: launch } : {}),
  };

  // 预绑 id 到 delete action
  const onDelete = deleteLessonAction.bind(null, lesson.id);

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link
          href="/learning/lessons"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to lessons
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-text">
              Retro · {fmtDate(lesson.updatedAt)}
            </h1>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              {mvp ? (
                <Link
                  href={`/mvp/${mvp.id}`}
                  className="text-muted hover:text-accent"
                >
                  {mvp.name}
                </Link>
              ) : (
                <span>{lesson.projectId}</span>
              )}
              {launch && (
                <>
                  <span className="mx-1">·</span>
                  <Link
                    href={`/learning/launch-results/${launch.id}`}
                    className="text-muted hover:text-accent"
                  >
                    launch {fmtDate(launch.launchDate)} ({launch.resultStatus})
                  </Link>
                </>
              )}
              <span className="mx-1">·</span>
              <span>
                created {fmtDate(lesson.createdAt)} · updated{' '}
                {fmtDate(lesson.updatedAt)}
              </span>
              <span className="mx-1">·</span>
              <span className="font-mono">{lesson.id}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <LessonReportButton input={reportInput} />
            <Link
              href="/learning/lessons"
              className="text-xs text-muted hover:text-text"
            >
              All lessons
            </Link>
            {mvp && (
              <Link
                href={`/mvp/${mvp.id}`}
                className="text-xs text-accent hover:underline"
              >
                View project →
              </Link>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">1. Outcome</h2>
        <Card>
          <h3 className="text-sm font-medium text-text mb-2">What worked</h3>
          <p className="text-sm text-text whitespace-pre-wrap font-mono">
            {lesson.whatWorked}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-text mb-2">What failed</h3>
          <p className="text-sm text-text whitespace-pre-wrap font-mono">
            {lesson.whatFailed}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-text mb-2">Why</h3>
          <p className="text-sm text-text whitespace-pre-wrap font-mono">
            {lesson.why}
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">2. Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <h3 className="text-sm font-medium text-text mb-2">Customer</h3>
            <p className="text-sm text-text whitespace-pre-wrap font-mono">
              {lesson.customerInsight}
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-text mb-2">Market</h3>
            <p className="text-sm text-text whitespace-pre-wrap font-mono">
              {lesson.marketInsight}
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-text mb-2">Product</h3>
            <p className="text-sm text-text whitespace-pre-wrap font-mono">
              {lesson.productInsight}
            </p>
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-text mb-2">GEO</h3>
            <p className="text-sm text-text whitespace-pre-wrap font-mono">
              {lesson.geoInsight}
            </p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">3. Action</h2>
        <Card>
          <h3 className="text-sm font-medium text-text mb-2">Next action</h3>
          <p className="text-sm text-text whitespace-pre-wrap font-mono">
            {lesson.nextAction}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-text mb-2">
            Score model suggestion
          </h3>
          <p className="text-sm text-text whitespace-pre-wrap font-mono">
            {lesson.scoreModelSuggestion}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <LessonForm
          initial={lesson}
          mode="edit"
          mvpProjects={allMvps}
          launchResults={allLaunches}
          onSubmit={updateLessonAction}
          onDelete={onDelete}
        />
      </Card>
    </div>
  );
}
