/**
 * buildRankingReport — 把全量 opportunity ranking 序列化为 markdown 报告。
 *
 * 纯函数；server / client 共用。Input 由 page 端装配好（含 resolved
 * opportunity / latestEvaluation），client 仅做序列化 + 下载。
 *
 * 与 buildOpportunityReport 风格保持一致。
 */

import type { OpportunityEvaluation } from '@/types';
import {
  breakdownEvaluation,
  type RankingRow,
} from '@/lib/services/evaluationService';

export interface RankingReportInput {
  generatedAt: string;
  rows: RankingRow[];
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function fmtScore(n: number): string {
  return n.toFixed(1);
}

export function buildRankingReport(input: RankingReportInput): string {
  const { generatedAt, rows } = input;
  const evaluated = rows.filter(
    (r) => r.latestEvaluation.id !== '__placeholder__',
  );
  const scores = evaluated.map((r) => r.latestEvaluation.totalScore);
  const avg = scores.length === 0
    ? 0
    : scores.reduce((a, b) => a + b, 0) / scores.length;
  const hi = scores.length === 0 ? 0 : Math.max(...scores);
  const lo = scores.length === 0 ? 0 : Math.min(...scores);
  const median = scores.length === 0
    ? 0
    : [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)]!;

  const lines: string[] = [];
  lines.push('# Opportunity ranking report');
  lines.push('');
  lines.push(`- Generated at: \`${generatedAt}\``);
  lines.push(`- Total opportunities: **${rows.length}**`);
  lines.push(`- Evaluated: **${evaluated.length}**`);
  lines.push(`- Average total score: **${fmtScore(avg)}** / 100`);
  lines.push(`- Median: **${fmtScore(median)}** · Max: **${fmtScore(hi)}** · Min: **${fmtScore(lo)}**`);
  lines.push('');

  lines.push('## Rankings');
  lines.push('');
  if (rows.length === 0) {
    lines.push('_No opportunities to rank._');
    lines.push('');
  } else {
    lines.push('| Rank | Opportunity | Status | Total | Last evaluated |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const r of rows) {
      const e = r.latestEvaluation;
      const total = e.id === '__placeholder__' ? '—' : fmtScore(e.totalScore);
      const evalAt = e.id === '__placeholder__' ? '—' : fmtDate(e.createdAt);
      lines.push(
        `| ${r.rank} | ${escapeMd(r.opportunity.title)} | ${r.opportunity.status} | ${total} | ${evalAt} |`,
      );
    }
    lines.push('');
  }

  // Per-row 9-dim breakdown
  lines.push('## Per-opportunity breakdown');
  lines.push('');
  if (evaluated.length === 0) {
    lines.push('_No evaluated opportunities yet._');
    lines.push('');
  } else {
    for (const r of evaluated) {
      const e: OpportunityEvaluation = r.latestEvaluation;
      lines.push(`### ${r.rank}. ${r.opportunity.title}`);
      lines.push('');
      lines.push(`- Status: **${r.opportunity.status}**`);
      lines.push(`- Total: **${fmtScore(e.totalScore)}** / 100`);
      lines.push(`- Last evaluated: ${fmtDate(e.createdAt)}`);
      lines.push('');
      lines.push('| Dimension | Score | Weight | Contribution |');
      lines.push('| --- | --- | --- | --- |');
      for (const b of breakdownEvaluation(e)) {
        lines.push(
          `| ${b.label} | ${b.score} | ${(b.weight * 100).toFixed(0)}% | ${fmtScore(b.contribution)} |`,
        );
      }
      lines.push('');
      lines.push('**Explanation**');
      lines.push('');
      lines.push(`> ${escapeMd(e.explanation)}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('_Auto-generated ranking. Re-run evaluations from `/opportunities/evaluations` to refresh._');
  return lines.join('\n');
}

export function buildRankingFilename(dateIso: string): string {
  const d = dateIso.slice(0, 10);
  return `opportunity-ranking-${d}.md`;
}
