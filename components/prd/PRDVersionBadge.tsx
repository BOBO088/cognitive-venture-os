/**
 * PRDVersionBadge — v1/v2/v3 标签。RSC。
 */
import { Badge } from '@/components/ui/Badge';

export function PRDVersionBadge({ version }: { version: number }) {
  return (
    <Badge tone="accent" aria-label={`PRD version ${version}`}>
      v{version}
    </Badge>
  );
}
