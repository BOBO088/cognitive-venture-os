import { Badge } from '@/components/ui/Badge';
import type { SignalCategory } from '@/types';

const CATEGORY_TONE: Record<SignalCategory, 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'> = {
  funding: 'ok',
  product_launch: 'accent',
  github_trend: 'warn',
  hiring_signal: 'neutral',
  customer_pain: 'danger',
  regulation: 'danger',
  technology_breakthrough: 'accent',
  content_trend: 'neutral',
  geo_trend: 'accent',
  ip_trend: 'warn',
  short_video_trend: 'warn',
};

const CATEGORY_LABEL: Record<SignalCategory, string> = {
  funding: 'Funding',
  product_launch: 'Product launch',
  github_trend: 'GitHub trend',
  hiring_signal: 'Hiring signal',
  customer_pain: 'Customer pain',
  regulation: 'Regulation',
  technology_breakthrough: 'Tech breakthrough',
  content_trend: 'Content trend',
  geo_trend: 'GEO trend',
  ip_trend: 'IP trend',
  short_video_trend: 'Short-video trend',
};

export function SignalCategoryBadge({ category }: { category: SignalCategory }) {
  return <Badge tone={CATEGORY_TONE[category]}>{CATEGORY_LABEL[category]}</Badge>;
}

export const SIGNAL_CATEGORIES: SignalCategory[] = [
  'funding',
  'product_launch',
  'github_trend',
  'hiring_signal',
  'customer_pain',
  'regulation',
  'technology_breakthrough',
  'content_trend',
  'geo_trend',
  'ip_trend',
  'short_video_trend',
];

export const CATEGORY_LABEL_MAP = CATEGORY_LABEL;
