import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SourceTypeBadge } from './SourceTypeBadge';
import { SourceCredibilityBar } from './SourceCredibilityBar';
import type { SourceItem, ResearchTopic } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

interface Row {
  source: SourceItem;
  topic?: ResearchTopic;
}

export function SourceList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          暂无资料。点击右上角"New source"添加第一条。
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
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Topic</th>
            <th className="px-4 py-2 font-medium">Credibility</th>
            <th className="px-4 py-2 font-medium">Tags</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ source: s, topic }) => (
            <tr
              key={s.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/research/sources/${s.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {s.title}
                </Link>
                {s.summary && (
                  <div className="text-xs text-muted mt-0.5 truncate max-w-md">
                    {s.summary}
                  </div>
                )}
              </td>
              <td className="px-4 py-2.5">
                <SourceTypeBadge type={s.type} />
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">
                {topic ? (
                  <Link
                    href={`/research/topics/${topic.id}`}
                    className="hover:text-accent"
                  >
                    {topic.title}
                  </Link>
                ) : (
                  <span>—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <SourceCredibilityBar score={s.credibilityScore} />
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">
                {s.tags && s.tags.length > 0
                  ? s.tags.slice(0, 3).map((tag) => (
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
                {fmtDate(s.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
