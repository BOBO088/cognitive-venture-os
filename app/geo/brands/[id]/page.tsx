/**
 * /geo/brands/[id] — 单条 brand entity profile 详情 + 编辑 + 删除。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BrandEntityProfileForm } from '@/components/geo/BrandEntityProfileForm';
import { getBrandEntityProfile } from '@/lib/services/geoBrandService';
import { listMVPProjects } from '@/lib/services/mvpProjectService';
import { listEntities } from '@/lib/services/graphEntityService';
import { BRAND_ENTITY_CATEGORY_LABEL } from '@/types';
import {
  updateBrandEntityProfileAction,
  deleteBrandEntityProfileAction,
} from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export default async function BrandProfileDetailPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getBrandEntityProfile(id);
  if (!profile) notFound();

  const [mvpProjects, graphEntities] = await Promise.all([
    listMVPProjects(),
    listEntities(),
  ]);

  const mvpMap = new Map(mvpProjects.map((m) => [m.id, m]));
  const entityMap = new Map(graphEntities.map((e) => [e.id, e]));

  const onDelete = deleteBrandEntityProfileAction.bind(null, profile.id);

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <Link
          href="/geo/brands"
          className="text-sm text-muted hover:text-text"
        >
          ← Back to brand profiles
        </Link>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-text">
                {profile.name}
              </h1>
              <Badge tone="accent">
                {BRAND_ENTITY_CATEGORY_LABEL[profile.category]}
              </Badge>
            </div>
            <div className="mt-1.5 text-sm text-muted flex items-center gap-2 flex-wrap">
              <span>
                created {fmtDate(profile.createdAt)} · updated{' '}
                {fmtDate(profile.updatedAt)}
              </span>
              <span className="mx-1">·</span>
              <span className="font-mono">{profile.id}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href={`/geo/brands?category=${profile.category}`}
              className="text-xs text-accent hover:underline"
            >
              Filter by {BRAND_ENTITY_CATEGORY_LABEL[profile.category]} →
            </Link>
            <Link
              href="/geo/brands"
              className="text-xs text-muted hover:text-text"
            >
              All profiles
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">Description</h2>
        <p className="text-sm text-text whitespace-pre-wrap">
          {profile.description}
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-2">
          Target audience
        </h2>
        <p className="text-sm text-text whitespace-pre-wrap">
          {profile.targetAudience}
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Competitors ({profile.competitors.length})
          </h2>
          {profile.competitors.length === 0 ? (
            <p className="text-xs text-muted">No competitors listed.</p>
          ) : (
            <ul className="text-sm text-text flex flex-col gap-1">
              {profile.competitors.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-muted">·</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Official links ({profile.officialLinks.length})
          </h2>
          {profile.officialLinks.length === 0 ? (
            <p className="text-xs text-muted">No official links.</p>
          ) : (
            <ul className="text-sm flex flex-col gap-1">
              {profile.officialLinks.map((u, i) => (
                <li key={i}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent hover:underline break-all"
                  >
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Key claims ({profile.keyClaims.length})
          </h2>
          {profile.keyClaims.length === 0 ? (
            <p className="text-xs text-muted">No claims yet.</p>
          ) : (
            <ul className="text-sm text-text flex flex-col gap-1.5">
              {profile.keyClaims.map((c, i) => (
                <li key={i}>
                  <span className="text-accent">→</span> {c}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Proof points ({profile.proofPoints.length})
          </h2>
          {profile.proofPoints.length === 0 ? (
            <p className="text-xs text-muted">No proof points yet.</p>
          ) : (
            <ul className="text-sm text-text flex flex-col gap-1.5">
              {profile.proofPoints.map((p, i) => (
                <li key={i}>
                  <span className="text-ok">✓</span> {p}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            MVP Projects ({profile.relatedProjectIds.length})
          </h2>
          {profile.relatedProjectIds.length === 0 ? (
            <p className="text-xs text-muted">No MVP projects linked.</p>
          ) : (
            <ul className="text-sm flex flex-col gap-1">
              {profile.relatedProjectIds.map((pid) => {
                const mvp = mvpMap.get(pid);
                return (
                  <li key={pid}>
                    <Link
                      href={`/mvp/${pid}`}
                      className="text-accent hover:underline"
                    >
                      {mvp?.name ?? pid}
                    </Link>
                    {mvp && (
                      <span className="text-xs text-muted ml-2">
                        · {mvp.stage}
                      </span>
                    )}
                    {!mvp && (
                      <span className="text-xs text-danger ml-2">
                        · not found
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-muted mb-2">
            Graph entities ({profile.relatedEntityIds.length})
          </h2>
          {profile.relatedEntityIds.length === 0 ? (
            <p className="text-xs text-muted">No graph entities linked.</p>
          ) : (
            <ul className="text-sm flex flex-col gap-1">
              {profile.relatedEntityIds.map((eid) => {
                const ent = entityMap.get(eid);
                return (
                  <li key={eid}>
                    <Link
                      href={`/graph/entities/${eid}`}
                      className="text-accent hover:underline"
                    >
                      {ent?.name ?? eid}
                    </Link>
                    {ent && (
                      <span className="text-xs text-muted ml-2">
                        · {ent.kind}
                      </span>
                    )}
                    {!ent && (
                      <span className="text-xs text-danger ml-2">
                        · not found
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">Edit</h2>
        <BrandEntityProfileForm
          initial={profile}
          mode="edit"
          onSubmit={updateBrandEntityProfileAction}
          onDelete={onDelete}
          mvpProjects={mvpProjects}
          graphEntities={graphEntities}
        />
      </Card>
    </div>
  );
}
