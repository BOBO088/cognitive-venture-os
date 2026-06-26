/**
 * LaunchResultStatusBadge — 上线结果状态徽章。
 * RSC；tone 映射：success=ok, neutral=neutral, failed=danger, unknown=warn。
 */
import { Badge } from '@/components/ui/Badge';
import { LAUNCH_RESULT_STATUS_LABEL } from '@/types';
import type { LaunchResultStatus } from '@/types';

const TONE_MAP: Record<LaunchResultStatus, 'ok' | 'neutral' | 'danger' | 'warn'> = {
  success: 'ok',
  neutral: 'neutral',
  failed: 'danger',
  unknown: 'warn',
};

export function LaunchResultStatusBadge({
  status,
}: {
  status: LaunchResultStatus;
}) {
  return <Badge tone={TONE_MAP[status]}>{LAUNCH_RESULT_STATUS_LABEL[status]}</Badge>;
}
