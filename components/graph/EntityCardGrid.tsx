import { EntityCard } from './EntityCard';
import type { GraphEntity } from '@/types';

interface EntityCardGridProps {
  entities: GraphEntity[];
  selectedEntityId?: string;
  relationCountByEntityId: Record<string, number>;
  preserveEntityType?: string;
  preserveRelationType?: string;
}

export function EntityCardGrid({
  entities,
  selectedEntityId,
  relationCountByEntityId,
  preserveEntityType,
  preserveRelationType,
}: EntityCardGridProps) {
  if (entities.length === 0) {
    return (
      <div className="text-sm text-muted px-1 py-6 text-center border border-dashed border-border rounded-lg">
        No entities match the current entity-type filter.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {entities.map((e) => (
        <EntityCard
          key={e.id}
          entity={e}
          selected={selectedEntityId === e.id}
          relationCount={relationCountByEntityId[e.id] ?? 0}
          preserveEntityType={preserveEntityType}
          preserveRelationType={preserveRelationType}
        />
      ))}
    </div>
  );
}
