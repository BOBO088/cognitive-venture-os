/**
 * /learning/prompts/[id] — 单条 prompt 详情 + 编辑 + 删除 + 创建 v+1。
 *
 * 数据流：page (RSC) → promptVersionService.getPromptVersion → PromptForm
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PromptForm } from '@/components/iteration/PromptForm';
import { getPromptVersion } from '@/lib/services/promptVersionService';
import { listImprovementLogsByTarget } from '@/lib/services/improvementLogService';
import { PROMPT_TYPE_LABEL } from '@/types';
import {
  updatePromptVersionAction,
  deletePromptVersionAction,
} from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { id } = await params;
  const prompt = await getPromptVersion(id);
  if (!prompt) notFound();

  const onDelete = deletePromptVersionAction.bind(null, prompt.id);
  const improvements = await listImprovementLogsByTarget(prompt.id);

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link
          href="/learning/prompts"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to prompts
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">
                {prompt.name} · v{prompt.version}
              </h1>
              <Badge tone="neutral">{PROMPT_TYPE_LABEL[prompt.type]}</Badge>
              {prompt.score !== null && (
                <Badge
                  tone={
                    prompt.score >= 75
                      ? 'ok'
                      : prompt.score >= 50
                        ? 'warn'
                        : 'danger'
                  }
                >
                  Score {prompt.score}
                </Badge>
              )}
            </div>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              <span>created {fmtDate(prompt.createdAt)} · updated {fmtDate(prompt.updatedAt)}</span>
              <span className="mx-1">·</span>
              <span className="font-mono">{prompt.id}</span>
            </div>
            <div className="mt-2 text-sm text-muted">
              <span className="text-xs uppercase tracking-wider text-muted">
                Used for:
              </span>{' '}
              <span className="text-text">{prompt.usedFor}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href={`/learning/prompts/new?name=${encodeURIComponent(prompt.name)}&type=${prompt.type}`}
              className="text-xs text-accent hover:underline"
            >
              Create v{prompt.version + 1} →
            </Link>
            <Link
              href={`/learning/improvements/new?targetType=prompt&targetId=${prompt.id}`}
              className="text-xs text-accent hover:underline"
            >
              Log an improvement for this prompt →
            </Link>
            <Link
              href="/learning/prompts"
              className="text-xs text-muted hover:text-text"
            >
              All prompts
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">Content</h2>
        <pre className="text-xs font-mono text-text whitespace-pre-wrap bg-bg border border-border rounded-md p-3 max-h-96 overflow-auto">
          {prompt.content}
        </pre>
      </Card>

      {improvements.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Linked improvements ({improvements.length})
          </h2>
          <ul className="text-sm text-text flex flex-col gap-1.5">
            {improvements.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/learning/improvements/${i.id}`}
                  className="text-accent hover:underline"
                >
                  {i.problem.slice(0, 100)}
                  {i.problem.length > 100 ? '…' : ''}
                </Link>
                {i.result.trim().length > 0 && (
                  <Badge tone="ok" className="ml-2">
                    applied
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <PromptForm
          initial={prompt}
          mode="edit"
          onSubmit={updatePromptVersionAction}
          onDelete={onDelete}
        />
      </Card>
    </div>
  );
}
