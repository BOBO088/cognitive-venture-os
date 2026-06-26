/**
 * /geo/content-assets/new — 新建一个 content asset。
 *
 *   ?brandEntityId=<profileId>   预填 brand
 *   ?queryId=<bankId>            预填 targetQueryIds
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ContentAssetForm } from '@/components/geo/ContentAssetForm';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import { listAIQueryBankItems } from '@/lib/services/aiQueryService';
import { createContentAssetAction } from '../actions';

export const metadata = {
  title: 'New content asset · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    brandEntityId?: string;
    queryId?: string;
  }>;
}

export default async function NewContentAssetPage({
  searchParams,
}: PageProps) {
  const { brandEntityId, queryId } = await searchParams;
  const [brandProfiles, bankItems] = await Promise.all([
    listBrandEntityProfiles(),
    listAIQueryBankItems(),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link
          href="/geo/content-assets"
          className="text-sm text-muted hover:text-text"
        >
          &larr; Back to library
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">
          New content asset
        </h1>
        <p className="text-sm text-muted">
          Register a piece of content, link it to a brand and the AI queries
          it answers, add citable evidence, and score it for GEO health.
        </p>
      </div>
      <Card>
        <ContentAssetForm
          mode="create"
          onSubmit={createContentAssetAction}
          brandProfiles={brandProfiles}
          bankItems={bankItems}
          {...(brandEntityId ? { defaultBrandEntityId: brandEntityId } : {})}
          {...(queryId ? { defaultTargetQueryIds: [queryId] } : {})}
        />
      </Card>
    </div>
  );
}
