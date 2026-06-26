/**
 * AIQueryBankList — AI Query Bank 列表。
 * RSC；按 updatedAt desc 排（service 已排好）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  AI_QUERY_BANK_INTENT_LABEL,
  AI_QUERY_BANK_PLATFORM_LABEL,
  AI_QUERY_BANK_PRIORITY_LABEL,
  AI_QUERY_BANK_STATUS_LABEL,
} from '@/types';
import type {
  AIQueryBankItem,
  AIQueryBankPriority,
  AIQueryBankStatus,
} from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function priorityTone(p: AIQueryBankPriority): 'danger' | 'warn' | 'neutral' | 'ok' {
  if (p === 'urgent') return 'danger';
  if (p === 'high') return 'warn';
  if (p === 'medium') return 'neutral';
  return 'ok';
}

function statusTone(s: AIQueryBankStatus): 'ok' | 'warn' | 'neutral' {
  if (s === 'active') return 'ok';
  if (s === 'paused') return 'warn';
  return 'neutral';
}

export function AIQueryBankList({
  items,
  brandNameById,
}: {
  items: AIQueryBankItem[];
  brandNameById: Map<string, string>;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No AI queries in the bank yet. Create your first query or generate
          a batch from a brand profile.
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Query</th>
            <th className="px-4 py-2 font-medium">Brand</th>
            <th className="px-4 py-2 font-medium">Intent</th>
            <th className="px-4 py-2 font-medium">Platform</th>
            <th className="px-4 py-2 font-medium">Priority</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium text-right">Assets</th>
            <th className="px-4 py-2 font-medium text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((q) => (
            <tr
              key={q.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5 max-w-md">
                <Link
                  href={`/geo/queries/${q.id}`}
                  className="text-text hover:text-accent font-medium line-clamp-2"
                >
                  {q.query}
                </Link>
                <div className="text-[10px] text-muted font-mono mt-0.5">
                  {q.id}
                </div>
              </td>
              <td className="px-4 py-2.5">
                {brandNameById.get(q.brandEntityId) ? (
                  <Link
                    href={`/geo/brands/${q.brandEntityId}`}
                    className="text-muted hover:text-accent"
                  >
                    {brandNameById.get(q.brandEntityId)}
                  </Link>
                ) : (
                  <span className="text-muted text-xs font-mono">
                    {q.brandEntityId}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs">
                {AI_QUERY_BANK_INTENT_LABEL[q.intent]}
              </td>
              <td className="px-4 py-2.5 text-xs">
                {AI_QUERY_BANK_PLATFORM_LABEL[q.platform]}
              </td>
              <td className="px-4 py-2.5">
                <Badge tone={priorityTone(q.priority)}>
                  {AI_QUERY_BANK_PRIORITY_LABEL[q.priority]}
                </Badge>
              </td>
              <td className="px-4 py-2.5">
                <Badge tone={statusTone(q.status)}>
                  {AI_QUERY_BANK_STATUS_LABEL[q.status]}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                {q.linkedAssetIds.length}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                {fmtDate(q.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
