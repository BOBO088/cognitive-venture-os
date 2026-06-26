/**
 * /prd — 全量 PRD 列表，按 MVPProject 分组（每组内按 version desc）。
 *
 * 数据流：page (RSC) → service.listPRDsGroupedByMVP → 每组渲染 PRDList。
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PRDList } from '@/components/prd/PRDList';
import { listPRDsGroupedByMVP } from '@/lib/services/prdService';
import { listMVPProjects } from '@/lib/services/mvpProjectService';

export const metadata = {
  title: 'PRD library · Cognitive Venture OS',
};

export default async function PRDIndexPage() {
  const [groups, allProjects] = await Promise.all([
    listPRDsGroupedByMVP(),
    listMVPProjects(),
  ]);

  const totalPrds = groups.reduce((s, g) => s + g.prds.length, 0);
  const projectIdsWithPrd = new Set(groups.map((g) => g.mvpProject.id));
  const projectsWithoutPrd = allProjects.filter(
    (p) => !projectIdsWithPrd.has(p.id),
  );

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">PRD library</h1>
          <p className="text-sm text-muted">
            {totalPrds} PRD{totalPrds === 1 ? '' : 's'} across{' '}
            {groups.length} MVP project{groups.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/mvp" className="text-sm text-muted hover:text-text">
            MVP pipeline
          </Link>
          <Link href="/prd/new">
            <Button variant="primary">Generate PRD</Button>
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <div className="text-sm text-muted">
            No PRDs yet. Pick an MVP project to generate a draft.
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ mvpProject, prds }) => (
            <div key={mvpProject.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Link
                  href={`/mvp/${mvpProject.id}`}
                  className="text-sm font-medium text-text hover:text-accent"
                >
                  {mvpProject.name}
                </Link>
                <span className="text-[11px] text-muted">
                  · stage <span className="text-text">{mvpProject.stage}</span> · {prds.length} version
                  {prds.length === 1 ? '' : 's'}
                </span>
                <Link
                  href={`/prd/new?mvpProjectId=${mvpProject.id}`}
                  className="ml-auto text-[11px] text-accent hover:underline"
                >
                  + new version
                </Link>
              </div>
              <PRDList rows={prds.map((p) => ({ prd: p }))} />
            </div>
          ))}
        </div>
      )}

      {projectsWithoutPrd.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <div className="text-text font-medium">
                {projectsWithoutPrd.length} MVP project
                {projectsWithoutPrd.length === 1 ? '' : 's'} without a PRD
              </div>
              <div className="text-xs text-muted mt-0.5">
                {projectsWithoutPrd
                  .slice(0, 5)
                  .map((p) => p.name)
                  .join(', ')}
                {projectsWithoutPrd.length > 5 ? '…' : ''}
              </div>
            </div>
            <Link
              href={`/prd/new?mvpProjectId=${projectsWithoutPrd[0]!.id}`}
              className="text-xs text-accent hover:underline"
            >
              Generate one →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
