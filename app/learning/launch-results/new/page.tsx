/**
 * /learning/launch-results/new — 录入一次 launch 结果。
 *
 *   ?projectId=<mvpId>  预选 MVP（从 /mvp/[id] 跳转过来）
 *
 * 数据流：page (RSC) → listMVPProjects → LaunchResultForm
 *       提交 → createLaunchResultAction → 跳到详情
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LaunchResultForm } from '@/components/learning/LaunchResultForm';
import { listMVPProjects } from '@/lib/services/mvpProjectService';
import { createLaunchResultAction } from '../actions';

export const metadata = {
  title: 'Record launch · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function NewLaunchResultPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;
  const projects = await listMVPProjects();

  // 默认按 startDate desc 排，最近立项在前
  const sorted = projects
    .slice()
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link
          href="/learning/launch-results"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to launch results
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">Record a launch</h1>
        <p className="text-sm text-muted">
          Enter the metrics from your latest launch. Status is auto-inferred
          from conversion + retention when left on Unknown.
        </p>
      </div>
      <Card>
        {sorted.length === 0 ? (
          <div className="text-sm text-muted">
            No MVP projects yet. Create one in the{' '}
            <Link href="/mvp" className="text-accent hover:underline">
              MVP pipeline
            </Link>{' '}
            first.
          </div>
        ) : (
          <LaunchResultForm
            mode="create"
            mvpProjects={sorted}
            {...(projectId ? { defaultMvpProjectId: projectId } : {})}
            onSubmit={createLaunchResultAction}
          />
        )}
      </Card>
    </div>
  );
}
