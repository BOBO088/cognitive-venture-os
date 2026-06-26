/**
 * /learning/prompts — Prompt Version 列表。
 *
 *   ?type=<promptType>   按 type 过滤
 *   ?name=<name>         按 name 过滤
 *
 * 数据流：page (RSC) → promptVersionService.listPromptVersionsFiltered → PromptList
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PromptList } from '@/components/iteration/PromptList';
import {
  listPromptVersionsFiltered,
  computePromptVersionStats,
} from '@/lib/services/promptVersionService';
import { PROMPT_TYPES, PROMPT_TYPE_LABEL } from '@/types';
import type { PromptType } from '@/types';

export const metadata = {
  title: 'Prompts · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ type?: string; name?: string }>;
}

function asPromptType(v: string | undefined): PromptType | undefined {
  if (!v) return undefined;
  if (PROMPT_TYPES.includes(v as PromptType)) return v as PromptType;
  return undefined;
}

export default async function PromptsPage({ searchParams }: PageProps) {
  const { type: typeRaw, name } = await searchParams;
  const type = asPromptType(typeRaw);
  const filter = {
    ...(type ? { type } : {}),
    ...(name ? { name } : {}),
  };
  const [prompts, stats] = await Promise.all([
    listPromptVersionsFiltered(filter),
    computePromptVersionStats(),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">Prompt versions</h1>
          <p className="text-sm text-muted">
            {stats.totalPrompts} prompt
            {stats.totalPrompts === 1 ? '' : 's'} across{' '}
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
            href="/learning/loops"
            className="text-sm text-muted hover:text-text"
          >
            Loops
          </Link>
          <Link
            href="/learning/improvements"
            className="text-sm text-muted hover:text-text"
          >
            Improvements
          </Link>
          <Link href="/learning/prompts/new">
            <Button variant="primary">New prompt version</Button>
          </Link>
        </div>
      </div>

      {type && (
        <div className="text-sm text-muted flex items-center gap-2">
          <span>Filtered by type:</span>
          <span className="text-text">{PROMPT_TYPE_LABEL[type]}</span>
          <Link
            href="/learning/prompts"
            className="text-xs text-accent hover:underline"
          >
            Clear filter →
          </Link>
        </div>
      )}

      <PromptList prompts={prompts} />
    </div>
  );
}
