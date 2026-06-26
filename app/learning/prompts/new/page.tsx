/**
 * /learning/prompts/new — 新建一条 prompt version。
 *
 *   ?name=<name>&type=<promptType>   预填 (name, type) 去做"v+1" 迭代。
 *
 * 数据流：page (RSC) → PromptForm
 *       提交 → createPromptVersionAction → 跳到详情
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { PromptForm } from '@/components/iteration/PromptForm';
import { createPromptVersionAction } from '../actions';
import { PROMPT_TYPES } from '@/types';
import type { PromptType } from '@/types';

export const metadata = {
  title: 'New prompt · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ name?: string; type?: string }>;
}

function asPromptType(v: string | undefined): PromptType | undefined {
  if (!v) return undefined;
  if (PROMPT_TYPES.includes(v as PromptType)) return v as PromptType;
  return undefined;
}

export default async function NewPromptPage({ searchParams }: PageProps) {
  const { name, type: typeRaw } = await searchParams;
  const type = asPromptType(typeRaw);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link
          href="/learning/prompts"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to prompts
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">
          {name ? 'New version of an existing prompt' : 'New prompt version'}
        </h1>
        <p className="text-sm text-muted">
          {name
            ? 'Service auto-increments version on the same (name, type) pair.'
            : 'Give the prompt a name + type. The first version is v1; later edits to the same (name, type) become v2, v3, ...'}
        </p>
      </div>
      <Card>
        <PromptForm
          mode="create"
          onSubmit={createPromptVersionAction}
          {...(name ? { defaultName: name } : {})}
          {...(type ? { defaultType: type } : {})}
        />
      </Card>
    </div>
  );
}
