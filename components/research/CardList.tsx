import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { CardScoreBar } from './CardScoreBar';
import type { ResearchCard, ResearchTopic } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

interface Row {
  card: ResearchCard;
  topic?: ResearchTopic;
}

export function CardList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          暂无研究卡片。从 Topic 或 Source 创建第一条。
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
            <th className="px-4 py-2 font-medium">Topic</th>
            <th className="px-4 py-2 font-medium">Score</th>
            <th className="px-4 py-2 font-medium">Tags</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ card: c, topic }) => (
            <tr
              key={c.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/research/cards/${c.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {c.title}
                </Link>
                <div className="text-xs text-muted mt-0.5 truncate max-w-md">
                  {c.summary}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {c.keyInsights?.length ?? 0} insights · {c.evidence?.length ?? 0} evidence · {c.risks?.length ?? 0} risks · {c.sourceIds.length} sources
                </div>
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
                <CardScoreBar score={c.score} />
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">
                {c.tags && c.tags.length > 0
                  ? c.tags.slice(0, 3).map((tag) => (
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
                {fmtDate(c.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
