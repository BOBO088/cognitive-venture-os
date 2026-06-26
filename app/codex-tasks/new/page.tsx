/**
 * /codex-tasks/new — 选择一份 PRD → 生成 Codex 任务列表。
 *   ?prdId=<id> 预选 PRD
 *
 * 流程：选择 PRD（可选）→ 点击 "Generate task list" → server action 调用
 * LLMProvider.generateCodexTasks → 写 6 条 Task 落 Codex Task Board → 跳到 run 详情。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { generateCodexTaskListAction } from '../actions';
import { listPRDs, getLatestPRDForMVP } from '@/lib/services/prdService';
import { listMVPProjects } from '@/lib/services/mvpProjectService';
import { PRDVersionBadge } from '@/components/prd/PRDVersionBadge';
import type { PRD } from '@/types';

export const metadata = {
  title: 'Generate Codex tasks · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ prdId?: string }>;
}

export default async function NewCodexTaskListPage({ searchParams }: PageProps) {
  const { prdId } = await searchParams;
  const [allPrds, projects] = await Promise.all([
    listPRDs(),
    listMVPProjects(),
  ]);

  // 默认按 MVP 名字母序排，每组下只展示"最新"那份 PRD，方便选
  const mvpById = new Map(projects.map((p) => [p.id, p]));
  const latestByMvp = new Map<string, PRD>();
  for (const p of allPrds) {
    const cur = latestByMvp.get(p.mvpProjectId);
    if (!cur || p.version > cur.version) {
      latestByMvp.set(p.mvpProjectId, p);
    }
  }
  const sortedMvp = projects
    .filter((m) => latestByMvp.has(m.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  // 给用户列的所有 PRD 都可选（包括旧版本）— service 不限制版本
  const options = allPrds
    .slice()
    .sort((a, b) => {
      const ma = mvpById.get(a.mvpProjectId)?.name ?? a.mvpProjectId;
      const mb = mvpById.get(b.mvpProjectId)?.name ?? b.mvpProjectId;
      if (ma !== mb) return ma.localeCompare(mb);
      return b.version - a.version;
    });

  const preselect = prdId ?? options[0]?.id ?? '';
  void getLatestPRDForMVP; // re-exported for possible future use

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/codex-tasks" className="text-sm text-muted hover:text-text">
          ← Back to Codex Task Generator
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">Generate Codex task list</h1>
        <p className="text-sm text-muted">
          Pick a PRD. The mock LLMProvider will derive 6 Codex tasks (架构 / 数据 / 页面 / API / 测试 / 部署)
          with copy-paste-ready commands. Each task lands in the Codex Task Board and
          shares the same generator run id.
        </p>
      </div>

      <Card>
        {sortedMvp.length === 0 ? (
          <div className="text-sm text-muted">
            No MVP project has a PRD yet. Generate a PRD in the{' '}
            <Link href="/prd/new" className="text-accent hover:underline">
              PRD generator
            </Link>{' '}
            first.
          </div>
        ) : (
          <form
            action={generateCodexTaskListAction}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="prdId" className="text-xs text-muted">
                Source PRD <span className="text-danger">*</span>
              </label>
              <select
                id="prdId"
                name="prdId"
                required
                defaultValue={preselect}
                className="rounded border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
              >
                {options.map((p) => {
                  const mvpName = mvpById.get(p.mvpProjectId)?.name ?? p.mvpProjectId;
                  return (
                    <option key={p.id} value={p.id}>
                      {mvpName} — {p.title} (v{p.version})
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-muted">
                默认选最新版本。如需指定旧版本，从下拉列表里挑。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary">
                Generate 6 Codex tasks
              </Button>
              <Link
                href="/codex-tasks"
                className="text-sm text-muted hover:text-text"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">Hint</h2>
        <p className="text-xs text-muted">
          MVP 列表中有 {sortedMvp.length} 个项目已生成 PRD。
          最新版本标{' '}
          <PRDVersionBadge version={99} />{' '}
          （仅作展示，实际以 select 选项里的 v 字段为准）。
        </p>
      </Card>
    </div>
  );
}
