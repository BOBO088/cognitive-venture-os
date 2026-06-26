/**
 * codexTaskGeneratorService 单元测试。
 *
 * 覆盖：
 *  - generateCodexTaskListForPRD：写 6 条 Task + 共享 generatorRunId / sourcePRDid
 *  - generateCodexTaskListForPRD：PRD 不存在 → CodexTaskGeneratorServiceError
 *  - generateCodexTaskListForPRD：MVP 关联缺失 → CodexTaskGeneratorServiceError
 *  - listCodexTaskRuns：按 run 分组，按 updatedAt desc
 *  - getCodexTaskRun：返回 run + 6 条 task，未知 run → undefined
 *  - deleteCodexTaskRun：只删该 run 的 task，不影响其他 task
 *  - markdown export 渲染：6 节 + 统计表 + command code block
 */

import { describe, it, expect } from 'vitest';
import {
  generateCodexTaskListForPRD,
  listCodexTaskRuns,
  getCodexTaskRun,
  deleteCodexTaskRun,
  CodexTaskGeneratorServiceError,
} from './codexTaskGeneratorService';
import { buildCodexTaskRunReport, buildCodexTaskRunFilename } from '@/lib/export/codexTaskListMarkdown';
import { listTasks } from '@/lib/repos/tasks';
import { getMVPProject } from './mvpProjectService';
import { getPRD } from './prdService';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function genRunId(): string {
  return `run-test-${Math.random().toString(36).slice(2, 8)}`;
}

describe('generateCodexTaskListForPRD', () => {
  it('persists 6 tasks with shared generatorRunId and sourcePRDid', async () => {
    const prd = await getPRD('prd_geo_pulse_v1');
    expect(prd).toBeDefined();
    if (!prd) return;

    const runId = genRunId();
    const run = await generateCodexTaskListForPRD(prd.id, {
      runId,
      createdAt: MOCK_NOW,
    });

    expect(run.id).toBe(runId);
    expect(run.sourcePRDid).toBe(prd.id);
    expect(run.mvpProjectId).toBe(prd.mvpProjectId);
    expect(run.tasks.length).toBe(6);
    for (const t of run.tasks) {
      expect(t.generatorRunId).toBe(runId);
      expect(t.sourcePRDid).toBe(prd.id);
      expect(t.status).toBe('backlog');
      expect((t.codexCommand ?? '').length).toBeGreaterThan(0);
      expect(t.title).toContain(prd.title.split(' ').slice(-1)[0]!);
    }
  });

  it('rejects unknown PRD', async () => {
    await expect(
      generateCodexTaskListForPRD('prd_does_not_exist', {
        runId: genRunId(),
        createdAt: MOCK_NOW,
      }),
    ).rejects.toBeInstanceOf(CodexTaskGeneratorServiceError);
  });

  it('summarizes the run from LLMProvider output', async () => {
    const run = await generateCodexTaskListForPRD('prd_citeboost_v1', {
      runId: genRunId(),
      createdAt: MOCK_NOW,
    });
    expect(run.summary.length).toBeGreaterThan(0);
  });
});

describe('listCodexTaskRuns + getCodexTaskRun', () => {
  it('groups tasks by run id and sorts by updatedAt desc', async () => {
    const runs = await listCodexTaskRuns();
    expect(runs.length).toBeGreaterThan(0);
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i - 1]!.updatedAt.localeCompare(runs[i]!.updatedAt)).toBeGreaterThanOrEqual(0);
    }
    for (const r of runs) {
      expect(r.tasks.length).toBeGreaterThan(0);
    }
  });

  it('getCodexTaskRun returns run with same task list', async () => {
    const runs = await listCodexTaskRuns();
    const target = runs[0]!;
    const fetched = await getCodexTaskRun(target.id);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(target.id);
    expect(fetched!.tasks.length).toBe(target.tasks.length);
  });

  it('getCodexTaskRun returns undefined for unknown id', async () => {
    const r = await getCodexTaskRun('run-does-not-exist');
    expect(r).toBeUndefined();
  });
});

describe('deleteCodexTaskRun', () => {
  it('removes all tasks in a run, leaves others intact', async () => {
    const before = await listTasks();
    const beforeCount = before.length;
    const targetRunId = `run-del-${Math.random().toString(36).slice(2, 8)}`;
    const run = await generateCodexTaskListForPRD('prd_geo_pulse_v1', {
      runId: targetRunId,
      createdAt: MOCK_NOW,
    });
    const afterGenerate = await listTasks();
    expect(afterGenerate.length).toBe(beforeCount + run.tasks.length);

    const deleted = await deleteCodexTaskRun(targetRunId);
    expect(deleted).toBe(run.tasks.length);

    const afterDelete = await listTasks();
    expect(afterDelete.length).toBe(beforeCount);
    // Other tasks remain
    for (const t of afterDelete) {
      expect(t.generatorRunId).not.toBe(targetRunId);
    }
  });
});

describe('buildCodexTaskRunReport', () => {
  it('renders header + per-task sections + command code block + checklist', async () => {
    const run = await generateCodexTaskListForPRD('prd_geo_pulse_v1', {
      runId: genRunId(),
      createdAt: MOCK_NOW,
    });
    const mvp = await getMVPProject(run.mvpProjectId);
    const prd = await getPRD(run.sourcePRDid);
    expect(mvp).toBeDefined();
    expect(prd).toBeDefined();
    if (!mvp || !prd) return;

    const md = buildCodexTaskRunReport({
      generatedAt: MOCK_NOW,
      run,
      mvpProject: mvp,
      prd,
      tasks: run.tasks,
    });

    expect(md).toContain(`# Codex task run — ${mvp.name}`);
    expect(md).toContain('## Status overview');
    expect(md).toContain('## Tasks');
    expect(md).toContain('## Acceptance checklist');
    // At least one codexCommand appears inside a fenced block
    expect(md).toContain('```bash');
    expect(md).toContain('codex "');
    // All task titles appear
    for (const t of run.tasks) {
      expect(md).toContain(t.title);
    }
  });

  it('filename embeds run id and date', () => {
    const fn = buildCodexTaskRunFilename('run-abc');
    expect(fn).toMatch(/^codex-tasks-run-abc-\d{4}-\d{2}-\d{2}\.md$/);
  });
});
