/**
 * /learning/launch-results — Launch Result 列表。
 *
 *   ?projectId=<mvpId>  限定到某个 MVP 项目（从 /mvp/[id] 跳转过来）
 *
 * 数据流：page (RSC) → launchResultService.listLaunchResultsFiltered → LaunchResultList。
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LaunchResultList } from '@/components/learning/LaunchResultList';
import {
  listLaunchResultsFiltered,
  computeLaunchResultStats,
} from '@/lib/services/launchResultService';
import { listMVPProjects, getMVPProject } from '@/lib/services/mvpProjectService';

export const metadata = {
  title: 'Launch results · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function LaunchResultsPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;
  const [allMvps, results, stats] = await Promise.all([
    listMVPProjects(),
    listLaunchResultsFiltered(
      projectId ? { mvpProjectId: projectId } : {},
    ),
    computeLaunchResultStats(),
  ]);

  const mvpMap = new Map(allMvps.map((m) => [m.id, m]));
  const focusedMvp = projectId ? await getMVPProject(projectId) : undefined;

  const rows = results.map((r) => ({
    result: r,
    mvpProject: mvpMap.get(r.mvpProjectId),
  }));

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Launch results</h1>
          <p className="text-sm text-muted">
            {stats.totalLaunches} launch
            {stats.totalLaunches === 1 ? '' : 'es'} recorded ·{' '}
            <span className="text-ok">{stats.successCount} success</span> ·{' '}
            <span className="text-muted">{stats.neutralCount} neutral</span> ·{' '}
            <span className="text-danger">{stats.failedCount} failed</span> ·{' '
            }
            <span className="text-warn">{stats.unknownCount} unknown</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/mvp" className="text-sm text-muted hover:text-text">
            MVP pipeline
          </Link>
          <Link
            href={
              projectId
                ? `/learning/launch-results/new?projectId=${projectId}`
                : '/learning/launch-results/new'
            }
          >
            <Button variant="primary">Record launch</Button>
          </Link>
        </div>
      </div>

      {focusedMvp && (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <span className="text-muted">Filtered by MVP: </span>
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
            <Link
              href="/learning/launch-results"
              className="text-xs text-accent hover:underline"
            >
              Clear filter →
            </Link>
          </div>
        </Card>
      )}

      <LaunchResultList rows={rows} />
    </div>
  );
}
