/**
 * /geo/queries — AI Query Bank 列表。
 *
 *   ?brandEntityId=<id>   按关联 brand 过滤
 *   ?intent=<intent>      按 intent 过滤
 *   ?platform=<platform>  按 platform 过滤
 *   ?priority=<priority>  按 priority 过滤
 *   ?status=<status>      按 status 过滤
 *
 * 数据流：page (RSC) → aiQueryService.listAIQueryBankItemsFiltered → AIQueryBankList
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AIQueryBankList } from '@/components/geo/AIQueryBankList';
import {
  listAIQueryBankItemsFiltered,
  computeAIQueryBankStats,
} from '@/lib/services/aiQueryService';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import {
  AI_QUERY_BANK_INTENTS,
  AI_QUERY_BANK_INTENT_LABEL,
  AI_QUERY_BANK_PLATFORMS,
  AI_QUERY_BANK_PLATFORM_LABEL,
  AI_QUERY_BANK_PRIORITIES,
  AI_QUERY_BANK_PRIORITY_LABEL,
  AI_QUERY_BANK_STATUSES,
  AI_QUERY_BANK_STATUS_LABEL,
} from '@/types';
import type {
  AIQueryBankIntent,
  AIQueryBankPlatform,
  AIQueryBankPriority,
  AIQueryBankStatus,
} from '@/types';

export const metadata = {
  title: 'AI query bank · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    brandEntityId?: string;
    intent?: string;
    platform?: string;
    priority?: string;
    status?: string;
  }>;
}

function asEnum<T extends string>(
  v: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!v) return undefined;
  if ((allowed as readonly string[]).includes(v)) return v as T;
  return undefined;
}

export default async function AIQueryBankPage({ searchParams }: PageProps) {
  const {
    brandEntityId,
    intent: intentRaw,
    platform: platformRaw,
    priority: priorityRaw,
    status: statusRaw,
  } = await searchParams;
  const intent = asEnum<AIQueryBankIntent>(intentRaw, AI_QUERY_BANK_INTENTS);
  const platform = asEnum<AIQueryBankPlatform>(
    platformRaw,
    AI_QUERY_BANK_PLATFORMS,
  );
  const priority = asEnum<AIQueryBankPriority>(
    priorityRaw,
    AI_QUERY_BANK_PRIORITIES,
  );
  const status = asEnum<AIQueryBankStatus>(statusRaw, AI_QUERY_BANK_STATUSES);

  const filter = {
    ...(brandEntityId ? { brandEntityId } : {}),
    ...(intent ? { intent } : {}),
    ...(platform ? { platform } : {}),
    ...(priority ? { priority } : {}),
    ...(status ? { status } : {}),
  };
  const [items, stats, brands] = await Promise.all([
    listAIQueryBankItemsFiltered(filter),
    computeAIQueryBankStats(),
    listBrandEntityProfiles(),
  ]);
  const brandNameById = new Map(brands.map((b) => [b.id, b.name]));

  const hasFilter =
    brandEntityId || intent || platform || priority || status;

  return (
    <div className="flex flex-col gap-4 max-w-7xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">AI query bank</h1>
          <p className="text-sm text-muted">
            {stats.totalItems} quer{stats.totalItems === 1 ? 'y' : 'ies'} ·{' '}
            {stats.withAssets} with asset refs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/geo/brands"
            className="text-sm text-muted hover:text-text"
          >
            Brand profiles
          </Link>
          <Link href="/geo/queries/new">
            <Button variant="primary">New query</Button>
          </Link>
        </div>
      </div>

      {hasFilter && (
        <Card>
          <div className="text-sm text-muted flex items-center gap-2 flex-wrap">
            <span>Active filters:</span>
            {brandEntityId && (
              <span className="text-text">
                brand = {brandNameById.get(brandEntityId) ?? brandEntityId}
              </span>
            )}
            {intent && (
              <span className="text-text">
                intent = {AI_QUERY_BANK_INTENT_LABEL[intent]}
              </span>
            )}
            {platform && (
              <span className="text-text">
                platform = {AI_QUERY_BANK_PLATFORM_LABEL[platform]}
              </span>
            )}
            {priority && (
              <span className="text-text">
                priority = {AI_QUERY_BANK_PRIORITY_LABEL[priority]}
              </span>
            )}
            {status && (
              <span className="text-text">
                status = {AI_QUERY_BANK_STATUS_LABEL[status]}
              </span>
            )}
            <Link
              href="/geo/queries"
              className="text-xs text-accent hover:underline"
            >
              Clear filter →
            </Link>
          </div>
        </Card>
      )}

      <AIQueryBankList items={items} brandNameById={brandNameById} />
    </div>
  );
}
