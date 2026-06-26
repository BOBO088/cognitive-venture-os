import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TopicList } from '@/components/research/TopicList';
import { listTopics } from '@/lib/services/researchTopicService';

export const metadata = {
  title: 'Research topics · Cognitive Venture OS',
};

export default async function ResearchTopicsPage() {
  const topics = await listTopics();
  const counts = topics.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text">Research Topics</h1>
          <p className="text-sm text-muted">
            {topics.length} topic{topics.length === 1 ? '' : 's'} ·{' '}
            {counts.active ?? 0} active · {counts.completed ?? 0} completed ·{' '}
            {counts.archived ?? 0} archived
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/research/cards" className="text-sm text-muted hover:text-text">
            Research cards →
          </Link>
          <Link href="/research/sources" className="text-sm text-muted hover:text-text">
            Source library →
          </Link>
          <Link href="/research/topics/new">
            <Button variant="primary">New topic</Button>
          </Link>
        </div>
      </div>

      <TopicList topics={topics} />
    </div>
  );
}
