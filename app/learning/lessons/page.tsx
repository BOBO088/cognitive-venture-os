/**
 * /learning/lessons — 复盘列表。
 *
 *   ?projectId=<mvpId>      限定到某个 MVP
 *   ?launchId=<resultId>    限定到某个 launch result
 *
 * 数据流：page (RSC) → lessonService.listLessonsFiltered → LessonList。
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LessonList } from '@/components/learning/LessonList';
import {
  listLessonsFiltered,
  computeLessonStats,
} from '@/lib/services/lessonService';
import {
  listMVPProjects,
  getMVPProject,
} from '@/lib/services/mvpProjectService';
import {
  listLaunchResultsFiltered,
  getLaunchResult,
} from '@/lib/services/launchResultService';

export const metadata = {
  title: 'Lessons · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ projectId?: string; launchId?: string }>;
}

export default async function LessonsPage({ searchParams }: PageProps) {
  const { projectId, launchId } = await searchParams;
  const [allMvps, allLaunches, lessons, stats] = await Promise.all([
    listMVPProjects(),
    listLaunchResultsFiltered({}),
    listLessonsFiltered({
      ...(projectId ? { projectId } : {}),
      ...(launchId ? { launchResultId: launchId } : {}),
    }),
    computeLessonStats(),
  ]);

  const mvpMap = new Map(allMvps.map((m) => [m.id, m]));
  const launchMap = new Map(allLaunches.map((l) => [l.id, l]));

  const focusedMvp = projectId ? await getMVPProject(projectId) : undefined;
  const focusedLaunch = launchId ? await getLaunchResult(launchId) : undefined;

  const rows = lessons.map((l) => ({
    lesson: l,
    mvpProject: mvpMap.get(l.projectId),
    launchResult: l.launchResultId
      ? launchMap.get(l.launchResultId)
      : undefined,
  }));

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Lessons</h1>
          <p className="text-sm text-muted">
            {stats.totalLessons} retro
            {stats.totalLessons === 1 ? '' : 's'} recorded ·{' '}
            {stats.withLaunchCount} linked to a launch
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/learning/launch-results"
            className="text-sm text-muted hover:text-text"
          >
            Launch results
          </Link>
          <Link
            href={
              projectId
                ? `/learning/lessons/new?projectId=${projectId}`
                : launchId
                  ? `/learning/lessons/new?launchId=${launchId}`
                  : '/learning/lessons/new'
            }
          >
            <Button variant="primary">Write retro</Button>
          </Link>
        </div>
      </div>

      {(focusedMvp || focusedLaunch) && (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
            <div className="flex flex-col gap-1">
              {focusedMvp && (
                <div>
                  <span className="text-muted">Project: </span>
                  <Link
                    href={`/mvp/${focusedMvp.id}`}
                    className="text-text hover:text-accent font-medium"
                  >
                    {focusedMvp.name}
                  </Link>
                  <span className="text-xs text-muted ml-2">
                    · stage {focusedMvp.stage}
                  </span>
                </div>
              )}
              {focusedLaunch && (
                <div>
                  <span className="text-muted">Launch: </span>
                  <Link
                    href={`/learning/launch-results/${focusedLaunch.id}`}
                    className="text-text hover:text-accent"
                  >
                    {focusedLaunch.launchDate} · {focusedLaunch.resultStatus}
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/learning/lessons"
              className="text-xs text-accent hover:underline"
            >
              Clear filter →
            </Link>
          </div>
        </Card>
      )}

      <LessonList rows={rows} />
    </div>
  );
}
