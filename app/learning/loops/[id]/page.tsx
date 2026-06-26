/**
 * /learning/loops/[id] — 单条 loop 详情 + 编辑 + 删除 + 创建 v+1。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoopForm } from '@/components/iteration/LoopForm';
import { getLoopVersion } from '@/lib/services/loopVersionService';
import { listImprovementLogsByTarget } from '@/lib/services/improvementLogService';
import {
  updateLoopVersionAction,
  deleteLoopVersionAction,
} from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export default async function LoopDetailPage({ params }: PageProps) {
  const { id } = await params;
  const loop = await getLoopVersion(id);
  if (!loop) notFound();

  const onDelete = deleteLoopVersionAction.bind(null, loop.id);
  const improvements = await listImprovementLogsByTarget(loop.id);

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link
          href="/learning/loops"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to loops
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">
                {loop.name} · v{loop.version}
              </h1>
              {loop.score !== null && (
                <Badge
                  tone={
                    loop.score >= 75
                      ? 'ok'
                      : loop.score >= 50
                        ? 'warn'
                        : 'danger'
                  }
                >
                  Score {loop.score}
                </Badge>
              )}
            </div>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              <span>created {fmtDate(loop.createdAt)} · updated {fmtDate(loop.updatedAt)}</span>
              <span className="mx-1">·</span>
              <span className="font-mono">{loop.id}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href={`/learning/loops/new?name=${encodeURIComponent(loop.name)}`}
              className="text-xs text-accent hover:underline"
            >
              Create v{loop.version + 1} →
            </Link>
            <Link
              href={`/learning/improvements/new?targetType=loop&targetId=${loop.id}`}
              className="text-xs text-accent hover:underline"
            >
              Log an improvement for this loop →
            </Link>
            <Link
              href="/learning/loops"
              className="text-xs text-muted hover:text-text"
            >
              All loops
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">Steps</h2>
          <ol className="text-sm text-text list-decimal list-inside flex flex-col gap-1">
            {loop.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Stop condition
          </h2>
          <p className="text-sm text-text whitespace-pre-wrap">
            {loop.stopCondition}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">
          Evaluation criteria
        </h2>
        <p className="text-sm text-text whitespace-pre-wrap">
          {loop.evaluationCriteria}
        </p>
      </Card>

      {improvements.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Linked improvements ({improvements.length})
          </h2>
          <ul className="text-sm text-text flex flex-col gap-1.5">
            {improvements.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/learning/improvements/${i.id}`}
                  className="text-accent hover:underline"
                >
                  {i.problem.slice(0, 100)}
                  {i.problem.length > 100 ? '…' : ''}
                </Link>
                {i.result.trim().length > 0 && (
                  <Badge tone="ok" className="ml-2">
                    applied
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <LoopForm
          initial={loop}
          mode="edit"
          onSubmit={updateLoopVersionAction}
          onDelete={onDelete}
        />
      </Card>
    </div>
  );
}
