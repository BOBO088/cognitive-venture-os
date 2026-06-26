/**
 * buildCodexTaskRunReport — 把单次 Codex Task Generator run 序列化为
 * 可分享的 markdown 报告。纯函数；server / client 共用。
 *
 * 数据流：app/codex-tasks/[id]/page.tsx (server) 装配 run + tasks + PRD + MVP →
 * 传给 client 组件 → 调用 buildCodexTaskRunReport → 下载。
 *
 * 关键产物：每个 task 单独一节，可直接复制的 `codexCommand` 用 fenced code block。
 */

import {
  CODEX_TASK_CATEGORY_LABEL,
  type CodexTaskCategory,
  type CodexTaskRun,
} from '@/types';
import type { MVPProject, PRD, Task } from '@/types';

export interface CodexTaskRunReportInput {
  generatedAt: string;
  run: CodexTaskRun;
  mvpProject: MVPProject;
  prd: PRD;
  tasks: Task[];
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

const CATEGORY_BY_KEYWORD: Array<[CodexTaskCategory, RegExp]> = [
  ['architecture', /架构|目录骨架|architecture/i],
  ['data_model', /数据模型|repo|mock 数据/i],
  ['page', /页面|form|page/i],
  ['api', /API|REST|api/i],
  ['test', /测试|test/i],
  ['deploy', /部署|环境变量|\.env|deploy/i],
];

/** 用 task 标题关键词反查 category（mock impl 的 title 携带可识别信号）。 */
function detectCategory(task: Task): CodexTaskCategory | undefined {
  for (const [cat, re] of CATEGORY_BY_KEYWORD) {
    if (re.test(task.title)) return cat;
  }
  return undefined;
}

export function buildCodexTaskRunReport(input: CodexTaskRunReportInput): string {
  const { generatedAt, run, mvpProject, prd, tasks } = input;
  const lines: string[] = [];

  lines.push(`# Codex task run — ${mvpProject.name}`);
  lines.push('');
  lines.push(`- Generated at: \`${generatedAt}\``);
  lines.push(`- Run id: \`${run.id}\``);
  lines.push(`- MVP project: [${mvpProject.name}](/mvp/${mvpProject.id}) (\`${mvpProject.id}\`)`);
  lines.push(`- Source PRD: [${prd.title} v${prd.version}](/prd/${prd.id}) (\`${prd.id}\`)`);
  lines.push(`- Tasks: **${tasks.length}**`);
  lines.push('');
  if (run.summary) {
    lines.push(`> ${run.summary}`);
    lines.push('');
  }

  // Stats by status / priority / category
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    const c = detectCategory(t);
    if (c) byCategory[c] = (byCategory[c] ?? 0) + 1;
  }
  lines.push('## Status overview');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('| --- | --- |');
  for (const s of ['backlog', 'doing', 'review', 'done', 'failed']) {
    lines.push(`| ${s} | ${byStatus[s] ?? 0} |`);
  }
  lines.push('');
  lines.push('| Priority | Count |');
  lines.push('| --- | --- |');
  for (const p of ['urgent', 'high', 'medium', 'low']) {
    lines.push(`| ${p} | ${byPriority[p] ?? 0} |`);
  }
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('| --- | --- |');
  for (const c of Object.keys(CODEX_TASK_CATEGORY_LABEL)) {
    lines.push(`| ${CODEX_TASK_CATEGORY_LABEL[c as CodexTaskCategory]} | ${byCategory[c] ?? 0} |`);
  }
  lines.push('');

  lines.push('## Tasks');
  lines.push('');
  tasks.forEach((t, i) => {
    const cat = detectCategory(t);
    const label = cat ? CODEX_TASK_CATEGORY_LABEL[cat] : '其他';
    lines.push(`### ${i + 1}. ${t.title}`);
    lines.push('');
    lines.push(`- Status: \`${t.status}\` · Priority: \`${t.priority}\` · Phase: \`${t.phase ?? '—'}\` · Category: **${label}**`);
    lines.push(`- Task id: \`${t.id}\``);
    if (t.changedFiles.length > 0) {
      lines.push(`- Expected files:`);
      for (const f of t.changedFiles) {
        lines.push(`  - \`${f}\``);
      }
    }
    if (t.description) {
      lines.push('');
      lines.push(t.description);
    }
    if (t.codexCommand) {
      lines.push('');
      lines.push('**Codex command (copy-paste):**');
      lines.push('');
      lines.push('```bash');
      lines.push(t.codexCommand);
      lines.push('```');
    }
    lines.push('');
  });

  lines.push('## Acceptance checklist');
  lines.push('');
  tasks.forEach((t, i) => {
    lines.push(`- [ ] ${i + 1}. ${t.title} — \`${t.status}\``);
  });
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`Created: ${fmtDate(run.createdAt)} · Updated: ${fmtDate(run.updatedAt)}`);
  lines.push('');
  lines.push('_Auto-generated Codex task run report. Edit tasks in /tasks/<id>._');
  return lines.join('\n');
}

export function buildCodexTaskRunFilename(runId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `codex-tasks-${runId}-${date}.md`;
}
