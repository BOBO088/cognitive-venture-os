import Link from 'next/link';
import { RelationForm } from '@/components/graph/RelationForm';
import { listGraphEntities } from '@/lib/repos/knowledge-graph';
import { createRelationAction } from '../actions';

export const metadata = {
  title: 'New graph relation · Cognitive Venture OS',
};

export default async function NewGraphRelationPage() {
  const entities = await listGraphEntities();
  const entityOptions = entities.map((e) => ({ id: e.id, name: e.name, kind: e.kind }));

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/graph/relations" className="text-sm text-muted hover:text-text">
          ← Back to relations
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-text">New graph relation</h1>
        <p className="text-sm text-muted">
          service 层会校验 source/target 引用存在性、禁止 self-loop、约束 strength ∈ [0, 100]、规范 linkedResearchCardIds。
        </p>
      </div>

      <RelationForm mode="create" entities={entityOptions} onSubmit={createRelationAction} />
    </div>
  );
}
