import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SignalForm } from '@/components/opportunities/SignalForm';
import { SignalCategoryBadge } from '@/components/opportunities/SignalCategoryBadge';
import { SignalConfidenceBar } from '@/components/opportunities/SignalConfidenceBar';
import { SignalBindEntityControl } from '@/components/opportunities/SignalBindEntityControl';
import { SignalBindCardControl } from '@/components/opportunities/SignalBindCardControl';
import {
  getSignal,
} from '@/lib/services/signalService';
import { listEntities } from '@/lib/services/graphEntityService';
import { listCards } from '@/lib/services/researchCardService';
import { updateSignalAction, deleteSignalAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export default async function SignalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const signal = await getSignal(id);
  if (!signal) {
    notFound();
  }

  const [allEntities, allCards] = await Promise.all([
    listEntities(),
    listCards(),
  ]);

  // 解析已绑定的 entity / card 给上下文展示
  const entityById = new Map(allEntities.map((e) => [e.id, e]));
  const cardById = new Map(allCards.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link href="/opportunities/signals" className="text-sm text-muted hover:text-text">
          ← Back to signals
        </Link>
      </div>

      {/* Read-only context */}
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">{signal.title}</h1>
              <SignalCategoryBadge category={signal.category} />
            </div>
            <div className="mt-1.5 text-sm text-muted">
              <span className="font-mono">{signal.source}</span>
              <span className="mx-2">·</span>
              <span>created {fmtDate(signal.createdAt)}</span>
              <span className="mx-2">·</span>
              <span>updated {fmtDate(signal.updatedAt)}</span>
            </div>
            <p className="mt-3 text-sm text-text whitespace-pre-wrap">{signal.description}</p>
            {signal.evidence && (
              <div className="mt-3">
                <div className="text-xs text-muted mb-1">Evidence</div>
                <div className="text-sm text-text whitespace-pre-wrap bg-panel-2 border border-border rounded p-2">
                  {signal.evidence}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-xs text-muted">Confidence</div>
            <SignalConfidenceBar confidence={signal.confidence} />
            <Link
              href={`/opportunities/new?signalId=${signal.id}`}
              className="text-xs text-accent hover:underline"
            >
              Create opportunity from this →
            </Link>
            <form
              action={async () => {
                'use server';
                await deleteSignalAction(signal.id);
              }}
            >
              <Button type="submit" variant="ghost">Delete signal</Button>
            </form>
          </div>
        </div>
      </Card>

      {/* Bind controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Linked GraphEntities <span className="text-text">({signal.linkedEntityIds.length})</span>
          </h2>
          <SignalBindEntityControl
            signalId={signal.id}
            boundIds={signal.linkedEntityIds}
            candidates={allEntities}
          />
          {signal.linkedEntityIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {signal.linkedEntityIds.map((eid) => {
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

        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Linked ResearchCards <span className="text-text">({signal.linkedResearchCardIds.length})</span>
          </h2>
          <SignalBindCardControl
            signalId={signal.id}
            boundIds={signal.linkedResearchCardIds}
            candidates={allCards}
          />
          {signal.linkedResearchCardIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {signal.linkedResearchCardIds.map((cid) => {
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
      </div>

      {/* Edit form */}
      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <SignalForm
          initial={signal}
          signalId={signal.id}
          submitLabel="Save changes"
          formAction={updateSignalAction}
        />
      </Card>
    </div>
  );
}
