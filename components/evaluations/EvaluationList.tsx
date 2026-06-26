/**
 * EvaluationList — 渲染 evaluations（按 opportunity 分组，每组内按时间倒序）。
 * RSC；不含 client 交互。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EvaluationScoreBar } from './EvaluationScoreBar';
import type { OpportunityEvaluation, Opportunity } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

interface Group {
  opportunity: Opportunity;
  evaluations: OpportunityEvaluation[];
}

interface Props {
  groups: Group[];
  /** 控制是否显示 "View detail" 链接（detail 页面未实现时设为 false） */
  showDetailLink?: boolean;
}

export function EvaluationList({ groups, showDetailLink = false }: Props) {
  if (groups.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No evaluations yet. Score an opportunity to get started.
        </div>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const sorted = [...g.evaluations].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
        const latest = sorted[0]!;
        return (
          <Card key={g.opportunity.id}>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/opportunities/${g.opportunity.id}`}
                    className="text-sm font-medium text-text hover:text-accent"
                  >
                    {g.opportunity.title}
                  </Link>
                  <span className="text-xs text-muted font-mono">
                    {g.opportunity.id}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">
                  {sorted.length} evaluation{sorted.length === 1 ? '' : 's'} ·
                  latest {fmtDate(latest.createdAt)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-muted">Latest total</span>
                <EvaluationScoreBar score={latest.totalScore} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {sorted.map((e) => (
                <div
                  key={e.id}
                  className="rounded border border-border bg-panel-2 p-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[10px] text-muted">
                      {fmtDate(e.createdAt)}
                    </span>
                    <span className="tabular-nums text-text">
                      {e.totalScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-muted line-clamp-3" title={e.explanation}>
                    {e.explanation}
                  </div>
                  {showDetailLink && (
                    <div className="mt-1 text-right">
                      <Link
                        href={`/opportunities/evaluations/${e.id}`}
                        className="text-[10px] text-accent hover:underline"
                      >
                        View detail
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
