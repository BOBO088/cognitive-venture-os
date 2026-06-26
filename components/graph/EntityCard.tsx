import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { EntityTypeBadge } from './EntityTypeBadge';
import type { GraphEntity } from '@/types';

interface EntityCardProps {
  entity: GraphEntity;
  /** 关联关系计数（outgoing + incoming），由 page 层算好。 */
  relationCount: number;
  /** 是否处于选中态。 */
  selected?: boolean;
  /** 当前过滤的 entityType，用于 href 保持 chip 选择。 */
  preserveEntityType?: string;
  /** 当前过滤的 relationType，用于 href 保持 chip 选择。 */
  preserveRelationType?: string;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function EntityCard({
  entity,
  relationCount,
  selected = false,
  preserveEntityType,
  preserveRelationType,
}: EntityCardProps) {
  const params = new URLSearchParams();
  params.set('entityId', entity.id);
  if (preserveEntityType) params.set('entityType', preserveEntityType);
  if (preserveRelationType) params.set('relationType', preserveRelationType);
  const href = `/graph?${params.toString()}`;

  return (
    <Link href={href} className="block">
      <Card
        className={
          'h-full transition hover:border-accent ' +
          (selected ? 'border-accent ring-1 ring-accent/40' : '')
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-text font-medium truncate">{entity.name}</span>
            </div>
            <div className="mt-1.5">
              <EntityTypeBadge kind={entity.kind} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs text-muted">relations</span>
            <span className="text-text font-semibold tabular-nums">{relationCount}</span>
          </div>
        </div>
        {entity.description && (
          <p className="mt-2 text-xs text-muted line-clamp-2">{entity.description}</p>
        )}
        {entity.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {entity.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted"
              >
                {t}
              </span>
            ))}
            {entity.tags.length > 4 && (
              <span className="text-[10px] text-muted">+{entity.tags.length - 4}</span>
            )}
          </div>
        )}
        <div className="mt-2 text-[10px] text-muted">updated {fmtDate(entity.updatedAt)}</div>
      </Card>
    </Link>
  );
}
