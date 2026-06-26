import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { TopicForm } from '@/components/research/TopicForm';
import { TopicStatusBadge } from '@/components/research/TopicStatusBadge';
import { TopicPriorityBadge } from '@/components/research/TopicPriorityBadge';
import { TopicCategoryBadge } from '@/components/research/TopicCategoryBadge';
import { getTopic } from '@/lib/services/researchTopicService';
import { updateTopicAction, deleteTopicAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ResearchTopicDetailPage({ params }: PageProps) {
  const { id } = await params;
  const topic = await getTopic(id);
  if (!topic) notFound();

  const onSubmit = updateTopicAction.bind(null, topic.id);
  const onDelete = deleteTopicAction.bind(null, topic.id);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/research/topics" className="text-sm text-muted hover:text-text">
          ← Back to topics
        </Link>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-semibold text-text">{topic.title}</h1>
          <TopicStatusBadge status={topic.status} />
          <TopicPriorityBadge priority={topic.priority ?? 'medium'} />
          {topic.category && <TopicCategoryBadge category={topic.category} />}
        </div>
        <p className="text-xs text-muted mt-1">
          id: <span className="font-mono">{topic.id}</span> · created {topic.createdAt.slice(0, 10)} · updated {topic.updatedAt.slice(0, 10)}
        </p>
      </div>

      <Card>
        <div className="text-sm font-semibold text-text mb-3">Read-only context</div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          {topic.description && (
            <>
              <dt className="text-muted">Description</dt>
              <dd className="text-text whitespace-pre-wrap">{topic.description}</dd>
            </>
          )}
          {topic.question && (
            <>
              <dt className="text-muted">Question</dt>
              <dd className="text-text">{topic.question}</dd>
            </>
          )}
          {topic.scope && (
            <>
              <dt className="text-muted">Scope</dt>
              <dd className="text-text whitespace-pre-wrap">{topic.scope}</dd>
            </>
          )}
          {topic.tags && topic.tags.length > 0 && (
            <>
              <dt className="text-muted">Tags</dt>
              <dd className="text-text text-xs">
                {topic.tags.map((tag) => (
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
          <dt className="text-muted">Stats</dt>
          <dd className="text-text text-xs">
            {topic.cardIds.length} card(s) · {topic.sourceIds.length} source(s) · {topic.signalIds.length} signal(s)
          </dd>
        </dl>
      </Card>

      <div>
        <div className="text-sm font-semibold text-text mb-2">Edit</div>
        <TopicForm
          mode="edit"
          initial={topic}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
