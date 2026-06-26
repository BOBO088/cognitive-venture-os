import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { RelationList } from '@/components/graph/RelationList';
import { RELATION_KINDS, KIND_LABEL_MAP } from '@/components/graph/RelationTypeBadge';
import { listRelations, listRelationsFiltered } from '@/lib/services/graphRelationService';
import { listGraphEntities } from '@/lib/repos/knowledge-graph';
import type { GraphRelationKind } from '@/types';

export const metadata = {
  title: 'Graph relations · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ type?: string; entity?: string }>;
}

export default async function GraphRelationsPage({ searchParams }: PageProps) {
  const { type, entity } = await searchParams;
  const relationType = RELATION_KINDS.includes(type as GraphRelationKind)
    ? (type as GraphRelationKind)
    : undefined;
  const entityId = entity?.trim() || undefined;

  // 关系列表（按筛选条件）
  const relations = await listRelationsFiltered({ relationType, entityId });

  // 全量统计：每个 kind 的总数（与 entity 过滤无关）
  const all = await listRelations();
  const totalByKind: Record<string, number> = {};
  for (const r of all) totalByKind[r.relationType] = (totalByKind[r.relationType] ?? 0) + 1;

  // 解析 source / target entity 给列表用
  const allEntities = await listGraphEntities();
  const entityById = new Map(allEntities.map((e) => [e.id, e]));
  const rows = relations.map((r) => ({
    relation: r,
    source: entityById.get(r.sourceEntityId),
    target: entityById.get(r.targetEntityId),
  }));

  // 命中的 entity 解析（用于 entityId 过滤时的上下文）
  const focusedEntity = entityId ? entityById.get(entityId) : undefined;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Knowledge graph relations</h1>
          <p className="text-sm text-muted">
            {relations.length} relation{relations.length === 1 ? '' : 's'}
            {relationType && (
              <span> · filtered by type: <span className="text-text">{KIND_LABEL_MAP[relationType]}</span></span>
            )}
            {focusedEntity && (
              <span> · touching entity:{' '}
                <Link href={`/graph/entities/${focusedEntity.id}`} className="text-accent hover:underline">
                  {focusedEntity.name}
                </Link>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/graph" className="text-sm text-muted hover:text-text">Graph view</Link>
          <Link href="/graph/entities" className="text-sm text-muted hover:text-text">Entities</Link>
          <Link href="/graph/relations/new">
            <Button variant="primary">New relation</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-muted mr-1">Type:</span>
        <Link
          href={entityId ? `/graph/relations?entity=${entityId}` : '/graph/relations'}
          className={`text-xs px-2 py-1 rounded border ${
            !relationType ? 'border-accent text-accent' : 'border-border text-muted hover:text-text'
          }`}
        >
          All ({all.length})
        </Link>
        {RELATION_KINDS.map((k) => {
          const active = relationType === k;
          const next = new URLSearchParams();
          if (!active) next.set('type', k);
          if (entityId) next.set('entity', entityId);
          const qs = next.toString();
          const href = qs ? `/graph/relations?${qs}` : '/graph/relations';
          return (
            <Link
              key={k}
              href={href}
              className={`text-xs px-2 py-1 rounded border ${
                active ? 'border-accent text-accent' : 'border-border text-muted hover:text-text'
              }`}
            >
              {KIND_LABEL_MAP[k]} ({totalByKind[k] ?? 0})
            </Link>
          );
        })}
      </div>

      <RelationList rows={rows} />
    </div>
  );
}
