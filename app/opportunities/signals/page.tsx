import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SignalList } from '@/components/opportunities/SignalList';
import { SIGNAL_CATEGORIES, CATEGORY_LABEL_MAP } from '@/components/opportunities/SignalCategoryBadge';
import { listSignals, listSignalsFiltered } from '@/lib/services/signalService';
import type { SignalCategory } from '@/types';

export const metadata = {
  title: 'Signals · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ category?: string; minConfidence?: string }>;
}

export default async function SignalsPage({ searchParams }: PageProps) {
  const { category, minConfidence } = await searchParams;
  const c: SignalCategory | undefined = SIGNAL_CATEGORIES.includes(
    category as SignalCategory,
  )
    ? (category as SignalCategory)
    : undefined;
  const minC = minConfidence ? Math.max(0, Math.min(100, Number(minConfidence))) : undefined;

  const signals = await listSignalsFiltered({ category: c, minConfidence: minC });

  // chip 计数 = 全量 signals 按 category 分组（与 minConfidence 过滤无关）
  const all = await listSignals();
  const totalByCategory: Record<string, number> = {};
  for (const s of all) {
    totalByCategory[s.category] = (totalByCategory[s.category] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Signals</h1>
          <p className="text-sm text-muted">
            {signals.length} signal{signals.length === 1 ? '' : 's'}
            {c && (
              <span> · filtered by category: <span className="text-text">{CATEGORY_LABEL_MAP[c]}</span></span>
            )}
            {minC !== undefined && (
              <span> · min confidence: <span className="text-text">{minC}</span></span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/graph" className="text-sm text-muted hover:text-text">Graph view</Link>
          <Link href="/opportunities/signals/new">
            <Button variant="primary">New signal</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted mr-1">Category:</span>
            <Link
              href={
                minC !== undefined
                  ? `/opportunities/signals?minConfidence=${minC}`
                  : '/opportunities/signals'
              }
              className={
                'text-xs px-2 py-1 rounded border ' +
                (!c
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-border text-muted hover:text-text')
              }
            >
              All ({all.length})
            </Link>
            {SIGNAL_CATEGORIES.map((cat) => {
              const active = c === cat;
              const qs = new URLSearchParams();
              if (!active) qs.set('category', cat);
              if (minC !== undefined) qs.set('minConfidence', String(minC));
              const href = qs.toString()
                ? `/opportunities/signals?${qs.toString()}`
                : '/opportunities/signals';
              return (
                <Link
                  key={cat}
                  href={href}
                  className={
                    'text-xs px-2 py-1 rounded border ' +
                    (active
                      ? 'border-accent text-accent bg-accent/5'
                      : 'border-border text-muted hover:text-text')
                  }
                >
                  {CATEGORY_LABEL_MAP[cat]} ({totalByCategory[cat] ?? 0})
                </Link>
              );
            })}
          </div>

          <form action="/opportunities/signals" method="get" className="flex items-center gap-2 flex-wrap">
            {c && <input type="hidden" name="category" value={c} />}
            <label htmlFor="minConfidence" className="text-xs text-muted">Min confidence:</label>
            <input
              id="minConfidence"
              name="minConfidence"
              type="number"
              min={0}
              max={100}
              defaultValue={minC ?? ''}
              className="w-20 rounded border border-border bg-bg px-2 py-1 text-sm text-text tabular-nums focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-text"
            >
              Apply
            </button>
            {(minC !== undefined || c) && (
              <Link
                href="/opportunities/signals"
                className="text-xs text-muted hover:text-text underline"
              >
                Clear
              </Link>
            )}
          </form>
        </div>
      </Card>

      <SignalList rows={signals.map((s) => ({ signal: s }))} />
    </div>
  );
}
