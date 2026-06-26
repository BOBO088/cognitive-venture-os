/**
 * /geo/content-assets — Content Asset Library 列表。
 *
 *   ?brandEntityId=<id>   按 brand 过滤
 *   ?type=<type>          按 type 过滤
 *   ?minScore=<0-100>     按最低 score 过滤
 *
 * 数据流：page (RSC) → contentAssetService.listContentAssetsFiltered → ContentAssetList
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ContentAssetList } from '@/components/geo/ContentAssetList';
import {
  listContentAssetsFiltered,
  computeContentAssetStats,
} from '@/lib/services/contentAssetService';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import {
  CONTENT_ASSET_TYPES,
  CONTENT_ASSET_TYPE_LABEL,
} from '@/types';
import type { ContentAssetType } from '@/types';

export const metadata = {
  title: 'Content asset library · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    brandEntityId?: string;
    type?: string;
    minScore?: string;
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

function asInt(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return undefined;
  if (n < 0 || n > 100) return undefined;
  return n;
}

export default async function ContentAssetsPage({
  searchParams,
}: PageProps) {
  const { brandEntityId, type: typeRaw, minScore: minScoreRaw } =
    await searchParams;
  const type = asEnum<ContentAssetType>(typeRaw, CONTENT_ASSET_TYPES);
  const minScore = asInt(minScoreRaw);

  const filter = {
    ...(brandEntityId ? { brandEntityId } : {}),
    ...(type ? { type } : {}),
    ...(typeof minScore === 'number' ? { minGeoScore: minScore } : {}),
  };
  const [items, stats, brands] = await Promise.all([
    listContentAssetsFiltered(filter),
    computeContentAssetStats(),
    listBrandEntityProfiles(),
  ]);
  const brandNameById = new Map(brands.map((b) => [b.id, b.name]));

  const hasFilter = brandEntityId || type || typeof minScore === 'number';

  return (
    <div className="flex flex-col gap-4 max-w-7xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">
            Content asset library
          </h1>
          <p className="text-sm text-muted">
            {stats.totalAssets} asset{stats.totalAssets === 1 ? '' : 's'}
            {' '}&middot; {stats.withTargetQueries} with target queries
            {' '}&middot; {stats.withEvidence} with evidence
            {' '}&middot; avg GEO score {stats.averageGeoScore}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/geo/brands" className="text-sm text-muted hover:text-text">
            Brand profiles
          </Link>
          <Link href="/geo/queries" className="text-sm text-muted hover:text-text">
            Query bank
          </Link>
          <Link href="/geo/content-assets/new">
            <Button variant="primary">New asset</Button>
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
            {type && (
              <span className="text-text">
                type = {CONTENT_ASSET_TYPE_LABEL[type]}
              </span>
            )}
            {typeof minScore === 'number' && (
              <span className="text-text">min score = {minScore}</span>
            )}
            <Link
              href="/geo/content-assets"
              className="text-xs text-accent hover:underline"
            >
              Clear filter &rarr;
            </Link>
          </div>
        </Card>
      )}

      <ContentAssetList items={items} brandNameById={brandNameById} />
    </div>
  );
}
