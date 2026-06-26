import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CardList } from '@/components/research/CardList';
import { listCards } from '@/lib/services/researchCardService';
import { getResearchTopic } from '@/lib/repos/research';

export const metadata = {
  title: 'Research cards · Cognitive Venture OS',
};

export default async function ResearchCardsPage() {
  const cards = await listCards();
  // 解析 topic 反链
  const rows = await Promise.all(
    cards.map(async (c) => ({
      card: c,
      topic: c.topicId ? await getResearchTopic(c.topicId) : undefined,
    })),
  );

  const withTopic = cards.filter((c) => c.topicId).length;
  const avgScore =
    cards.length > 0
      ? Math.round(
          cards.reduce((acc, c) => acc + (c.score ?? 0), 0) / cards.length,
        )
      : 0;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Research cards</h1>
          <p className="text-sm text-muted">
            {cards.length} card{cards.length === 1 ? '' : 's'} · {withTopic} bound to topic · avg score {avgScore}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/research/topics" className="text-sm text-muted hover:text-text">
            ← Topics
          </Link>
          <Link href="/research/sources" className="text-sm text-muted hover:text-text">
            Source library
          </Link>
          <Link href="/research/cards/new">
            <Button variant="primary">New card</Button>
          </Link>
        </div>
      </div>

      <CardList rows={rows} />
    </div>
  );
}
