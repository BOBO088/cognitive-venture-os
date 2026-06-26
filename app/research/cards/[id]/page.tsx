import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { CardForm } from '@/components/research/CardForm';
import { CardScoreBar } from '@/components/research/CardScoreBar';
import { CardMarkdownDownload } from '@/components/research/CardMarkdownDownload';
import { getCard, exportMarkdown } from '@/lib/services/researchCardService';
import { listTopics } from '@/lib/services/researchTopicService';
import { listSourceItems, getResearchTopic } from '@/lib/repos/research';
import { updateCardAction, deleteCardAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ResearchCardDetailPage({ params }: PageProps) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  const [topics, sources, topic] = await Promise.all([
    listTopics(),
    listSourceItems(),
    getResearchTopic(card.topicId),
  ]);

  // 把 sourceId 列表解析为 SourceItem（详情页展示）
  const linkedSources = card.sourceIds
    .map((sid) => sources.find((s) => s.id === sid))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  const onSubmit = updateCardAction.bind(null, card.id);
  const onDelete = deleteCardAction.bind(null, card.id);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/research/cards" className="text-sm text-muted hover:text-text">
          ← Back to cards
        </Link>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold text-text">{card.title}</h1>
        </div>
        <p className="text-xs text-muted mt-1">
          id: <span className="font-mono">{card.id}</span> · created {card.createdAt.slice(0, 10)} · updated {card.updatedAt.slice(0, 10)}
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-text">Read-only context</div>
          <CardMarkdownDownload
            getMarkdown={() => exportMarkdown(card)}
            filename={`card-${card.id}`}
          />
        </div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Summary</dt>
          <dd className="text-text whitespace-pre-wrap">{card.summary}</dd>

          <dt className="text-muted">Topic</dt>
          <dd className="text-text text-sm">
            {topic ? (
              <Link href={`/research/topics/${topic.id}`} className="text-accent hover:underline">
                {topic.title}
              </Link>
            ) : (
              <span className="text-muted">— orphan —</span>
            )}
          </dd>

          <dt className="text-muted">Score</dt>
          <dd><CardScoreBar score={card.score} /></dd>

          {card.keyInsights && card.keyInsights.length > 0 && (
            <>
              <dt className="text-muted">Key insights</dt>
              <dd className="text-text">
                <ul className="list-disc pl-5 space-y-1">
                  {card.keyInsights.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}

          {card.evidence && card.evidence.length > 0 && (
            <>
              <dt className="text-muted">Evidence</dt>
              <dd className="text-text">
                <ul className="list-disc pl-5 space-y-1">
                  {card.evidence.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}

          {card.risks && card.risks.length > 0 && (
            <>
              <dt className="text-muted">Risks</dt>
              <dd className="text-text">
                <ul className="list-disc pl-5 space-y-1">
                  {card.risks.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}

          {card.tags && card.tags.length > 0 && (
            <>
              <dt className="text-muted">Tags</dt>
              <dd className="text-text text-xs">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block mr-1 px-1.5 py-0.5 rounded border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </>
          )}

          {linkedSources.length > 0 && (
            <>
              <dt className="text-muted">Sources</dt>
              <dd className="text-text text-sm">
                <ul className="list-disc pl-5 space-y-1">
                  {linkedSources.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/research/sources/${s.id}`}
                        className="text-accent hover:underline"
                      >
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}
        </dl>
      </Card>

      <div>
        <div className="text-sm font-semibold text-text mb-2">Edit</div>
        <CardForm
          mode="edit"
          initial={card}
          topics={topics}
          sources={sources}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
