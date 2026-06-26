import { Badge } from '@/components/ui/Badge';
import type { GraphEntityKind } from '@/types';

const KIND_TONE: Record<GraphEntityKind, 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'> = {
  company: 'accent',
  product: 'ok',
  person: 'neutral',
  technology: 'warn',
  market: 'accent',
  trend: 'warn',
  investor: 'ok',
  ip: 'neutral',
  character: 'neutral',
  content_asset: 'neutral',
  platform: 'accent',
  tool: 'warn',
};

const KIND_LABEL: Record<GraphEntityKind, string> = {
  company: 'Company',
  product: 'Product',
  person: 'Person',
  technology: 'Technology',
  market: 'Market',
  trend: 'Trend',
  investor: 'Investor',
  ip: 'IP',
  character: 'Character',
  content_asset: 'ContentAsset',
  platform: 'Platform',
  tool: 'Tool',
};

export function EntityTypeBadge({ kind }: { kind: GraphEntityKind }) {
  return <Badge tone={KIND_TONE[kind]}>{KIND_LABEL[kind]}</Badge>;
}

export const ENTITY_KINDS: GraphEntityKind[] = [
  'company', 'product', 'person', 'technology',
  'market', 'trend', 'investor', 'ip',
  'character', 'content_asset', 'platform', 'tool',
];

export const KIND_LABEL_MAP = KIND_LABEL;
