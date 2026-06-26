import { Badge } from '@/components/ui/Badge';
import type { TaskPriority } from '@/types';

const PRIORITY_TONE: Record<TaskPriority, 'neutral' | 'warn' | 'accent' | 'danger'> = {
  low: 'neutral',
  medium: 'neutral',
  high: 'warn',
  urgent: 'danger',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}
