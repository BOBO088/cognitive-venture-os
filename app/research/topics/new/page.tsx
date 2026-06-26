import Link from 'next/link';
import { TopicForm } from '@/components/research/TopicForm';
import { createTopicAction } from '../actions';

export const metadata = {
  title: 'New research topic · Cognitive Venture OS',
};

export default function NewResearchTopicPage() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/research/topics" className="text-sm text-muted hover:text-text">
          ← Back to topics
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-text">New research topic</h1>
        <p className="text-sm text-muted">
          创建一个研究主题。service 层会校验 title、规范 tags、约束 status 转移。
        </p>
      </div>

      <TopicForm mode="create" onSubmit={createTopicAction} />
    </div>
  );
}
