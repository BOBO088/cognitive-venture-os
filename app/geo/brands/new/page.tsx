/**
 * /geo/brands/new — 新建一个 brand entity profile。
 *
 *   ?projectId=<mvpId>    预填 relatedProjectIds
 *   ?entityId=<eid>       预填 relatedEntityIds
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { BrandEntityProfileForm } from '@/components/geo/BrandEntityProfileForm';
import { listMVPProjects } from '@/lib/services/mvpProjectService';
import { listEntities } from '@/lib/services/graphEntityService';
import { createBrandEntityProfileAction } from '../actions';

export const metadata = {
  title: 'New brand profile · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{ projectId?: string; entityId?: string }>;
}

export default async function NewBrandProfilePage({
  searchParams,
}: PageProps) {
  const { projectId, entityId } = await searchParams;
  const [mvpProjects, graphEntities] = await Promise.all([
    listMVPProjects(),
    listEntities(),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <Link
          href="/geo/brands"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to brand profiles
        </Link>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-text">
          New brand entity profile
        </h1>
        <p className="text-sm text-muted">
          Capture the brand's business profile — what it is, who it serves,
          who it competes with, what it claims, and which MVP / graph entities
          it touches.
        </p>
      </div>
      <Card>
        <BrandEntityProfileForm
          mode="create"
          onSubmit={createBrandEntityProfileAction}
          mvpProjects={mvpProjects}
          graphEntities={graphEntities}
          {...(projectId ? { defaultProjectIds: [projectId] } : {})}
          {...(entityId ? { defaultEntityIds: [entityId] } : {})}
        />
      </Card>
    </div>
  );
}
