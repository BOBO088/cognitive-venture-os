/**
 * buildMVPReport — 把单个 MVPProject 序列化为可分享的 markdown 报告。
 * 纯函数；server / client 共用。
 */

import { MVP_STAGE_LABEL } from '@/types';
import type { MVPProject, Opportunity } from '@/types';
import type { LaunchResult } from '@/types';

export interface MVPReportInput {
  generatedAt: string;
  project: MVPProject;
  opportunity?: Opportunity;
  launches?: LaunchResult[];
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function buildMVPReport(input: MVPReportInput): string {
  const { generatedAt, project: p, opportunity, launches = [] } = input;
  const lines: string[] = [];

  lines.push(`# MVP report — ${p.name}`);
  lines.push('');
  lines.push(`- Generated at: \`${generatedAt}\``);
  lines.push(`- ID: \`${p.id}\``);
  lines.push(`- Stage: **${MVP_STAGE_LABEL[p.stage]}**`);
  lines.push(`- Owner: ${p.owner}`);
  lines.push(`- Start: ${fmtDate(p.startDate)}`);
  if (p.launchDate) lines.push(`- Launch: ${fmtDate(p.launchDate)}`);
  lines.push(`- Source opportunity: \`${p.opportunityId}\`${opportunity ? ` — ${opportunity.title}` : ''}`);
  lines.push('');

  lines.push('## Financials');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Revenue (cumulative) | ${fmtMoney(p.revenue)} |`);
  lines.push(`| Cost (cumulative) | ${fmtMoney(p.cost)} |`);
  const net = p.revenue - p.cost;
  lines.push(`| Net profit | ${net >= 0 ? '+' : ''}${fmtMoney(net)} |`);
  const roi = p.cost === 0 ? '—' : `${((net / p.cost) * 100).toFixed(1)}%`;
  lines.push(`| ROI | ${roi} |`);
  lines.push('');

  lines.push('## Description');
  lines.push('');
  lines.push(p.description);
  lines.push('');

  if (launches.length > 0) {
    lines.push(`## Launch history (${launches.length})`);
    lines.push('');
    lines.push('| Launched | Status | Users | Signups | Traffic | Conversion | Retention | Revenue |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const l of launches) {
      lines.push(
        `| ${fmtDate(l.launchDate)} | ${l.resultStatus} | ${l.users} | ${l.signups} | ${l.traffic} | ${l.conversionRate.toFixed(1)}% | ${l.retentionRate.toFixed(1)}% | ${fmtMoney(l.revenue)} |`,
      );
    }
    lines.push('');
    for (const l of launches) {
      if (l.feedbackSummary) {
        lines.push(`- **${fmtDate(l.launchDate)} (${l.resultStatus})** — ${escapeMd(l.feedbackSummary)}`);
      }
    }
    lines.push('');
  }

  lines.push('## Lessons');
  lines.push('');
  if (p.lessons.trim().length === 0) {
    lines.push('_No lessons recorded yet._');
  } else {
    lines.push(p.lessons);
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('_Auto-generated MVP report. Edit source fields in /mvp/<id>._');
  return lines.join('\n');
}

export function buildMVPReportFilename(id: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `mvp-${id}-${date}.md`;
}
