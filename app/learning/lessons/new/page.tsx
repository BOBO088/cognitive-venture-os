/**
 * /learning/lessons/new — 录入复盘。
 *
 *   ?projectId=<mvpId>   预选 project
 *   ?launchId=<id>      预选 launch result + 可选"用 launch 预填"
 *
 * 预填逻辑：若 ?launchId 提供 + ?prefill=1，则调用 LLMProvider 预填；
 * 否则表单留空，由用户手填。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { LessonForm } from '@/components/learning/LessonForm';
import { listMVPProjects } from '@/lib/services/mvpProjectService';
import { listLaunchResultsFiltered } from '@/lib/services/launchResultService';
import { generateLessonDraftForLaunch } from '@/lib/services/lessonService';
import { createLessonAction } from '../actions';
import type { LessonLearned } from '@/types';

export const metadata = {
  title: 'Write retro · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    projectId?: string;
    launchId?: string;
    prefill?: string;
  }>;
}

export default async function NewLessonPage({ searchParams }: PageProps) {
  const { projectId, launchId, prefill } = await searchParams;
  const [mvpProjects, allLaunches] = await Promise.all([
    listMVPProjects(),
    listLaunchResultsFiltered({}),
  ]);

  // 默认按 startDate desc 排
  const sortedMvps = mvpProjects
    .slice()
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  // 预填：调用 LLMProvider，失败时回退到空表单
  let draft: LessonLearned | undefined;
  if (launchId && prefill === '1') {
    try {
      draft = await generateLessonDraftForLaunch(launchId);
    } catch {
      draft = undefined;
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link
          href="/learning/lessons"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to lessons
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">Write a retro</h1>
        <p className="text-sm text-muted">
          9 个结构化字段（Outcome / Insights / Action）填完就是一份可复用的
          组织记忆。AI 预填仅供参考，正式提交前请人工补全。
        </p>
      </div>
      <Card>
        {sortedMvps.length === 0 ? (
          <div className="text-sm text-muted">
            No MVP projects yet. Create one in the{' '}
            <Link href="/mvp" className="text-accent hover:underline">
              MVP pipeline
            </Link>{' '}
            first.
          </div>
        ) : (
          <LessonForm
            mode="create"
            mvpProjects={sortedMvps}
            launchResults={allLaunches}
            {...(projectId ? { defaultProjectId: projectId } : {})}
            {...(launchId ? { defaultLaunchResultId: launchId } : {})}
            {...(draft ? { initial: draft } : {})}
            onSubmit={createLessonAction}
          />
        )}
      </Card>
    </div>
  );
}
