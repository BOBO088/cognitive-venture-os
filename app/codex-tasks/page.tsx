/**
 * /codex-tasks — 所有 Codex Task Generator run 的列表。
 *
 * 数据流：page (RSC) → listCodexTaskRuns（service）→ 每条 run 装配 MVP / PRD → 渲染卡片。
 *
 * 同时展示"还没有 run" 的引导 + Generate 入口。
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CodexTaskRunList } from '@/components/codex-tasks/CodexTaskRunList';
import { listCodexTaskRuns } from '@/lib/services/codexTaskGeneratorService';
import { listPRDs } from '@/lib/services/prdService';
import { listMVPProjects } from '@/lib/services/mvpProjectService';

export const metadata = {
  title: 'Codex Task Generator · Cognitive Venture OS',
};

export default async function CodexTasksPage() {
  const [runs, prds, projects] = await Promise.all([
    listCodexTaskRuns(),
    listPRDs(),
    listMVPProjects(),
  ]);

  const mvpById = new Map(projects.map((p) => [p.id, p]));
  const prdById = new Map(prds.map((p) => [p.id, p]));

  const rows = runs.map((r) => {
    const prd = prdById.get(r.sourcePRDid);
    const mvpProject = mvpById.get(r.mvpProjectId) ?? (prd ? mvpById.get(prd.mvpProjectId) : undefined);
    return { run: r, ...(mvpProject ? { mvpProject } : {}), ...(prd ? { prd } : {}) };
  });

  const hasAnyPrd = prds.length > 0;
  const totalTasks = runs.reduce((s, r) => s + r.tasks.length, 0);

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Codex Task Generator</h1>
          <p className="text-sm text-muted">
            {runs.length} run{runs.length === 1 ? '' : 's'} · {totalTasks} task
            {totalTasks === 1 ? '' : 's'} generated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tasks" className="text-sm text-muted hover:text-text">
            Task Board
          </Link>
          <Link href="/prd" className="text-sm text-muted hover:text-text">
            PRD library
          </Link>
          <Link href="/codex-tasks/new">
            <Button variant="primary" disabled={!hasAnyPrd}>
              Generate from PRD
            </Button>
          </Link>
        </div>
      </div>

      <CodexTaskRunList rows={rows} />

      {!hasAnyPrd && (
        <Card>
          <div className="text-sm text-muted">
            暂无 PRD。先在{' '}
            <Link href="/prd/new" className="text-accent hover:underline">
              PRD library
            </Link>{' '}
            生成一份 PRD，再回来派生 Codex 任务。
          </div>
        </Card>
      )}
    </div>
  );
}
