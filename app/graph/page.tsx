import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { GraphFilters } from '@/components/graph/GraphFilters';
import { EntityCardGrid } from '@/components/graph/EntityCardGrid';
import { EntityRelationsPanel } from '@/components/graph/EntityRelationsPanel';
import { GraphCanvasPlaceholder } from '@/components/graph/GraphCanvasPlaceholder';
import { GraphMarkdownExportButton } from '@/components/graph/GraphMarkdownExportButton';
import { listEntities } from '@/lib/services/graphEntityService';
import { listRelations } from '@/lib/services/graphRelationService';
import { ENTITY_KINDS } from '@/components/graph/EntityTypeBadge';
import { RELATION_KINDS } from '@/components/graph/RelationTypeBadge';
import type { GraphEntityKind, GraphRelationKind, GraphEntity, GraphRelation } from '@/types';

export const metadata = {
  title: 'Graph view · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    entityType?: string;
    relationType?: string;
    entityId?: string;
  }>;
}

export default async function GraphViewPage({ searchParams }: PageProps) {
  const { entityType, relationType, entityId } = await searchParams;

  // 解析 + 校验 URL 参数
  const kind: GraphEntityKind | undefined = ENTITY_KINDS.includes(
    entityType as GraphEntityKind,
  )
    ? (entityType as GraphEntityKind)
    : undefined;
  const rKind: GraphRelationKind | undefined = RELATION_KINDS.includes(
    relationType as GraphRelationKind,
  )
    ? (relationType as GraphRelationKind)
    : undefined;
  const focusId: string | undefined = entityId?.trim() || undefined;

  // 拉取全量（用于 chip 计数和 page-level 过滤）
  const allEntities = await listEntities();
  const allRelations = await listRelations();
  const entityById = new Map<string, GraphEntity>(allEntities.map((e) => [e.id, e]));

  // chip 计数（不受对方过滤影响）
  const entityTotalByKind: Record<string, number> = {};
  for (const e of allEntities) entityTotalByKind[e.kind] = (entityTotalByKind[e.kind] ?? 0) + 1;
  const relationTotalByKind: Record<string, number> = {};
  for (const r of allRelations) {
    relationTotalByKind[r.relationType] = (relationTotalByKind[r.relationType] ?? 0) + 1;
  }

  // 实体卡：按 entityType 过滤
  const filteredEntities: GraphEntity[] = kind
    ? allEntities.filter((e) => e.kind === kind)
    : allEntities;

  // 关系：按 relationType 过滤；同时只保留 source/target 都在已过滤实体里的关系，
  // 这样视图的「关系数」与可见实体一致（avoid dangling rows in relation count）
  const filteredRelations: GraphRelation[] = rKind
    ? allRelations.filter((r) => r.relationType === rKind)
    : allRelations;

  // 计算每个实体的关系数（outgoing + incoming），用于 entity card 上的「relations」指标
  const relationCountByEntityId: Record<string, number> = {};
  for (const e of filteredEntities) relationCountByEntityId[e.id] = 0;
  for (const r of filteredRelations) {
    if (relationCountByEntityId[r.sourceEntityId] !== undefined) {
      relationCountByEntityId[r.sourceEntityId] += 1;
    }
    if (relationCountByEntityId[r.targetEntityId] !== undefined) {
      relationCountByEntityId[r.targetEntityId] += 1;
    }
  }

  // 选中实体解析
  const selected: GraphEntity | undefined = focusId ? entityById.get(focusId) : undefined;

  // 选中实体的 outgoing / incoming（在 filteredRelations 范围内）
  let outgoing: GraphRelation[] = [];
  let incoming: GraphRelation[] = [];
  if (selected) {
    outgoing = filteredRelations.filter((r) => r.sourceEntityId === selected.id);
    incoming = filteredRelations.filter((r) => r.targetEntityId === selected.id);
  }

  // Export 输入（用已过滤后的视图快照）
  const exportInput = {
    generatedAt: '2026-06-25T12:00:00.000Z',
    filters: { entityType: kind, relationType: rKind },
    selectedEntityId: selected?.id,
    entities: filteredEntities,
    relations: filteredRelations,
    groupedForSelected: selected
      ? { outgoing, incoming }
      : undefined,
  };

  // 统计摘要
  const summary = {
    entities: filteredEntities.length,
    relations: filteredRelations.length,
    outgoing: outgoing.length,
    incoming: incoming.length,
  };

  // 顶部右侧的 cross-link 列表
  const clearFocusHref = (() => {
    const params = new URLSearchParams();
    if (kind) params.set('entityType', kind);
    if (rKind) params.set('relationType', rKind);
    const qs = params.toString();
    return qs ? `/graph?${qs}` : '/graph';
  })();

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Knowledge graph</h1>
          <p className="text-sm text-muted">
            {summary.entities} entit{summary.entities === 1 ? 'y' : 'ies'} ·{' '}
            {summary.relations} relation{summary.relations === 1 ? '' : 's'}
            {kind && (
              <span>
                {' · entity type: '}
                <span className="text-text">{kind}</span>
              </span>
            )}
            {rKind && (
              <span>
                {' · relation type: '}
                <span className="text-text">{rKind}</span>
              </span>
            )}
            {selected && (
              <span>
                {' · focused: '}
                <span className="text-text">{selected.name}</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Link href="/graph/entities" className="hover:text-text">Entities</Link>
            <span>·</span>
            <Link href="/graph/relations" className="hover:text-text">Relations</Link>
            <span>·</span>
            <Link href="/opportunities/signals" className="hover:text-text">Signals</Link>
          </div>
          <GraphMarkdownExportButton input={exportInput} />
        </div>
      </div>

      <Card>
        <GraphFilters
          activeEntityType={kind}
          activeRelationType={rKind}
          selectedEntityId={selected?.id}
          entityTotalByKind={entityTotalByKind}
          relationTotalByKind={relationTotalByKind}
        />
      </Card>

      <GraphCanvasPlaceholder />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">
              Entities <span className="text-text">({filteredEntities.length})</span>
            </h2>
            {selected && (
              <Link
                href={clearFocusHref}
                className="text-xs text-accent hover:underline"
                aria-label="Clear focused entity"
              >
                Clear focus
              </Link>
            )}
          </div>
          <EntityCardGrid
            entities={filteredEntities}
            selectedEntityId={selected?.id}
            relationCountByEntityId={relationCountByEntityId}
            preserveEntityType={kind}
            preserveRelationType={rKind}
          />
        </div>

        <div className="lg:col-span-7 flex flex-col gap-3">
          {!selected && (
            <Card>
              <div className="text-sm text-muted">
                Click an entity card on the left to see its incoming and outgoing relations.
                <br />
                <span className="text-xs">
                  Use the chips above to filter by entity type or relation type. Export the
                  current view as Markdown via the button on the top right.
                </span>
              </div>
            </Card>
          )}
          {selected && (
            <EntityRelationsPanel
              selected={selected}
              outgoing={outgoing}
              incoming={incoming}
              entityById={entityById}
            />
          )}
        </div>
      </div>
    </div>
  );
}
