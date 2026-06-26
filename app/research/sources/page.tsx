import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { SourceList } from '@/components/research/SourceList';
import { listSourcesWithTopic, searchSources } from '@/lib/services/sourceService';
import { getResearchTopic } from '@/lib/repos/research';

export const metadata = {
  title: 'Source library · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SourcesPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  // 走 service 的 search 入口（即使空 query 也走它，让 service 决定 fallback）
  const matched = query ? await searchSources(query) : await listSourcesWithTopic().then((rs) => rs.map((r) => r.source));

  // 把 source 解析成 row（带 topic 引用）
  const rows = await Promise.all(
    matched.map(async (s) => ({
      source: s,
      topic: s.topicId ? await getResearchTopic(s.topicId) : undefined,
    })),
  );

  const totalSources = matched.length;
  const boundCount = matched.filter((s) => s.topicId).length;
  const unboundCount = totalSources - boundCount;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Source library</h1>
          <p className="text-sm text-muted">
            {totalSources} source{totalSources === 1 ? '' : 's'} · {boundCount} bound to topic · {unboundCount} standalone
            {query && (
              <span className="ml-2">
                · search: <span className="text-text">"{query}"</span>{' '}
                <Link href="/research/sources" className="text-accent hover:underline ml-1">clear</Link>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/research/cards" className="text-sm text-muted hover:text-text">
            Research cards →
          </Link>
          <Link href="/research/topics" className="text-sm text-muted hover:text-text">
            ← Topics
          </Link>
          <Link href="/research/sources/new">
            <Button variant="primary">New source</Button>
          </Link>
        </div>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="搜索 title / summary / notes / tags..."
          className="flex-1 rounded-md border border-border bg-panel px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <SourceList rows={rows} />
    </div>
  );
}
