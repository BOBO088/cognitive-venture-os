/**
 * /opportunities/evaluations — 评分列表 + 打分表单。
 *
 * URL 参数：
 *   ?focus=<opportunityId>  预选打分表单的 opportunity
 */

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EvaluationList } from '@/components/evaluations/EvaluationList';
import { EvaluationForm } from '@/components/evaluations/EvaluationForm';
import { ScoringWeightsPanel } from '@/components/evaluations/ScoringWeightsPanel';
import { createEvaluationAction } from './actions';
import {
  listEvaluationsGroupedByOpportunity,
} from '@/lib/services/evaluationService';
import { listOpportunities } from '@/lib/services/opportunityService';

export const metadata = {
  title: 'Evaluations · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ focus?: string }>;
}

export default async function EvaluationsPage({ searchParams }: PageProps) {
  const { focus } = await searchParams;

  const [groups, opps] = await Promise.all([
    listEvaluationsGroupedByOpportunity(),
    listOpportunities(),
  ]);

  const oppOptions = opps
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((o) => ({ id: o.id, title: o.title }));

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Evaluations</h1>
          <p className="text-sm text-muted">
            {groups.length} opportunit{groups.length === 1 ? 'y' : 'ies'} scored ·{' '}
            {groups.reduce((n, g) => n + g.evaluations.length, 0)} evaluation
            {groups.reduce((n, g) => n + g.evaluations.length, 0) === 1 ? '' : 's'} total
            {focus && (
              <span> · pre-selecting <span className="text-text font-mono">{focus}</span></span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/opportunities/ranking" className="text-sm text-muted hover:text-text">
            Ranking
          </Link>
          <Link href="/opportunities" className="text-sm text-muted hover:text-text">
            ← Opportunities
          </Link>
        </div>
      </div>

      <ScoringWeightsPanel />

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Score an opportunity</h2>
        <EvaluationForm
          opportunities={oppOptions}
          preselectOpportunityId={focus}
          submitLabel="Save evaluation"
          formAction={createEvaluationAction}
        />
      </Card>

      <div>
        <h2 className="text-sm font-medium text-muted mb-3">All evaluations</h2>
        <EvaluationList groups={groups} />
      </div>
    </div>
  );
}
