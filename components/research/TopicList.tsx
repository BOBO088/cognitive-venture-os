import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { TopicStatusBadge } from './TopicStatusBadge';
import { TopicPriorityBadge } from './TopicPriorityBadge';
import { TopicCategoryBadge } from './TopicCategoryBadge';
import type { ResearchTopic } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function TopicList({ topics }: { topics: ResearchTopic[] }) {
  if (topics.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          暂无研究主题。点击右上角"New topic"创建第一条。
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Title</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Priority</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 font-medium">Tags</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((t) => (
            <tr
              key={t.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/research/topics/${t.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {t.title}
                </Link>
                {t.description && (
                  <div className="text-xs text-muted mt-0.5 truncate max-w-md">
                    {t.description}
                  </div>
                )}
              </td>
              <td className="px-4 py-2.5">
                <TopicStatusBadge status={t.status} />
              </td>
              <td className="px-4 py-2.5">
                <TopicPriorityBadge priority={t.priority ?? 'medium'} />
              </td>
              <td className="px-4 py-2.5">
                {t.category ? (
                  <TopicCategoryBadge category={t.category} />
                ) : (
                  <span className="text-muted text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">
                {t.tags && t.tags.length > 0
                  ? t.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block mr-1 px-1.5 py-0.5 rounded border border-border"
                      >
                        {tag}
                      </span>
                    ))
                  : '—'}
              </td>
              <td className="px-4 py-2.5 text-muted text-xs">
                {fmtDate(t.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
