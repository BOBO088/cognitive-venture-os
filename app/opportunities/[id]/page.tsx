import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OpportunityForm } from '@/components/opportunities/OpportunityForm';
import { OpportunityStatusBadge } from '@/components/opportunities/OpportunityStatusBadge';
import { OpportunityBindSignalControl } from '@/components/opportunities/OpportunityBindSignalControl';
import { OpportunityBindCardControl } from '@/components/opportunities/OpportunityBindCardControl';
import { OpportunityBindEntityControl } from '@/components/opportunities/OpportunityBindEntityControl';
import { OpportunityReportButton } from '@/components/opportunities/OpportunityReportButton';
import { getOpportunity } from '@/lib/services/opportunityService';
import { listSignals } from '@/lib/services/signalService';
import { listCards } from '@/lib/services/researchCardService';
import { listEntities } from '@/lib/services/graphEntityService';
import { updateOpportunityAction, deleteOpportunityAction } from '../actions';
import type { Signal, ResearchCard, GraphEntity } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) notFound();

  // 拉取全量 signals / cards / entities 用于 bind control 的候选 + 上下文
  const [allSignals, allCards, allEntities] = await Promise.all([
    listSignals(),
    listCards(),
    listEntities(),
  ]);

  // 解析已绑定的快照给导出用 + UI 上下文展示
  const signalById = new Map<string, Signal>(allSignals.map((s) => [s.id, s]));
  const cardById = new Map<string, ResearchCard>(allCards.map((c) => [c.id, c]));
  const entityById = new Map<string, GraphEntity>(allEntities.map((e) => [e.id, e]));

  const boundSignals = opp.relatedSignalIds
    .map((id) => signalById.get(id))
    .filter((s): s is Signal => Boolean(s));
  const boundCards = opp.relatedResearchCardIds
    .map((id) => cardById.get(id))
    .filter((c): c is ResearchCard => Boolean(c));
  const boundEntities = opp.relatedEntityIds
    .map((id) => entityById.get(id))
    .filter((e): e is GraphEntity => Boolean(e));

  const reportInput = {
    generatedAt: '2026-06-25T12:00:00.000Z',
    opportunity: opp,
    signals: boundSignals,
    cards: boundCards,
    entities: boundEntities,
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link href="/opportunities" className="text-sm text-muted hover:text-text">
          ← Back to opportunities
        </Link>
      </div>

      {/* Read-only context */}
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">{opp.title}</h1>
              <OpportunityStatusBadge status={opp.status} />
            </div>
            <div className="mt-1.5 text-sm text-muted">
              <span>created {fmtDate(opp.createdAt)}</span>
              <span className="mx-2">·</span>
              <span>updated {fmtDate(opp.updatedAt)}</span>
              <span className="mx-2">·</span>
              <span className="font-mono">{opp.id}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted mb-1">Target user</div>
                <div className="text-sm text-text">{opp.targetUser}</div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Pain point</div>
                <div className="text-sm text-text whitespace-pre-wrap">{opp.painPoint}</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-muted mb-1">Description</div>
              <p className="text-sm text-text whitespace-pre-wrap">{opp.description}</p>
            </div>
            <div className="mt-3">
              <div className="text-xs text-muted mb-1">Solution idea</div>
              <p className="text-sm text-text whitespace-pre-wrap">{opp.solutionIdea}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <OpportunityReportButton input={reportInput} />
            <Link
              href={`/opportunities/evaluations?focus=${opp.id}`}
              className="text-xs text-accent hover:underline"
            >
              Score this opportunity →
            </Link>
            <Link
              href={`/mvp/new?opportunityId=${opp.id}`}
              className="text-xs text-accent hover:underline"
            >
              Spin off MVP project →
            </Link>
            <form
              action={async () => {
                'use server';
                await deleteOpportunityAction(opp.id);
              }}
            >
              <Button type="submit" variant="ghost">Delete opportunity</Button>
            </form>
          </div>
        </div>
      </Card>

      {/* Bind controls — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Signals <span className="text-text">({opp.relatedSignalIds.length})</span>
          </h2>
          <OpportunityBindSignalControl
            opportunityId={opp.id}
            boundIds={opp.relatedSignalIds}
            candidates={allSignals}
          />
          {opp.relatedSignalIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {opp.relatedSignalIds.map((sid) => {
                const s = signalById.get(sid);
                return (
                  <Link
                    key={sid}
                    href={s ? `/opportunities/signals/${s.id}` : '#'}
                    className={
                      'text-[10px] px-1.5 py-0.5 rounded border ' +
                      (s
                        ? 'border-border text-muted hover:text-accent'
                        : 'border-danger text-danger')
                    }
                  >
                    {s?.title ?? `${sid} (missing)`}
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Research cards <span className="text-text">({opp.relatedResearchCardIds.length})</span>
          </h2>
          <OpportunityBindCardControl
            opportunityId={opp.id}
            boundIds={opp.relatedResearchCardIds}
            candidates={allCards}
          />
          {opp.relatedResearchCardIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {opp.relatedResearchCardIds.map((cid) => {
                const c = cardById.get(cid);
                return (
                  <Link
                    key={cid}
                    href={c ? `/research/cards/${c.id}` : '#'}
                    className={
                      'text-[10px] px-1.5 py-0.5 rounded border ' +
                      (c
                        ? 'border-border text-muted hover:text-accent'
                        : 'border-danger text-danger')
                    }
                  >
                    {c?.title ?? `${cid} (missing)`}
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Graph entities <span className="text-text">({opp.relatedEntityIds.length})</span>
          </h2>
          <OpportunityBindEntityControl
            opportunityId={opp.id}
            boundIds={opp.relatedEntityIds}
            candidates={allEntities}
          />
          {opp.relatedEntityIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {opp.relatedEntityIds.map((eid) => {
                const e = entityById.get(eid);
                return (
                  <Link
                    key={eid}
                    href={e ? `/graph/entities/${e.id}` : '#'}
                    className={
                      'text-[10px] px-1.5 py-0.5 rounded border ' +
                      (e
                        ? 'border-border text-muted hover:text-accent'
                        : 'border-danger text-danger')
                    }
                  >
                    {e?.name ?? `${eid} (missing)`}
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Edit form */}
      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <OpportunityForm
          initial={opp}
          submitLabel="Save changes"
          formAction={updateOpportunityAction}
        />
      </Card>
    </div>
  );
}
