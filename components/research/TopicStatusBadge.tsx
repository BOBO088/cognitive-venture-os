import { Badge } from '@/components/ui/Badge';
import type { ResearchTopicStatus } from '@/types';

const TONE: Record<ResearchTopicStatus, 'ok' | 'warn' | 'neutral'> = {
  active: 'ok',
  completed: 'neutral',
  archived: 'warn',
};

const LABEL: Record<ResearchTopicStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export function TopicStatusBadge({ status }: { status: ResearchTopicStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
