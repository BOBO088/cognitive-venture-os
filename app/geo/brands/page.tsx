/**
 * /geo/brands — BrandEntityProfile 列表。
 *
 *   ?category=<category>   按 category 过滤
 *   ?projectId=<mvpId>    按关联 MVP Project 过滤
 *   ?entityId=<eid>       按关联 Graph Entity 过滤
 *
 * 数据流：page (RSC) → geoBrandService.listBrandEntityProfilesFiltered → BrandEntityProfileList
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BrandEntityProfileList } from '@/components/geo/BrandEntityProfileList';
import {
  listBrandEntityProfilesFiltered,
  computeBrandEntityProfileStats,
} from '@/lib/services/geoBrandService';
import { BRAND_ENTITY_CATEGORIES, BRAND_ENTITY_CATEGORY_LABEL } from '@/types';
import type { BrandEntityCategory } from '@/types';

export const metadata = {
  title: 'Brand profiles · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    category?: string;
    projectId?: string;
    entityId?: string;
  }>;
}

function asCategory(v: string | undefined): BrandEntityCategory | undefined {
  if (!v) return undefined;
  if (BRAND_ENTITY_CATEGORIES.includes(v as BrandEntityCategory)) {
    return v as BrandEntityCategory;
  }
  return undefined;
}

export default async function BrandProfilesPage({ searchParams }: PageProps) {
  const { category: catRaw, projectId, entityId } = await searchParams;
  const category = asCategory(catRaw);
  const filter = {
    ...(category ? { category } : {}),
    ...(projectId ? { projectId } : {}),
    ...(entityId ? { entityId } : {}),
  };
  const [profiles, stats] = await Promise.all([
    listBrandEntityProfilesFiltered(filter),
    computeBrandEntityProfileStats(),
  ]);

  const hasFilter = category || projectId || entityId;

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-text">
            Brand entity profiles
          </h1>
          <p className="text-sm text-muted">
            {stats.totalProfiles} profile
            {stats.totalProfiles === 1 ? '' : 's'} ·{' '}
            {stats.withProjects} with MVP refs ·{' '}
            {stats.withEntities} with graph entity refs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/geo"
            className="text-sm text-muted hover:text-text"
          >
            GEO engine
          </Link>
          <Link href="/geo/brands/new">
            <Button variant="primary">New brand profile</Button>
          </Link>
        </div>
      </div>

      {hasFilter && (
        <Card>
          <div className="text-sm text-muted flex items-center gap-2 flex-wrap">
            <span>Active filters:</span>
            {category && (
              <span className="text-text">
                category = {BRAND_ENTITY_CATEGORY_LABEL[category]}
              </span>
            )}
            {projectId && (
              <span className="text-text font-mono">project = {projectId}</span>
            )}
            {entityId && (
              <span className="text-text font-mono">entity = {entityId}</span>
            )}
            <Link
              href="/geo/brands"
              className="text-xs text-accent hover:underline"
            >
              Clear filter →
            </Link>
          </div>
        </Card>
      )}

      <BrandEntityProfileList profiles={profiles} />
    </div>
  );
}
