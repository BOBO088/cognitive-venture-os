/**
 * /prd/new — 生成 PRD 草稿。
 *   ?mvpProjectId=<id> 预选 MVP
 *
 * 流程：选择 MVP（可选）→ 点击 "Generate PRD" → server action 调用
 * LLMProvider.generatePRD → 创建 PRD（自动 version + 1）→ 跳到详情。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createPRDDraftAction } from '../actions';
import { listMVPProjects } from '@/lib/services/mvpProjectService';
import type { MVPProject } from '@/types';

export const metadata = {
  title: 'Generate PRD · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ mvpProjectId?: string }>;
}

export default async function NewPRDPage({ searchParams }: PageProps) {
  const { mvpProjectId } = await searchParams;
  const projects = await listMVPProjects();

  // 默认按 startDate desc 排（最近立项在前），方便挑选
  const sorted = projects
    .slice()
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const preselect = mvpProjectId ?? sorted[0]?.id ?? '';

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/prd" className="text-sm text-muted hover:text-text">
          ← Back to PRD library
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">Generate PRD</h1>
        <p className="text-sm text-muted">
          Pick an MVP project. The mock LLMProvider will draft all 9 sections
          based on the project, its source opportunity, and prior launches.
          Version auto-increments per MVP.
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
          <form action={createPRDDraftAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mvpProjectId" className="text-xs text-muted">
                MVP project <span className="text-danger">*</span>
              </label>
              <select
                id="mvpProjectId"
                name="mvpProjectId"
                required
                defaultValue={preselect}
                className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
              >
                {sorted.map((p: MVPProject) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.stage} — {p.startDate.slice(0, 10)}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted">
                The PRD will be tagged [mock] and you can edit any section
                after generation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary">
                Generate PRD draft
              </Button>
              <Link href="/prd" className="text-sm text-muted hover:text-text">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
