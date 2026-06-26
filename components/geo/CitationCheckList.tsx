/**
 * CitationCheckList — 引用检查快照列表 (RSC)。
 *
 * 展示：平台 badge / 提及 / 引用 URL / 竞品 / 摘要 / score / 时间。
 * 点单条跳到 /geo/citation-monitor/[id]。
 */
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { CITATION_PLATFORM_LABEL } from '@/types';
import type { AICitationCheck, CitationPlatform } from '@/types';

interface Props {
  checks: AICitationCheck[];
  /** 限定条数（默认全部）。 */
  limit?: number;
  /** 空状态文案。 */
  emptyText?: string;
}

function scoreTone(score: number): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  if (score > 0) return 'danger';
  return 'neutral';
}

function fmtDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}

export function CitationCheckList({ checks, limit, emptyText }: Props) {
  const items = limit ? checks.slice(0, limit) : checks;
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        {emptyText ?? 'No citation checks yet.'}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((c) => (
        <Link
          key={c.id}
          href={`/geo/citation-monitor/${c.id}`}
          className="block rounded-md border border-border bg-panel-2 px-3 py-2 hover:border-accent transition"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              <Badge tone="accent">
                {CITATION_PLATFORM_LABEL[c.platform as CitationPlatform]}
              </Badge>
              <Badge tone={c.mentioned ? 'ok' : 'danger'}>
                {c.mentioned ? 'mentioned' : 'absent'}
              </Badge>
              {c.citedUrl && (
                <Badge tone="warn">cited URL</Badge>
              )}
              <Badge tone={scoreTone(c.geoScore)}>
                GEO {c.geoScore}
              </Badge>
              <span className="text-xs text-muted font-mono truncate">
                {c.id}
              </span>
            </div>
            <span className="text-xs text-muted shrink-0">
              {fmtDate(c.checkedAt)}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-text line-clamp-2">
            {c.answerSummary}
          </p>
          {c.competitorMentions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
              <span className="text-muted">competitors:</span>
              {c.competitorMentions.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center rounded border border-border bg-panel px-1.5 py-0.5 text-muted"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
