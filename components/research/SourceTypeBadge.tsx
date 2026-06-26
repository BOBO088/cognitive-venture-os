import { Badge } from '@/components/ui/Badge';
import type { SourceType } from '@/types';

const LABEL: Record<SourceType, string> = {
  article: 'Article',
  paper: 'Paper',
  video: 'Video',
  website: 'Website',
  note: 'Note',
  report: 'Report',
  book: 'Book',
  podcast: 'Podcast',
};

const TONE: Record<SourceType, 'neutral' | 'accent' | 'ok' | 'warn' | 'danger'> = {
  article: 'neutral',
  paper: 'accent',
  video: 'warn',
  website: 'neutral',
  note: 'ok',
  report: 'accent',
  book: 'ok',
  podcast: 'warn',
};

export function SourceTypeBadge({ type }: { type: SourceType }) {
  return <Badge tone={TONE[type]}>{LABEL[type]}</Badge>;
}
