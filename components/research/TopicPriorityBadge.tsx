import { Badge } from '@/components/ui/Badge';
import type { ResearchPriority } from '@/types';

const TONE: Record<ResearchPriority, 'danger' | 'warn' | 'neutral'> = {
  high: 'danger',
  medium: 'warn',
  low: 'neutral',
};

const LABEL: Record<ResearchPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TopicPriorityBadge({ priority }: { priority: ResearchPriority }) {
  return <Badge tone={TONE[priority]}>{LABEL[priority]}</Badge>;
}
