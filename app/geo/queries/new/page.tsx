/**
 * /geo/queries/new — 新建一条 AI query bank item。
 *
 *   ?brandEntityId=<profileId>   预填 brand
 *   ?assetId=<assetId>           预填 linkedAssetIds
 *
 * 页面同时提供"批量生成"入口（基于 mock LLMProvider 一次性落 N 条）。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { AIQueryBankForm } from '@/components/geo/AIQueryBankForm';
import { BatchGenerateForm } from './BatchGenerateForm';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import { listContentAssets } from '@/lib/repos/geo';
import { createAIQueryBankItemAction, generateAIQueryBankForBrandAction } from '../actions';

export const metadata = {
  title: 'New AI query · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    brandEntityId?: string;
    assetId?: string;
  }>;
}

export default async function NewAIQueryPage({
  searchParams,
}: PageProps) {
  const { brandEntityId, assetId } = await searchParams;
  const [brandProfiles, contentAssets] = await Promise.all([
    listBrandEntityProfiles(),
    listContentAssets(),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Link
          href="/geo/queries"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to query bank
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-semibold text-text">New AI query</h1>
        <p className="text-sm text-muted">
          Add one question manually, or generate a batch via mock LLMProvider.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Single query
        </h2>
        <AIQueryBankForm
          mode="create"
          onSubmit={createAIQueryBankItemAction}
          brandProfiles={brandProfiles}
          contentAssets={contentAssets}
          {...(brandEntityId ? { defaultBrandEntityId: brandEntityId } : {})}
          {...(assetId ? { defaultLinkedAssetIds: [assetId] } : {})}
        />
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Batch generate (mock LLM)
        </h2>
        <BatchGenerateForm
          brandProfiles={brandProfiles}
          action={generateAIQueryBankForBrandAction}
          defaultBrandEntityId={brandEntityId}
        />
      </Card>
    </div>
  );
}
