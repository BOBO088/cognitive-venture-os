/**
 * CodexTaskCategoryBadge — 6 大分类彩色标签。RSC。
 */
import { Badge } from '@/components/ui/Badge';
import {
  CODEX_TASK_CATEGORY_LABEL,
  type CodexTaskCategory,
} from '@/types';

const TONE: Record<CodexTaskCategory, 'neutral' | 'warn' | 'accent' | 'ok' | 'danger'> = {
  architecture: 'accent',
  data_model: 'accent',
  page: 'warn',
  api: 'warn',
  test: 'ok',
  deploy: 'danger',
};

export function CodexTaskCategoryBadge({ category }: { category: CodexTaskCategory }) {
  return (
    <Badge tone={TONE[category]} aria-label={CODEX_TASK_CATEGORY_LABEL[category]}>
      {CODEX_TASK_CATEGORY_LABEL[category]}
    </Badge>
  );
}
