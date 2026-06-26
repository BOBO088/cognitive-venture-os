import { Badge } from '@/components/ui/Badge';
import type { TaskStatus } from '@/types';

const STATUS_TONE: Record<TaskStatus, 'neutral' | 'warn' | 'accent' | 'ok' | 'danger'> = {
  backlog: 'neutral',
  doing: 'accent',
  review: 'warn',
  done: 'ok',
  failed: 'danger',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  doing: 'Doing',
  review: 'Review',
  done: 'Done',
  failed: 'Failed',
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
