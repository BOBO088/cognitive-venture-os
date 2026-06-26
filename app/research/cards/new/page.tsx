import Link from 'next/link';
import { CardForm } from '@/components/research/CardForm';
import { listTopics } from '@/lib/services/researchTopicService';
import { listSourceItems } from '@/lib/repos/research';
import { createCardAction } from '../actions';

export const metadata = {
  title: 'New research card · Cognitive Venture OS',
};

export default async function NewResearchCardPage() {
  // CardForm 需要 topics + sources 全量列表，让 operator 可以选 "from-source" / "from-topic"
  const [topics, sources] = await Promise.all([listTopics(), listSourceItems()]);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/research/cards" className="text-sm text-muted hover:text-text">
          ← Back to cards
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-text">New research card</h1>
        <p className="text-sm text-muted">
          把一条 source 或一个 topic 浓缩成一张可独立消费的研究卡片。AI 摘要走 mock LLMProvider，service 层负责规范化。
        </p>
      </div>

      <CardForm
        mode="create"
        topics={topics}
        sources={sources}
        onSubmit={createCardAction}
      />
    </div>
  );
}
