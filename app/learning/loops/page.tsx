/**
 * /learning/loops — Loop Version 列表。
 *
 *   ?name=<name>   按 name 过滤
 *
 * 数据流：page (RSC) → loopVersionService.listLoopVersionsFiltered → LoopList
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LoopList } from '@/components/iteration/LoopList';
import {
  listLoopVersionsFiltered,
  computeLoopVersionStats,
} from '@/lib/services/loopVersionService';

export const metadata = {
  title: 'Loops · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ name?: string }>;
}

export default async function LoopsPage({ searchParams }: PageProps) {
  const { name } = await searchParams;
  const filter = name ? { name } : {};
  const [loops, stats] = await Promise.all([
    listLoopVersionsFiltered(filter),
    computeLoopVersionStats(),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Loop versions</h1>
          <p className="text-sm text-muted">
            {stats.totalLoops} loop
            {stats.totalLoops === 1 ? '' : 's'} across{' '}
            {stats.distinctNames} name
            {stats.distinctNames === 1 ? '' : 's'}
            {stats.averageScore !== null && (
              <>
                {' · '}
                <span className="text-accent">
                  avg score {stats.averageScore}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/learning/prompts"
            className="text-sm text-muted hover:text-text"
          >
            Prompts
          </Link>
          <Link
            href="/learning/improvements"
            className="text-sm text-muted hover:text-text"
          >
            Improvements
          </Link>
          <Link href="/learning/loops/new">
            <Button variant="primary">New loop version</Button>
          </Link>
        </div>
      </div>

      {name && (
        <div className="text-sm text-muted flex items-center gap-2">
          <span>Filtered by name:</span>
          <span className="text-text">{name}</span>
          <Link
            href="/learning/loops"
            className="text-xs text-accent hover:underline"
          >
            Clear filter →
          </Link>
        </div>
      )}

      <LoopList loops={loops} />
    </div>
  );
}
