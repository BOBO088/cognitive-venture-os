/**
 * buildLessonReport — 把单条 LessonLearned 序列化为可分享的 markdown 报告。
 * 纯函数；server / client 共用。
 */

import type {
  LessonLearned,
  MVPProject,
  LaunchResult,
} from '@/types';

export interface LessonReportInput {
  generatedAt: string;
  lesson: LessonLearned;
  mvpProject?: MVPProject;
  launchResult?: LaunchResult;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function buildLessonReport(input: LessonReportInput): string {
  const { generatedAt, lesson: l, mvpProject, launchResult } = input;
  const lines: string[] = [];

  lines.push(`# Lesson · ${fmtDate(l.updatedAt)}`);
  lines.push('');
  lines.push(`- Generated at: \`${generatedAt}\``);
  lines.push(`- ID: \`${l.id}\``);
  lines.push(`- Project: ${mvpProject ? `${mvpProject.name} (\`${mvpProject.id}\`)` : `\`${l.projectId}\``}`);
  if (launchResult) {
    lines.push(
      `- Launch: ${fmtDate(launchResult.launchDate)} (\`${launchResult.id}\`) · status \`${launchResult.resultStatus}\``,
    );
  } else if (l.launchResultId) {
    lines.push(`- Launch: \`${l.launchResultId}\``);
  } else {
    lines.push('- Launch: (none)');
  }
  lines.push(`- Created: ${fmtDate(l.createdAt)} · Updated: ${fmtDate(l.updatedAt)}`);
  lines.push('');

  lines.push('## 1. Outcome');
  lines.push('');
  lines.push('### What worked');
  lines.push('');
  lines.push(l.whatWorked);
  lines.push('');
  lines.push('### What failed');
  lines.push('');
  lines.push(l.whatFailed);
  lines.push('');
  lines.push('### Why');
  lines.push('');
  lines.push(l.why);
  lines.push('');

  lines.push('## 2. Insights');
  lines.push('');
  lines.push('### Customer');
  lines.push('');
  lines.push(l.customerInsight);
  lines.push('');
  lines.push('### Market');
  lines.push('');
  lines.push(l.marketInsight);
  lines.push('');
  lines.push('### Product');
  lines.push('');
  lines.push(l.productInsight);
  lines.push('');
  lines.push('### GEO');
  lines.push('');
  lines.push(l.geoInsight);
  lines.push('');

  lines.push('## 3. Action');
  lines.push('');
  lines.push('### Next action');
  lines.push('');
  lines.push(l.nextAction);
  lines.push('');
  lines.push('### Score model suggestion');
  lines.push('');
  lines.push(l.scoreModelSuggestion);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('_Auto-generated lesson report. Edit source fields in /learning/lessons/<id>._');
  return lines.join('\n');
}

export function buildLessonReportFilename(id: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `lesson-${id}-${date}.md`;
}
