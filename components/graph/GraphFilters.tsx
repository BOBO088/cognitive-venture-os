'use client';

/**
 * GraphFilters — entity type chips + relation type chips.
 *
 * chip 计数约定：
 *   - entity chip 计数 = 全量 entities 按 kind 分组（与 relationType 无关）
 *   - relation chip 计数 = 全量 relations 按 kind 分组（与 entityType 无关）
 * 与 /graph/relations 列表页一致。
 */

import Link from 'next/link';
import type { GraphEntityKind, GraphRelationKind } from '@/types';
import { ENTITY_KINDS, KIND_LABEL_MAP as ENTITY_LABEL } from './EntityTypeBadge';
import { RELATION_KINDS, KIND_LABEL_MAP as RELATION_LABEL } from './RelationTypeBadge';

interface GraphFiltersProps {
  activeEntityType?: GraphEntityKind;
  activeRelationType?: GraphRelationKind;
  selectedEntityId?: string;
  entityTotalByKind: Record<string, number>;
  relationTotalByKind: Record<string, number>;
}

interface ChipDescriptor {
  key: string;
  label: string;
  count: number;
  href: string;
  active: boolean;
}

function buildRelationHref(
  value: string | undefined,
  activeEntityType: string | undefined,
  selectedEntityId: string | undefined,
): string {
  const params = new URLSearchParams();
  if (value) params.set('relationType', value);
  if (activeEntityType) params.set('entityType', activeEntityType);
  if (selectedEntityId) params.set('entityId', selectedEntityId);
  const qs = params.toString();
  return qs ? `/graph?${qs}` : '/graph';
}

function buildEntityHref(
  value: string | undefined,
  activeRelationType: string | undefined,
  selectedEntityId: string | undefined,
): string {
  const params = new URLSearchParams();
  if (value) params.set('entityType', value);
  if (activeRelationType) params.set('relationType', activeRelationType);
  if (selectedEntityId) params.set('entityId', selectedEntityId);
  const qs = params.toString();
  return qs ? `/graph?${qs}` : '/graph';
}

function ChipRow({ label, chips }: { label: string; chips: ChipDescriptor[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-muted mr-1 shrink-0">{label}:</span>
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          className={
            'text-xs px-2 py-1 rounded border transition ' +
            (c.active
              ? 'border-accent text-accent bg-accent/5'
              : 'border-border text-muted hover:text-text')
          }
        >
          {c.label} ({c.count})
        </Link>
      ))}
    </div>
  );
}

export function GraphFilters({
  activeEntityType,
  activeRelationType,
  selectedEntityId,
  entityTotalByKind,
  relationTotalByKind,
}: GraphFiltersProps) {
  const entityTotal = Object.values(entityTotalByKind).reduce((a, b) => a + b, 0);
  const relationTotal = Object.values(relationTotalByKind).reduce((a, b) => a + b, 0);

  const entityChips: ChipDescriptor[] = [
    {
      key: '__all',
      label: 'All',
      count: entityTotal,
      href: buildRelationHref(activeRelationType, undefined, selectedEntityId),
      active: !activeEntityType,
    },
    ...ENTITY_KINDS.map<ChipDescriptor>((k) => ({
      key: k,
      label: ENTITY_LABEL[k],
      count: entityTotalByKind[k] ?? 0,
      href: buildRelationHref(activeRelationType, k, selectedEntityId),
      active: activeEntityType === k,
    })),
  ];

  const relationChips: ChipDescriptor[] = [
    {
      key: '__all',
      label: 'All',
      count: relationTotal,
      href: buildEntityHref(activeEntityType, undefined, selectedEntityId),
      active: !activeRelationType,
    },
    ...RELATION_KINDS.map<ChipDescriptor>((k) => ({
      key: k,
      label: RELATION_LABEL[k],
      count: relationTotalByKind[k] ?? 0,
      href: buildEntityHref(activeEntityType, k, selectedEntityId),
      active: activeRelationType === k,
    })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <ChipRow label="Entity type" chips={entityChips} />
      <ChipRow label="Relation type" chips={relationChips} />
    </div>
  );
}
