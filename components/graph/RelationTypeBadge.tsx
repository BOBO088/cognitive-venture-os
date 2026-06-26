import { Badge } from '@/components/ui/Badge';
import type { GraphRelationKind } from '@/types';

const KIND_TONE: Record<GraphRelationKind, 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'> = {
  competes_with: 'danger',
  invested_by: 'ok',
  built_by: 'accent',
  uses: 'warn',
  belongs_to: 'neutral',
  growing_in: 'ok',
  mentioned_in: 'neutral',
  supports: 'ok',
  contradicts: 'danger',
  influences: 'warn',
  similar_to: 'neutral',
  alternative_to: 'accent',
};

const KIND_LABEL: Record<GraphRelationKind, string> = {
  competes_with: 'competes_with',
  invested_by: 'invested_by',
  built_by: 'built_by',
  uses: 'uses',
  belongs_to: 'belongs_to',
  growing_in: 'growing_in',
  mentioned_in: 'mentioned_in',
  supports: 'supports',
  contradicts: 'contradicts',
  influences: 'influences',
  similar_to: 'similar_to',
  alternative_to: 'alternative_to',
};

export function RelationTypeBadge({ relationType }: { relationType: GraphRelationKind }) {
  return <Badge tone={KIND_TONE[relationType]}>{KIND_LABEL[relationType]}</Badge>;
}

export const RELATION_KINDS: GraphRelationKind[] = [
  'competes_with', 'invested_by', 'built_by', 'uses',
  'belongs_to', 'growing_in', 'mentioned_in', 'supports',
  'contradicts', 'influences', 'similar_to', 'alternative_to',
];

export const KIND_LABEL_MAP = KIND_LABEL;
