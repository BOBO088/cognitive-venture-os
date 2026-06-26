/**
 * /learning/launch-results/[id] — 单条 launch 详情 + 编辑 + 删除。
 *
 * 数据流：
 *   page (RSC) → launchResultService.getLaunchResult
 *              → mvpProjectService.getMVPProject（关联 MVP）
 *              → listMVPProjects（编辑表单用）
 *
 * 顶部只读卡片展示 13 个字段；底部 LaunchResultForm 走 server action。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { LaunchResultStatusBadge } from '@/components/learning/LaunchResultStatusBadge';
import { LaunchResultForm } from '@/components/learning/LaunchResultForm';
import { getLaunchResult } from '@/lib/services/launchResultService';
import {
  getMVPProject,
  listMVPProjects,
} from '@/lib/services/mvpProjectService';
import { updateLaunchResultAction, deleteLaunchResultAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default async function LaunchResultDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getLaunchResult(id);
  if (!result) notFound();

  const [mvp, allMvps] = await Promise.all([
    getMVPProject(result.mvpProjectId),
    listMVPProjects(),
  ]);

  // 预绑 id 到 delete action，避免在客户端拼接
  const onDelete = deleteLaunchResultAction.bind(null, result.id);

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link
          href="/learning/launch-results"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to launch results
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">
                Launch · {fmtDate(result.launchDate)}
              </h1>
              <LaunchResultStatusBadge status={result.resultStatus} />
            </div>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              {mvp ? (
                <Link
                  href={`/mvp/${mvp.id}`}
                  className="text-muted hover:text-accent"
                >
                  {mvp.name}
                </Link>
              ) : (
                <span>{result.mvpProjectId}</span>
              )}
              <span className="mx-1">·</span>
              <span>
                created {fmtDate(result.createdAt)} · updated{' '}
                {fmtDate(result.updatedAt)}
              </span>
              <span className="mx-1">·</span>
              <span className="font-mono">{result.id}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href="/learning/launch-results"
              className="text-xs text-muted hover:text-text"
            >
              All launches
            </Link>
            {mvp && (
              <Link
                href={`/mvp/${mvp.id}`}
                className="text-xs text-accent hover:underline"
              >
                View MVP →
              </Link>
            )}
            <Link
              href={`/learning/lessons/new?launchId=${result.id}&prefill=1`}
              className="text-xs text-accent hover:underline"
            >
              Write retro from this launch →
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Users
          </div>
          <div className="mt-1 text-2xl font-semibold font-mono text-text">
            {result.users}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Signups
          </div>
          <div className="mt-1 text-2xl font-semibold font-mono text-text">
            {result.signups}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Traffic
          </div>
          <div className="mt-1 text-2xl font-semibold font-mono text-text">
            {result.traffic}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Revenue
          </div>
          <div className="mt-1 text-2xl font-semibold font-mono text-text">
            {fmtMoney(result.revenue)}
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted">
            Conversion rate
          </div>
          <div className="mt-1 text-2xl font-semibold font-mono text-text">
            {result.conversionRate.toFixed(1)}%
          </div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wider text-muted">
            7-day retention
          </div>
          <div className="mt-1 text-2xl font-semibold font-mono text-text">
            {result.retentionRate.toFixed(1)}%
          </div>
        </Card>
      </div>

      {result.feedbackSummary && (
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Feedback summary
          </h2>
          <p className="text-sm text-text whitespace-pre-wrap">
            {result.feedbackSummary}
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <LaunchResultForm
          initial={result}
          mode="edit"
          mvpProjects={allMvps}
          onSubmit={updateLaunchResultAction}
          onDelete={onDelete}
        />
      </Card>
    </div>
  );
}
