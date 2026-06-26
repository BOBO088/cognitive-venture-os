import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EntityForm } from '@/components/graph/EntityForm';
import { EntityTypeBadge } from '@/components/graph/EntityTypeBadge';
import { BindCardControl } from '@/components/graph/BindCardControl';
import { getEntity } from '@/lib/services/graphEntityService';
import { listResearchCards } from '@/lib/repos/research';
import { updateEntityAction, deleteEntityAction, bindCardAction, unbindCardAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GraphEntityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const entity = await getEntity(id);
  if (!entity) notFound();

  const allCards = await listResearchCards();
  const cardOptions = allCards.map((c) => ({ id: c.id, title: c.title, topicId: c.topicId }));

  // 解析已绑卡（service 已注入 linkedResearchCardIds）
  const linkedCards = entity.linkedResearchCardIds
    .map((cid) => allCards.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  const onSubmit = updateEntityAction.bind(null, entity.id);
  const onDelete = deleteEntityAction.bind(null, entity.id);
  const onBind = bindCardAction.bind(null, entity.id);
  const onUnbind = unbindCardAction.bind(null, entity.id);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/graph/entities" className="text-sm text-muted hover:text-text">
          ← Back to entities
        </Link>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold text-text">{entity.name}</h1>
          <EntityTypeBadge kind={entity.kind} />
        </div>
        <p className="text-xs text-muted mt-1">
          id: <span className="font-mono">{entity.id}</span> · created {entity.createdAt.slice(0, 10)} · updated {entity.updatedAt.slice(0, 10)}
        </p>
      </div>

      <Card>
        <div className="text-sm font-semibold text-text mb-3">Read-only context</div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          {entity.description && (
            <>
              <dt className="text-muted">Description</dt>
              <dd className="text-text whitespace-pre-wrap">{entity.description}</dd>
            </>
          )}
          {entity.aliases.length > 0 && (
            <>
              <dt className="text-muted">Aliases</dt>
              <dd className="text-text text-xs">
                {entity.aliases.map((a) => (
                  <span
                    key={a}
                    className="inline-block mr-1 px-1.5 py-0.5 rounded border border-border"
                  >
                    {a}
                  </span>
                ))}
              </dd>
            </>
          )}
          {entity.tags.length > 0 && (
            <>
              <dt className="text-muted">Tags</dt>
              <dd className="text-text text-xs">
                {entity.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-block mr-1 px-1.5 py-0.5 rounded border border-border"
                  >
                    {t}
                  </span>
                ))}
              </dd>
            </>
          )}
          {Object.keys(entity.metadata).length > 0 && (
            <>
              <dt className="text-muted">Metadata</dt>
              <dd className="text-text text-xs font-mono">
                {Object.entries(entity.metadata).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-muted">{k}</span>: <span>{String(v)}</span>
                  </div>
                ))}
              </dd>
            </>
          )}
          <dt className="text-muted">Linked cards</dt>
          <dd className="text-text text-xs">
            {linkedCards.length > 0
              ? `${linkedCards.length} card(s) bound: ${linkedCards.map((c) => c.id).join(', ')}`
              : '— none —'}
          </dd>
        </dl>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-text mb-3">Bind research card</div>
        <p className="text-xs text-muted mb-2">
          把这个 entity 加到 ResearchCard.graphEntityIds。已绑定的会显示在下方，可单独解绑。
        </p>
        <BindCardControl
          entityId={entity.id}
          available={cardOptions}
          onBind={onBind}
          onUnbind={onUnbind}
          boundIds={entity.linkedResearchCardIds}
        />
      </Card>

      <div>
        <div className="text-sm font-semibold text-text mb-2">Edit</div>
        <EntityForm
          mode="edit"
          initial={entity}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
