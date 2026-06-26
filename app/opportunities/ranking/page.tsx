/**
 * /opportunities/ranking — 机会排行榜 + 一键导出 markdown 报告。
 */

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EvaluationScoreBar } from '@/components/evaluations/EvaluationScoreBar';
import { ScoringWeightsPanel } from '@/components/evaluations/ScoringWeightsPanel';
import { RankingReportButton } from '@/components/evaluations/RankingReportButton';
import { rankOpportunities } from '@/lib/services/evaluationService';
import { PROMOTE_THRESHOLD, DEMOTE_THRESHOLD } from '@/types';
import type { OpportunityStatus } from '@/types';

export const metadata = {
  title: 'Opportunity ranking · Cognitive Venture OS',
};

function statusTone(
  status: OpportunityStatus,
): 'accent' | 'ok' | 'warn' | 'danger' | 'neutral' {
  switch (status) {
    case 'mvp':
      return 'ok';
    case 'validated':
      return 'accent';
    case 'evaluating':
      return 'warn';
    case 'archived':
      return 'neutral';
    case 'killed':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default async function RankingPage() {
  const rows = await rankOpportunities();
  const generatedAt = '2026-06-25T12:00:00.000Z';
  const evaluatedCount = rows.filter(
    (r) => r.latestEvaluation.id !== '__placeholder__',
  ).length;
  const topScore = evaluatedCount === 0
    ? 0
    : rows
        .filter((r) => r.latestEvaluation.id !== '__placeholder__')
        .reduce((m, r) => Math.max(m, r.latestEvaluation.totalScore), 0);

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Opportunity ranking</h1>
          <p className="text-sm text-muted">
            {rows.length} total · {evaluatedCount} evaluated · top{' '}
            <span className="text-text">{topScore.toFixed(1)}</span>
            {rows.length > 0 && rows[0] && (
              <span> · #1 <span className="text-text">{rows[0].opportunity.title}</span></span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/opportunities/evaluations" className="text-sm text-muted hover:text-text">
            Evaluations
          </Link>
          <Link href="/opportunities" className="text-sm text-muted hover:text-text">
            ← Opportunities
          </Link>
          <RankingReportButton input={{ generatedAt, rows }} />
        </div>
      </div>

      <ScoringWeightsPanel />

      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-muted">
            No opportunities yet. Create one to start ranking.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-muted">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium w-10">#</th>
                <th className="px-3 py-2 font-medium">Opportunity</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Verdict</th>
                <th className="px-3 py-2 font-medium">Last evaluated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const e = r.latestEvaluation;
                const isPlaceholder = e.id === '__placeholder__';
                const verdict = isPlaceholder
                  ? '—'
                  : e.totalScore >= PROMOTE_THRESHOLD
                    ? 'promote'
                    : e.totalScore < DEMOTE_THRESHOLD
                      ? 'archive'
                      : 'hold';
                const verdictTone =
                  verdict === 'promote'
                    ? 'ok'
                    : verdict === 'archive'
                      ? 'danger'
                      : verdict === 'hold'
                        ? 'warn'
                        : 'neutral';
                return (
                  <tr
                    key={r.opportunity.id}
                    className="border-t border-border hover:bg-panel-2 transition"
                  >
                    <td className="px-3 py-2.5 text-muted tabular-nums">{r.rank}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/opportunities/${r.opportunity.id}`}
                        className="text-text hover:text-accent font-medium"
                      >
                        {r.opportunity.title}
                      </Link>
                      <div className="text-[10px] text-muted font-mono mt-0.5">
                        {r.opportunity.id}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={statusTone(r.opportunity.status)}>
                        {r.opportunity.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {isPlaceholder ? (
                        <span className="text-muted text-xs">not evaluated</span>
                      ) : (
                        <EvaluationScoreBar score={e.totalScore} />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={verdictTone}>{verdict}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      {isPlaceholder ? '—' : e.createdAt.slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="text-[10px] text-muted">
        Verdicts: <span className="text-ok">promote</span> ≥ {PROMOTE_THRESHOLD} ·{' '}
        <span className="text-warn">hold</span> {DEMOTE_THRESHOLD}–{PROMOTE_THRESHOLD - 1} ·{' '}
        <span className="text-danger">archive</span> &lt; {DEMOTE_THRESHOLD}. Auto-transitions the
        opportunity status; manual edits still possible. To spin off an MVP from a high-score
        opportunity, open its <Link href="/mvp" className="text-accent hover:underline">MVP pipeline</Link> entry or click
        “Spin off MVP project →” on the opportunity detail page.
      </div>
    </div>
  );
}
