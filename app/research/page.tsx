import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { CardScoreBar } from '@/components/research/CardScoreBar';
import { TopicCategoryBadge } from '@/components/research/TopicCategoryBadge';
import { listTopics } from '@/lib/services/researchTopicService';
import { listSources } from '@/lib/services/sourceService';
import { listCards } from '@/lib/services/researchCardService';
import type { ResearchTopic, ResearchCategory, SourceItem, ResearchCard } from '@/types';

export const metadata = {
  title: 'Research · Cognitive Venture OS',
};

const HIGH_SCORE_THRESHOLD = 80;
const RECENT_LIMIT = 5;
const HIGH_SCORE_LIMIT = 4;

type Kind = 'topic' | 'source' | 'card';
interface RecentItem {
  kind: Kind;
  id: string;
  title: string;
  href: string;
  updatedAt: string;
}

function pickRecent(
  topics: ResearchTopic[],
  sources: SourceItem[],
  cards: ResearchCard[],
  limit: number,
): RecentItem[] {
  const items: RecentItem[] = [
    ...topics.map<RecentItem>((t) => ({
      kind: 'topic',
      id: t.id,
      title: t.title,
      href: `/research/topics/${t.id}`,
      updatedAt: t.updatedAt,
    })),
    ...sources.map<RecentItem>((s) => ({
      kind: 'source',
      id: s.id,
      title: s.title,
      href: `/research/sources/${s.id}`,
      updatedAt: s.updatedAt,
    })),
    ...cards.map<RecentItem>((c) => ({
      kind: 'card',
      id: c.id,
      title: c.title,
      href: `/research/cards/${c.id}`,
      updatedAt: c.updatedAt,
    })),
  ];
  return items
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

function relDate(iso: string): string {
  return iso.slice(0, 10);
}

const KIND_TONE: Record<Kind, 'accent' | 'ok' | 'warn'> = {
  topic: 'accent',
  source: 'warn',
  card: 'ok',
};

const CATEGORY_ORDER: ResearchCategory[] = [
  'ai',
  'geo',
  'ip',
  'short_video',
  'saas',
  'investment',
  'other',
];

export default async function ResearchDashboardPage() {
  // 三路并行拉数据
  const [topics, sources, cards] = await Promise.all([
    listTopics(),
    listSources(),
    listCards(),
  ]);

  const activeTopics = topics.filter((t) => t.status === 'active');
  const highScoreCards = cards
    .filter((c) => (c.score ?? 0) >= HIGH_SCORE_THRESHOLD)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, HIGH_SCORE_LIMIT);
  const recent = pickRecent(topics, sources, cards, RECENT_LIMIT);

  // 按 category 统计 topic
  const categoryCounts = topics.reduce<Record<string, number>>((acc, t) => {
    const k = t.category ?? 'other';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  // 排序：固定顺序 + 按计数倒序
  const categoryRows = Object.entries(categoryCounts).sort(([a], [b]) => {
    const ai = CATEGORY_ORDER.indexOf(a as ResearchCategory);
    const bi = CATEGORY_ORDER.indexOf(b as ResearchCategory);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // source 分布
  const sourceByTopic = sources.filter((s) => s.topicId).length;
  const standaloneSources = sources.length - sourceByTopic;
  // card 分布
  const cardByTopic = cards.filter((c) => c.topicId).length;
  const scoredCards = cards.filter((c) => c.score !== undefined).length;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Research</h1>
          <p className="text-sm text-muted">
            研究主题、资料源、研究卡片的工作台。基于 mock 数据。
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/research/topics" className="text-muted hover:text-text">Topics →</Link>
          <Link href="/research/sources" className="text-muted hover:text-text">Sources →</Link>
          <Link href="/research/cards" className="text-muted hover:text-text">Cards →</Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Active topics"
          value={activeTopics.length}
          hint={`of ${topics.length} total`}
        />
        <Stat
          label="Sources"
          value={sources.length}
          hint={`${sourceByTopic} bound · ${standaloneSources} standalone`}
        />
        <Stat
          label="Research cards"
          value={cards.length}
          hint={`${cardByTopic} bound · ${scoredCards} scored`}
        />
        <Stat
          label="High-score cards"
          value={highScoreCards.length}
          hint={`score ≥ ${HIGH_SCORE_THRESHOLD}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: high score + recent */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">High-score research cards</h2>
              <Link href="/research/cards" className="text-xs text-muted hover:text-text">
                All cards →
              </Link>
            </div>
            {highScoreCards.length === 0 ? (
              <div className="text-sm text-muted">还没有 ≥ {HIGH_SCORE_THRESHOLD} 分的卡片。</div>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {highScoreCards.map((c) => (
                  <li key={c.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/research/cards/${c.id}`}
                        className="text-text hover:text-accent font-medium"
                      >
                        {c.title}
                      </Link>
                      <CardScoreBar score={c.score} />
                    </div>
                    <p className="text-xs text-muted line-clamp-2">{c.summary}</p>
                    {c.tags && c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 4).map((t) => (
                          <Badge key={t} tone="neutral">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Recent updates</h2>
              <span className="text-xs text-muted">mixed topics / sources / cards</span>
            </div>
            {recent.length === 0 ? (
              <div className="text-sm text-muted">还没有内容。</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {recent.map((it) => (
                  <li key={`${it.kind}:${it.id}`} className="flex items-center gap-3 text-sm">
                    <Badge tone={KIND_TONE[it.kind]}>{it.kind}</Badge>
                    <Link
                      href={it.href}
                      className="text-text hover:text-accent flex-1 truncate"
                    >
                      {it.title}
                    </Link>
                    <span className="text-xs text-muted shrink-0">{relDate(it.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right column: categories + quick actions */}
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="text-sm font-semibold text-text mb-3">Topics by category</h2>
            {categoryRows.length === 0 ? (
              <div className="text-sm text-muted">没有 topic。</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {categoryRows.map(([cat, count]) => {
                  const isOther = cat === 'other';
                  return (
                    <li
                      key={cat}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {isOther ? (
                          <Badge tone="neutral">other</Badge>
                        ) : (
                          <TopicCategoryBadge category={cat as ResearchCategory} />
                        )}
                      </div>
                      <span className="text-text tabular-nums">{count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-text mb-3">Quick actions</h2>
            <div className="flex flex-col gap-2">
              <Link
                href="/research/topics/new"
                className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text hover:border-accent transition"
              >
                New research topic
              </Link>
              <Link
                href="/research/sources/new"
                className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text hover:border-accent transition"
              >
                New source
              </Link>
              <Link
                href="/research/cards/new"
                className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text hover:border-accent transition"
              >
                New research card
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
