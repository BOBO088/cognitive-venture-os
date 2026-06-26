import type React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { RelationTypeBadge } from './RelationTypeBadge';
import { RelationStrengthBar } from './RelationStrengthBar';
import { EntityTypeBadge } from './EntityTypeBadge';
import type { GraphEntity, GraphRelation } from '@/types';

interface EntityRelationsPanelProps {
  selected: GraphEntity;
  outgoing: GraphRelation[];
  incoming: GraphRelation[];
  entityById: Map<string, GraphEntity>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-muted px-2 py-3 text-center border border-dashed border-border rounded">
      {children}
    </div>
  );
}

function RelationTable({
  rows,
  entityById,
  direction,
}: {
  rows: GraphRelation[];
  entityById: Map<string, GraphEntity>;
  direction: 'outgoing' | 'incoming';
}) {
  if (rows.length === 0) {
    return <EmptyHint>No {direction} relations match the current filters.</EmptyHint>;
  }
  return (
    <div className="border border-border rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium text-xs">Relation</th>
            <th className="px-3 py-2 font-medium text-xs">{direction === 'outgoing' ? 'Target' : 'Source'}</th>
            <th className="px-3 py-2 font-medium text-xs">Strength</th>
            <th className="px-3 py-2 font-medium text-xs">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const otherId = direction === 'outgoing' ? r.targetEntityId : r.sourceEntityId;
            const other = entityById.get(otherId);
            return (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RelationTypeBadge relationType={r.relationType} />
                    <Link
                      href={`/graph/relations/${r.id}`}
                      className="text-[10px] text-muted hover:text-accent font-mono"
                    >
                      {r.id}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {other ? (
                    <Link
                      href={`/graph?entityId=${other.id}`}
                      className="text-text hover:text-accent font-medium"
                    >
                      {other.name}
                    </Link>
                  ) : (
                    <span className="text-danger font-mono text-xs">({otherId}) missing</span>
                  )}
                  {other && <span className="ml-2"><EntityTypeBadge kind={other.kind} /></span>}
                </td>
                <td className="px-3 py-2 w-32">
                  <RelationStrengthBar strength={r.strength} />
                </td>
                <td className="px-3 py-2 text-muted text-xs">{fmtDate(r.updatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EntityRelationsPanel({
  selected,
  outgoing,
  incoming,
  entityById,
}: EntityRelationsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-text">{selected.name}</h2>
              <EntityTypeBadge kind={selected.kind} />
            </div>
            {selected.description && (
              <p className="mt-1 text-sm text-muted">{selected.description}</p>
            )}
            {selected.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selected.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 text-[11px] text-muted font-mono">{selected.id}</div>
          </div>
          <Link
            href={`/graph/entities/${selected.id}`}
            className="text-xs text-accent hover:underline shrink-0"
          >
            Open entity detail →
          </Link>
        </div>
      </Card>

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">
          Outgoing relations <span className="text-text">({outgoing.length})</span>
        </h3>
        <RelationTable rows={outgoing} entityById={entityById} direction="outgoing" />
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">
          Incoming relations <span className="text-text">({incoming.length})</span>
        </h3>
        <RelationTable rows={incoming} entityById={entityById} direction="incoming" />
      </div>
    </div>
  );
}
