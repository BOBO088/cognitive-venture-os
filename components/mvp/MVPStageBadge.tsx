/**
 * MVPStageBadge — 7 个 stage 的颜色 + 标签。
 * RSC；颜色基调与 OpportunityStatusBadge / SignalCategoryBadge 保持一致。
 */
import { Badge } from '@/components/ui/Badge';
import { MVP_STAGE_LABEL } from '@/types';
import type { MVPStage } from '@/types';

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';

const TONE: Record<MVPStage, Tone> = {
  idea: 'neutral',
  research: 'accent',
  validation: 'accent',
  mvp: 'warn',
  launched: 'ok',
  revenue: 'ok',
  killed: 'danger',
};

export function MVPStageBadge({ stage }: { stage: MVPStage }) {
  return <Badge tone={TONE[stage]}>{MVP_STAGE_LABEL[stage]}</Badge>;
}
