import Link from 'next/link';
import { EntityForm } from '@/components/graph/EntityForm';
import { createEntityAction } from '../actions';

export const metadata = {
  title: 'New graph entity · Cognitive Venture OS',
};

export default function NewGraphEntityPage() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/graph/entities" className="text-sm text-muted hover:text-text">
          ← Back to entities
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-text">New graph entity</h1>
        <p className="text-sm text-muted">
          在知识图谱里新建一个节点。service 层会校验 name / kind，规范 tags / aliases，约束 metadata key 格式。
        </p>
      </div>

      <EntityForm mode="create" onSubmit={createEntityAction} />
    </div>
  );
}
