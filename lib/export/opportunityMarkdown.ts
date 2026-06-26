/**
 * buildOpportunityReport — 把单个 Opportunity 序列化为可分享的 markdown 报告。
 *
 * 纯函数；server / client 共用。Input 由 page 端装配好（含 resolved
 * signal / card / entity name lookup），client 仅做序列化 + 下载。
 */

import type {
  Opportunity,
  Signal,
  ResearchCard,
  GraphEntity,
} from '@/types';

export interface OpportunityReportInput {
  generatedAt: string;
  opportunity: Opportunity;
  signals: Signal[];
  cards: ResearchCard[];
  entities: GraphEntity[];
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function buildOpportunityReport(input: OpportunityReportInput): string {
  const { generatedAt, opportunity: opp, signals, cards, entities } = input;

  const lines: string[] = [];
  lines.push(`# Opportunity report — ${opp.title}`);
  lines.push('');
  lines.push(`- Generated at: \`${generatedAt}\``);
  lines.push(`- Status: **${opp.status}**`);
  lines.push(`- Created: ${fmtDate(opp.createdAt)}`);
  lines.push(`- Updated: ${fmtDate(opp.updatedAt)}`);
  lines.push(`- ID: \`${opp.id}\``);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Target user:** ${opp.targetUser}`);
  lines.push(`- **Pain point:** ${opp.painPoint}`);
  lines.push('');
  lines.push('### Description');
  lines.push('');
  lines.push(opp.description);
  lines.push('');
  lines.push('### Solution idea');
  lines.push('');
  lines.push(opp.solutionIdea);
  lines.push('');

  // Related signals
  lines.push(`## Related signals (${signals.length})`);
  lines.push('');
  if (signals.length === 0) {
    lines.push('_No signals linked._');
    lines.push('');
  } else {
    lines.push('| Title | Category | Confidence | Updated |');
    lines.push('| --- | --- | --- | --- |');
    for (const s of signals) {
      lines.push(
        `| ${escapeMd(s.title)} | ${s.category} | ${s.confidence} | ${fmtDate(s.updatedAt)} |`,
      );
    }
    lines.push('');
  }

  // Related research cards
  lines.push(`## Supporting research cards (${cards.length})`);
  lines.push('');
  if (cards.length === 0) {
    lines.push('_No research cards linked._');
    lines.push('');
  } else {
    lines.push('| Title | Topic | Score | Updated |');
    lines.push('| --- | --- | --- | --- |');
    for (const c of cards) {
      lines.push(
        `| ${escapeMd(c.title)} | \`${c.topicId}\` | ${c.score} | ${fmtDate(c.updatedAt)} |`,
      );
    }
    lines.push('');
  }

  // Related entities
  lines.push(`## Related entities (${entities.length})`);
  lines.push('');
  if (entities.length === 0) {
    lines.push('_No entities linked._');
    lines.push('');
  } else {
    for (const e of entities) {
      const desc = e.description ? ` — ${escapeMd(e.description)}` : '';
      lines.push(`- **${e.name}** (${e.kind})${desc}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`_Auto-generated report. Edit source fields in /opportunities/${opp.id}._`);

  return lines.join('\n');
}
