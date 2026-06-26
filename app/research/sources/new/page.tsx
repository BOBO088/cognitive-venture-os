import Link from 'next/link';
import { SourceForm } from '@/components/research/SourceForm';
import { listTopics } from '@/lib/services/researchTopicService';
import { createSourceAction } from '../actions';

export const metadata = {
  title: 'New source · Cognitive Venture OS',
};

export default async function NewSourcePage() {
  const topics = await listTopics();

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/research/sources" className="text-sm text-muted hover:text-text">
          ← Back to sources
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-text">New source</h1>
        <p className="text-sm text-muted">
          添加一条研究资料。service 层会校验 url 格式、credibility 范围、topicId 引用。
        </p>
      </div>

      <SourceForm mode="create" topics={topics} onSubmit={createSourceAction} />
    </div>
  );
}
