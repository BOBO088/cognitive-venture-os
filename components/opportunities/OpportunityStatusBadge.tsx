import { Badge } from '@/components/ui/Badge';
import type { OpportunityStatus } from '@/types';
import { OPPORTUNITY_STATUSES } from '@/types';

const STATUS_TONE: Record<OpportunityStatus, 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  evaluating: 'warn',
  validated: 'accent',
  mvp: 'ok',
  archived: 'neutral',
  killed: 'danger',
};

const STATUS_LABEL: Record<OpportunityStatus, string> = {
  draft: 'Draft',
  evaluating: 'Evaluating',
  validated: 'Validated',
  mvp: 'MVP',
  archived: 'Archived',
  killed: 'Killed',
};

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export const STATUSES = OPPORTUNITY_STATUSES;
export const STATUS_LABEL_MAP = STATUS_LABEL;
