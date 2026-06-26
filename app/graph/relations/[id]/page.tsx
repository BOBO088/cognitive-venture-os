import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RelationForm } from '@/components/graph/RelationForm';
import { RelationTypeBadge } from '@/components/graph/RelationTypeBadge';
import { RelationStrengthBar } from '@/components/graph/RelationStrengthBar';
import { RelationBindCardControl } from '@/components/graph/RelationBindCardControl';
import { getRelation } from '@/lib/services/graphRelationService';
import { listGraphEntities } from '@/lib/repos/knowledge-graph';
import { listResearchCards } from '@/lib/repos/research';
import { updateRelationAction, deleteRelationAction, bindCardAction, unbindCardAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GraphRelationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const relation = await getRelation(id);
  if (!relation) notFound();

  const [entities, allCards] = await Promise.all([
    listGraphEntities(),
    listResearchCards(),
  ]);
  const entityById = new Map(entities.map((e) => [e.id, e]));
  const source = entityById.get(relation.sourceEntityId);
  const target = entityById.get(relation.targetEntityId);

  const cardOptions = allCards.map((c) => ({ id: c.id, title: c.title, topicId: c.topicId }));
  const linkedCards = relation.linkedResearchCardIds
    .map((cid) => allCards.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  const onSubmit = updateRelationAction.bind(null, relation.id);
  const onDelete = deleteRelationAction.bind(null, relation.id);
  const onBind = bindCardAction.bind(null, relation.id);
  const onUnbind = unbindCardAction.bind(null, relation.id);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/graph/relations" className="text-sm text-muted hover:text-text">
          ← Back to relations
        </Link>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold text-text">
            {source?.name ?? relation.sourceEntityId}
            <span className="text-muted mx-2">→</span>
            {target?.name ?? relation.targetEntityId}
          </h1>
          <RelationTypeBadge relationType={relation.relationType} />
        </div>
        <p className="text-xs text-muted mt-1">
          id: <span className="font-mono">{relation.id}</span> · created {relation.createdAt.slice(0, 10)} · updated {relation.updatedAt.slice(0, 10)}
        </p>
      </div>

      <Card>
        <div className="text-sm font-semibold text-text mb-3">Read-only context</div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Type</dt>
          <dd><RelationTypeBadge relationType={relation.relationType} /></dd>

          <dt className="text-muted">Source</dt>
          <dd className="text-text">
            {source ? (
              <Link href={`/graph/entities/${source.id}`} className="text-accent hover:underline">
                {source.name} <span className="text-muted font-mono text-xs">({source.id})</span>
              </Link>
            ) : (
              <span className="text-danger font-mono">{relation.sourceEntityId} (missing)</span>
            )}
          </dd>

          <dt className="text-muted">Target</dt>
          <dd className="text-text">
            {target ? (
              <Link href={`/graph/entities/${target.id}`} className="text-accent hover:underline">
                {target.name} <span className="text-muted font-mono text-xs">({target.id})</span>
              </Link>
            ) : (
              <span className="text-danger font-mono">{relation.targetEntityId} (missing)</span>
            )}
          </dd>

          <dt className="text-muted">Strength</dt>
          <dd><RelationStrengthBar strength={relation.strength} /></dd>

          {relation.evidence && (
            <>
              <dt className="text-muted">Evidence</dt>
              <dd className="text-text whitespace-pre-wrap">{relation.evidence}</dd>
            </>
          )}

          <dt className="text-muted">Linked cards</dt>
          <dd className="text-text text-xs">
            {linkedCards.length > 0
              ? `${linkedCards.length} card(s) bound (manual)`
              : '— none —'}
          </dd>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-text mb-3">Bind research card</div>
        <p className="text-xs text-muted mb-2">
          <Badge tone="warn">Manual</Badge>
          <span className="ml-2">关系与卡片的绑定是手动管理（与 entity 模块的派生策略不同）。</span>
        </p>
        <RelationBindCardControl
          relationId={relation.id}
          available={cardOptions}
          onBind={onBind}
          onUnbind={onUnbind}
          boundIds={relation.linkedResearchCardIds}
        />
      </Card>

      <div>
        <div className="text-sm font-semibold text-text mb-2">Edit</div>
        <RelationForm
          mode="edit"
          initial={relation}
          entities={entities.map((e) => ({ id: e.id, name: e.name, kind: e.kind }))}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
