import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EntityList } from '@/components/graph/EntityList';
import { listEntities, listEntitiesFiltered } from '@/lib/services/graphEntityService';
import { ENTITY_KINDS, KIND_LABEL_MAP } from '@/components/graph/EntityTypeBadge';
import type { GraphEntityKind } from '@/types';

export const metadata = {
  title: 'Graph entities · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ type?: string; q?: string }>;
}

export default async function GraphEntitiesPage({ searchParams }: PageProps) {
  const { type, q } = await searchParams;
  const kind = ENTITY_KINDS.includes(type as GraphEntityKind) ? (type as GraphEntityKind) : undefined;
  const tagQuery = q?.trim() ?? '';

  // 当前过滤后列表（用于渲染表格）
  const entities = await listEntitiesFiltered({ kind, tagQuery });

  // 全量列表（用于 type chip 计数，与当前 tag 过滤无关）
  const all = await listEntities();
  const totalByKind: Record<string, number> = {};
  for (const e of all) totalByKind[e.kind] = (totalByKind[e.kind] ?? 0) + 1;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Knowledge graph entities</h1>
          <p className="text-sm text-muted">
            {entities.length} entit{entities.length === 1 ? 'y' : 'ies'}
            {kind && <span> · filtered by type: <span className="text-text">{KIND_LABEL_MAP[kind]}</span></span>}
            {tagQuery && <span> · tag search: <span className="text-text">&quot;{tagQuery}&quot;</span></span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/research" className="text-sm text-muted hover:text-text">Research</Link>
          <Link href="/graph" className="text-sm text-muted hover:text-text">Graph view</Link>
          <Link href="/graph/entities/new">
            <Button variant="primary">New entity</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-muted mr-1">Type:</span>
        <Link
          href="/graph/entities"
          className={`text-xs px-2 py-1 rounded border ${
            !kind ? 'border-accent text-accent' : 'border-border text-muted hover:text-text'
          }`}
        >
          All ({all.length})
        </Link>
        {ENTITY_KINDS.map((k) => {
          const active = kind === k;
          const next = new URLSearchParams();
          if (!active) next.set('type', k);
          if (tagQuery) next.set('q', tagQuery);
          const qs = next.toString();
          const href = qs ? `/graph/entities?${qs}` : '/graph/entities';
          return (
            <Link
              key={k}
              href={href}
              className={`text-xs px-2 py-1 rounded border ${
                active ? 'border-accent text-accent' : 'border-border text-muted hover:text-text'
              }`}
            >
              {KIND_LABEL_MAP[k]} ({totalByKind[k] ?? 0})
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex gap-2">
        {kind && <input type="hidden" name="type" value={kind} />}
        <input
          type="text"
          name="q"
          defaultValue={tagQuery}
          placeholder="按 tag 搜索（不区分大小写，子串匹配）..."
          className="flex-1 rounded-md border border-border bg-panel px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <EntityList rows={entities.map((e) => ({ entity: e }))} />
    </div>
  );
}
