/**
 * CodexTaskRunList — 列表视图（按 PRD/MVP 分组或扁平）。
 * RSC。已 group 好的 runs 直接渲染。
 */
import { Card } from '@/components/ui/Card';
import { CodexTaskRunCard } from './CodexTaskRunCard';
import type { CodexTaskRun, MVPProject, PRD } from '@/types';

interface Row {
  run: CodexTaskRun;
  mvpProject?: MVPProject;
  prd?: PRD;
}

export function CodexTaskRunList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          暂无 run。从任一 PRD 详情页点击 "Generate Codex task list →" 即可生成 6 步任务。
        </div>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <CodexTaskRunCard
          key={r.run.id}
          run={r.run}
          {...(r.mvpProject ? { mvpProject: r.mvpProject } : {})}
          {...(r.prd ? { prd: r.prd } : {})}
        />
      ))}
    </div>
  );
}
