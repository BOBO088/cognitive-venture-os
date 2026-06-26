/**
 * /geo/queries/[id] — 单条 AI query bank item 详情 + 编辑 + 删除。
 *
 * 展示：query / brand 关联 / linked assets / 4 个 enum badges / metadata。
 * 编辑：复用 AIQueryBankForm（mode="edit"）。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AIQueryBankForm } from '@/components/geo/AIQueryBankForm';
import { getAIQueryBankItem } from '@/lib/services/aiQueryService';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import { listContentAssets } from '@/lib/repos/geo';
import {
  AI_QUERY_BANK_INTENT_LABEL,
  AI_QUERY_BANK_PLATFORM_LABEL,
  AI_QUERY_BANK_PRIORITY_LABEL,
  AI_QUERY_BANK_STATUS_LABEL,
} from '@/types';
import type {
  AIQueryBankPriority,
  AIQueryBankStatus,
} from '@/types';
import {
  updateAIQueryBankItemAction,
  deleteAIQueryBankItemAction,
} from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function priorityTone(
  p: AIQueryBankPriority,
): 'danger' | 'warn' | 'neutral' | 'ok' {
  if (p === 'urgent') return 'danger';
  if (p === 'high') return 'warn';
  if (p === 'medium') return 'neutral';
  return 'ok';
}

function statusTone(s: AIQueryBankStatus): 'ok' | 'warn' | 'neutral' {
  if (s === 'active') return 'ok';
  if (s === 'paused') return 'warn';
  return 'neutral';
}

export default async function AIQueryBankItemDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const item = await getAIQueryBankItem(id);
  if (!item) notFound();

  const [brandProfiles, contentAssets] = await Promise.all([
    listBrandEntityProfiles(),
    listContentAssets(),
  ]);

  const brandMap = new Map(brandProfiles.map((b) => [b.id, b]));
  const assetMap = new Map(contentAssets.map((a) => [a.id, a]));
  const brand = brandMap.get(item.brandEntityId);

  const onDelete = deleteAIQueryBankItemAction.bind(null, item.id);

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <Link
          href="/geo/queries"
          className="text-sm text-muted hover:text-text"
        >
          &larr; Back to query bank
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-text whitespace-pre-wrap">
              {item.query}
            </h1>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <Badge tone="accent">
                {AI_QUERY_BANK_INTENT_LABEL[item.intent]}
              </Badge>
              <Badge tone="neutral">
                {AI_QUERY_BANK_PLATFORM_LABEL[item.platform]}
              </Badge>
              <Badge tone={priorityTone(item.priority)}>
                {AI_QUERY_BANK_PRIORITY_LABEL[item.priority]}
              </Badge>
              <Badge tone={statusTone(item.status)}>
                {AI_QUERY_BANK_STATUS_LABEL[item.status]}
              </Badge>
            </div>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              <span>
                created {fmtDate(item.createdAt)} &middot; updated{' '}
                {fmtDate(item.updatedAt)}
              </span>
              <span className="mx-1">&middot;</span>
              <span className="font-mono">{item.id}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href="/geo/queries"
              className="text-xs text-muted hover:text-text"
            >
              All queries
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Brand profile
          </h2>
          {brand ? (
            <div className="flex flex-col gap-1.5">
              <Link
                href={`/geo/brands/${brand.id}`}
                className="text-sm text-accent hover:underline"
              >
                {brand.name}
              </Link>
              <span className="text-xs text-muted">
                {brand.category} &middot; {brand.targetAudience.slice(0, 80)}
                {brand.targetAudience.length > 80 ? '...' : ''}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-danger">Brand not found</span>
              <span className="text-xs text-muted font-mono">
                {item.brandEntityId}
              </span>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Linked content assets ({item.linkedAssetIds.length})
          </h2>
          {item.linkedAssetIds.length === 0 ? (
            <p className="text-xs text-muted">
              No content assets linked. Use the form below to attach one.
            </p>
          ) : (
            <ul className="text-sm flex flex-col gap-1.5">
              {item.linkedAssetIds.map((aid) => {
                const a = assetMap.get(aid);
                return (
                  <li key={aid} className="flex items-start gap-2">
                    <span className="text-muted">&middot;</span>
                    <div className="min-w-0 flex-1">
                      {a ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-accent hover:underline break-all"
                        >
                          {a.title}
                        </a>
                      ) : (
                        <span className="text-danger text-xs font-mono">
                          {aid} (not found)
                        </span>
                      )}
                      {a && (
                        <span className="text-xs text-muted ml-2">
                          &middot; {a.format}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <AIQueryBankForm
          initial={item}
          mode="edit"
          onSubmit={updateAIQueryBankItemAction}
          onDelete={onDelete}
          brandProfiles={brandProfiles}
          contentAssets={contentAssets}
        />
      </Card>
    </div>
  );
}
