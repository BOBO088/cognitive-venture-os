/**
 * buildGraphMarkdown — 把当前 graph 视图序列化为 markdown。
 *
 * 纯函数；无 React / 无 DOM；可在 server 和 client 共用。
 * 输入由 app/graph/page.tsx 一次性计算好（避免 client 重复过滤逻辑）。
 */

import type { GraphEntity, GraphRelation, GraphEntityKind, GraphRelationKind } from '@/types';
import { ENTITY_KINDS, KIND_LABEL_MAP as ENTITY_LABEL } from '@/components/graph/EntityTypeBadge';
import { RELATION_KINDS, KIND_LABEL_MAP as RELATION_LABEL } from '@/components/graph/RelationTypeBadge';

export interface GraphMarkdownInput {
  generatedAt: string;
  filters: {
    entityType?: GraphEntityKind;
    relationType?: GraphRelationKind;
  };
  selectedEntityId?: string;
  entities: GraphEntity[];
  relations: GraphRelation[];
  /** 当 selectedEntityId 存在时，附带其 outgoing/incoming 分组（用于 markdown 章节）。 */
  groupedForSelected?: {
    outgoing: GraphRelation[];
    incoming: GraphRelation[];
  };
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function buildEntityRow(e: GraphEntity): string {
  const desc = e.description ? ` — ${escapeMd(e.description)}` : '';
  const tags = e.tags.length > 0 ? ` \`${e.tags.slice(0, 5).join('`,`')}\`` : '';
  return `- **${e.name}** (${ENTITY_LABEL[e.kind]})${desc}${tags}`;
}

function buildRelationRow(
  r: GraphRelation,
  entities: Map<string, GraphEntity>,
): string {
  const src = entities.get(r.sourceEntityId)?.name ?? `(${r.sourceEntityId})`;
  const tgt = entities.get(r.targetEntityId)?.name ?? `(${r.targetEntityId})`;
  const ev = r.evidence ? ` — ${escapeMd(r.evidence)}` : '';
  return `| ${escapeMd(src)} | ${RELATION_LABEL[r.relationType]} | ${escapeMd(tgt)} | ${r.strength} |${ev} |`;
}

export function buildGraphMarkdown(input: GraphMarkdownInput): string {
  const { generatedAt, filters, selectedEntityId, entities, relations, groupedForSelected } = input;
  const entityById = new Map(entities.map((e) => [e.id, e]));

  const filterParts: string[] = [];
  if (filters.entityType) filterParts.push(`entity type = ${ENTITY_LABEL[filters.entityType]}`);
  if (filters.relationType) filterParts.push(`relation type = ${RELATION_LABEL[filters.relationType]}`);
  const filterLine = filterParts.length > 0 ? filterParts.join('; ') : 'none';

  const lines: string[] = [];
  lines.push('# Knowledge Graph Export');
  lines.push('');
  lines.push(`- Generated at: \`${generatedAt}\``);
  lines.push(`- Filters: ${filterLine}`);
  if (selectedEntityId) {
    const e = entityById.get(selectedEntityId);
    lines.push(`- Selected entity: **${e?.name ?? selectedEntityId}** (\`${selectedEntityId}\`)`);
  }
  lines.push(`- Total entities: ${entities.length}`);
  lines.push(`- Total relations: ${relations.length}`);
  lines.push('');

  // Selected entity 详情
  if (selectedEntityId && groupedForSelected) {
    const selected = entityById.get(selectedEntityId);
    if (selected) {
      lines.push('## Selected entity');
      lines.push('');
      lines.push(`### ${selected.name}`);
      lines.push('');
      lines.push(`- Type: ${ENTITY_LABEL[selected.kind]}`);
      if (selected.description) lines.push(`- Description: ${selected.description}`);
      if (selected.aliases.length > 0) lines.push(`- Aliases: ${selected.aliases.join(', ')}`);
      if (selected.tags.length > 0) lines.push(`- Tags: \`${selected.tags.join('`,`')}\``);
      lines.push(`- Updated: ${fmtDate(selected.updatedAt)}`);
      lines.push('');

      if (groupedForSelected.outgoing.length > 0) {
        lines.push(`### Outgoing relations (${groupedForSelected.outgoing.length})`);
        lines.push('');
        lines.push('| Source | Relation | Target | Strength | Evidence |');
        lines.push('| --- | --- | --- | --- | --- |');
        for (const r of groupedForSelected.outgoing) {
          lines.push(buildRelationRow(r, entityById));
        }
        lines.push('');
      }

      if (groupedForSelected.incoming.length > 0) {
        lines.push(`### Incoming relations (${groupedForSelected.incoming.length})`);
        lines.push('');
        lines.push('| Source | Relation | Target | Strength | Evidence |');
        lines.push('| --- | --- | --- | --- | --- |');
        for (const r of groupedForSelected.incoming) {
          lines.push(buildRelationRow(r, entityById));
        }
        lines.push('');
      }
    }
  }

  // 全量 entity 列表（按 type 分组）
  if (entities.length > 0) {
    lines.push(`## Entities (${entities.length})`);
    lines.push('');
    for (const k of ENTITY_KINDS) {
      const subset = entities.filter((e) => e.kind === k);
      if (subset.length === 0) continue;
      lines.push(`### ${ENTITY_LABEL[k]} (${subset.length})`);
      lines.push('');
      for (const e of subset) {
        lines.push(buildEntityRow(e));
      }
      lines.push('');
    }
  }

  // 全量 relation 列表（按 type 分组）
  if (relations.length > 0) {
    lines.push(`## Relations (${relations.length})`);
    lines.push('');
    for (const k of RELATION_KINDS) {
      const subset = relations.filter((r) => r.relationType === k);
      if (subset.length === 0) continue;
      lines.push(`### ${RELATION_LABEL[k]} (${subset.length})`);
      lines.push('');
      lines.push('| Source | Relation | Target | Strength | Evidence |');
      lines.push('| --- | --- | --- | --- | --- |');
      for (const r of subset) {
        lines.push(buildRelationRow(r, entityById));
      }
      lines.push('');
    }
  }

  if (entities.length === 0 && relations.length === 0) {
    lines.push('_No entities or relations match the current filters._');
    lines.push('');
  }

  return lines.join('\n');
}
