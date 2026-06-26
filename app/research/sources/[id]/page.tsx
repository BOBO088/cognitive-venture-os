import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { SourceForm } from '@/components/research/SourceForm';
import { SourceTypeBadge } from '@/components/research/SourceTypeBadge';
import { SourceCredibilityBar } from '@/components/research/SourceCredibilityBar';
import { getSource } from '@/lib/services/sourceService';
import { listTopics } from '@/lib/services/researchTopicService';
import { getResearchTopic } from '@/lib/repos/research';
import { updateSourceAction, deleteSourceAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SourceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const source = await getSource(id);
  if (!source) notFound();

  const [topics, topic] = await Promise.all([
    listTopics(),
    source.topicId ? getResearchTopic(source.topicId) : Promise.resolve(undefined),
  ]);

  const onSubmit = updateSourceAction.bind(null, source.id);
  const onDelete = deleteSourceAction.bind(null, source.id);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/research/sources" className="text-sm text-muted hover:text-text">
          ← Back to sources
        </Link>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold text-text">{source.title}</h1>
          <SourceTypeBadge type={source.type} />
        </div>
        <p className="text-xs text-muted mt-1">
          id: <span className="font-mono">{source.id}</span> · created {source.createdAt.slice(0, 10)} · updated {source.updatedAt.slice(0, 10)}
        </p>
      </div>

      <Card>
        <div className="text-sm font-semibold text-text mb-3">Read-only context</div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          {source.url && (
            <>
              <dt className="text-muted">URL</dt>
              <dd>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline break-all"
                >
                  {source.url}
                </a>
              </dd>
            </>
          )}
          <dt className="text-muted">Topic</dt>
          <dd className="text-text text-sm">
            {topic ? (
              <Link href={`/research/topics/${topic.id}`} className="text-accent hover:underline">
                {topic.title}
              </Link>
            ) : (
              <span className="text-muted">— standalone —</span>
            )}
          </dd>
          <dt className="text-muted">Credibility</dt>
          <dd><SourceCredibilityBar score={source.credibilityScore} /></dd>
          {source.author && (
            <>
              <dt className="text-muted">Author</dt>
              <dd className="text-text">{source.author}</dd>
            </>
          )}
          {source.publishedAt && (
            <>
              <dt className="text-muted">Published</dt>
              <dd className="text-text">{source.publishedAt.slice(0, 10)}</dd>
            </>
          )}
          {source.summary && (
            <>
              <dt className="text-muted">Summary</dt>
              <dd className="text-text whitespace-pre-wrap">{source.summary}</dd>
            </>
          )}
          {source.tags && source.tags.length > 0 && (
            <>
              <dt className="text-muted">Tags</dt>
              <dd className="text-text text-xs">
                {source.tags.map((tag) => (
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
          {source.notes && (
            <>
              <dt className="text-muted">Notes</dt>
              <dd className="text-text whitespace-pre-wrap">{source.notes}</dd>
            </>
          )}
        </dl>
      </Card>

      <div>
        <div className="text-sm font-semibold text-text mb-2">Edit</div>
        <SourceForm
          mode="edit"
          initial={source}
          topics={topics}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
