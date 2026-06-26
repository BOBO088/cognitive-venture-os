import { Badge } from '@/components/ui/Badge';
import type { ResearchCategory } from '@/types';

const LABEL: Record<ResearchCategory, string> = {
  ai: 'AI',
  ip: 'IP',
  geo: 'GEO',
  short_video: 'Short Video',
  saas: 'SaaS',
  investment: 'Investment',
  other: 'Other',
};

export function TopicCategoryBadge({ category }: { category: ResearchCategory }) {
  return <Badge tone="accent">{LABEL[category]}</Badge>;
}
