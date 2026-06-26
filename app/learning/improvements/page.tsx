/**
 * /learning/improvements — Improvement Log 列表。
 *
 *   ?targetType=<type>   按 targetType 过滤
 *   ?targetId=<id>       按 targetId 过滤
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ImprovementList } from '@/components/iteration/ImprovementList';
import {
  listImprovementLogsFiltered,
  computeImprovementLogStats,
} from '@/lib/services/improvementLogService';
import { IMPROVEMENT_TARGET_TYPES, IMPROVEMENT_TARGET_TYPE_LABEL } from '@/types';
import type { ImprovementTargetType } from '@/types';

export const metadata = {
  title: 'Improvements · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ targetType?: string; targetId?: string }>;
}

function asTargetType(
  v: string | undefined,
): ImprovementTargetType | undefined {
  if (!v) return undefined;
  if (IMPROVEMENT_TARGET_TYPES.includes(v as ImprovementTargetType)) {
    return v as ImprovementTargetType;
  }
  return undefined;
}

export default async function ImprovementsPage({ searchParams }: PageProps) {
  const { targetType: ttRaw, targetId } = await searchParams;
  const targetType = asTargetType(ttRaw);
  const filter = {
    ...(targetType ? { targetType } : {}),
    ...(targetId ? { targetId } : {}),
  };
  const [logs, stats] = await Promise.all([
    listImprovementLogsFiltered(filter),
    computeImprovementLogStats(),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">
            Improvement logs
          </h1>
          <p className="text-sm text-muted">
            {stats.totalLogs} log{stats.totalLogs === 1 ? '' : 's'} ·{' '}
            <span className="text-ok">{stats.appliedCount} applied</span> ·{' '}
            <span className="text-warn">{stats.pendingCount} pending</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/learning/prompts"
            className="text-sm text-muted hover:text-text"
          >
            Prompts
          </Link>
          <Link
            href="/learning/loops"
            className="text-sm text-muted hover:text-text"
          >
            Loops
          </Link>
          <Link href="/learning/improvements/new">
            <Button variant="primary">Log improvement</Button>
          </Link>
        </div>
      </div>

      {(targetType || targetId) && (
        <div className="text-sm text-muted flex items-center gap-2 flex-wrap">
          {targetType && (
            <span>
              type:{' '}
              <span className="text-text">
                {IMPROVEMENT_TARGET_TYPE_LABEL[targetType]}
              </span>
            </span>
          )}
          {targetId && (
            <span>
              target: <span className="text-text font-mono">{targetId}</span>
            </span>
          )}
          <Link
            href="/learning/improvements"
            className="text-xs text-accent hover:underline"
          >
            Clear filter →
          </Link>
        </div>
      )}

      <ImprovementList logs={logs} />
    </div>
  );
}
