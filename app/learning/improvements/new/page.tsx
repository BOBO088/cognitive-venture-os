/**
 * /learning/improvements/new — 新建一条 improvement log。
 *
 *   ?targetType=<type>&targetId=<id>   预填目标（从某 prompt/loop 详情跳过来）
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ImprovementForm } from '@/components/iteration/ImprovementForm';
import { createImprovementLogAction } from '../actions';
import { IMPROVEMENT_TARGET_TYPES } from '@/types';
import type { ImprovementTargetType } from '@/types';

export const metadata = {
  title: 'New improvement · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ targetType?: string; targetId?: string }>;
}

function asTargetType(
  v: string | undefined,
): ImprovementTargetType | undefined {
  if (!v) return undefined;
  if (IMPROVEMENT_TARGET_TYPES.includes(v as ImprovementTargetType)) {
    return v as ImprovementTargetType;
  }
  return undefined;
}

export default async function NewImprovementPage({ searchParams }: PageProps) {
  const { targetType: ttRaw, targetId } = await searchParams;
  const targetType = asTargetType(ttRaw);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link
          href="/learning/improvements"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to improvements
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">Log an improvement</h1>
        <p className="text-sm text-muted">
          Capture a problem + a concrete suggestion. Apply it later by
          creating a new prompt/loop version, then come back to record the
          result.
        </p>
      </div>
      <Card>
        <ImprovementForm
          mode="create"
          onSubmit={createImprovementLogAction}
          {...(targetId ? { defaultTargetId: targetId } : {})}
          {...(targetType ? { defaultTargetType: targetType } : {})}
        />
      </Card>
    </div>
  );
}
