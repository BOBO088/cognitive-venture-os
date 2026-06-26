/**
 * /learning/improvements/[id] — 单条 improvement log 详情 + 编辑 + 删除。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ImprovementForm } from '@/components/iteration/ImprovementForm';
import { getImprovementLog } from '@/lib/services/improvementLogService';
import { IMPROVEMENT_TARGET_TYPE_LABEL } from '@/types';
import {
  updateImprovementLogAction,
  deleteImprovementLogAction,
} from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function statusLabel(result: string): 'Applied' | 'Pending' {
  return result.trim().length > 0 ? 'Applied' : 'Pending';
}

export default async function ImprovementDetailPage({ params }: PageProps) {
  const { id } = await params;
  const log = await getImprovementLog(id);
  if (!log) notFound();

  const onDelete = deleteImprovementLogAction.bind(null, log.id);
  const isApplied = log.result.trim().length > 0;

  // 跳到对应 target（prompt/loop 时跳详情；score_model/other 不跳）
  const targetHref =
    log.targetType === 'prompt'
      ? `/learning/prompts/${log.targetId}`
      : log.targetType === 'loop'
        ? `/learning/loops/${log.targetId}`
        : null;

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link
          href="/learning/improvements"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to improvements
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">
                {IMPROVEMENT_TARGET_TYPE_LABEL[log.targetType]} · {log.targetId}
              </h1>
              <Badge tone={isApplied ? 'ok' : 'warn'}>
                {statusLabel(log.result)}
              </Badge>
            </div>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              <span>created {fmtDate(log.createdAt)} · updated {fmtDate(log.updatedAt)}</span>
              <span className="mx-1">·</span>
              <span className="font-mono">{log.id}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {targetHref && (
              <Link
                href={targetHref}
                className="text-xs text-accent hover:underline"
              >
                Open target →
              </Link>
            )}
            <Link
              href="/learning/improvements"
              className="text-xs text-muted hover:text-text"
            >
              All improvements
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">Problem</h2>
        <p className="text-sm text-text whitespace-pre-wrap">{log.problem}</p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">Suggestion</h2>
        <p className="text-sm text-text whitespace-pre-wrap">
          {log.suggestion}
        </p>
      </Card>

      {isApplied && (
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">Result</h2>
          <p className="text-sm text-text whitespace-pre-wrap">{log.result}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <ImprovementForm
          initial={log}
          mode="edit"
          onSubmit={updateImprovementLogAction}
          onDelete={onDelete}
        />
      </Card>
    </div>
  );
}
