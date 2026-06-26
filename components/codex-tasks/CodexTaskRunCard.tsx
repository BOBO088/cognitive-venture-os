/**
 * CodexTaskRunCard — 单次 run 的卡片视图。RSC。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { CodexTaskRun, MVPProject, PRD } from '@/types';

interface Props {
  run: CodexTaskRun;
  mvpProject?: MVPProject;
  prd?: PRD;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function CodexTaskRunCard({ run, mvpProject, prd }: Props) {
  const firstTask = run.tasks[0];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-text">
              {mvpProject?.name ?? run.mvpProjectId}
            </h3>
            {prd && (
              <span className="text-xs text-muted">
                · {prd.title} (v{prd.version})
              </span>
            )}
          </div>
          {run.summary && (
            <p className="text-xs text-muted mt-1 line-clamp-2">{run.summary}</p>
          )}
          <div className="mt-2 text-xs text-muted flex items-center gap-2 flex-wrap">
            <span>
              {run.tasks.length} task{run.tasks.length === 1 ? '' : 's'}
            </span>
            <span>·</span>
            <span>created {fmtDate(run.createdAt)}</span>
            <span>·</span>
            <span>updated {fmtDate(run.updatedAt)}</span>
            <span>·</span>
            <span className="font-mono">{run.id}</span>
          </div>
          {firstTask && (
            <div className="mt-2 text-xs text-text">
              <span className="text-muted">First task:</span> {firstTask.title}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link
            href={`/codex-tasks/${run.id}`}
            className="text-sm text-accent hover:underline"
          >
            Open run →
          </Link>
        </div>
      </div>
    </Card>
  );
}
