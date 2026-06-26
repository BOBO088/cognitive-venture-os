/**
 * /geo/citation-monitor — AI 引用监控列表 + 趋势图。
 *
 *   ?queryId=<id>     按 query 过滤
 *   ?platform=<p>     按 platform 过滤
 *   ?brandEntityId=<id>  按 brand 过滤（间接通过 query.brandEntityId）
 *
 * 数据流：page (RSC) → citationMonitorService + aiQueryService + geoBrandService
 *                   → CitationCheckList / CitationCheckForm / CitationTrendChart
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { CitationCheckList } from '@/components/geo/CitationCheckList';
import { CitationCheckForm } from '@/components/geo/CitationCheckForm';
import { RecordCitationCheckForm } from '@/components/geo/RecordCitationCheckForm';
import { CitationTrendChart } from '@/components/geo/CitationTrendChart';
import {
  listAICitationChecks,
  computeCitationStats,
  computeTrend,
} from '@/lib/services/citationMonitorService';
import { listAIQueryBankItems } from '@/lib/services/aiQueryService';
import { listBrandEntityProfiles } from '@/lib/services/geoBrandService';
import {
  CITATION_PLATFORMS,
  CITATION_PLATFORM_LABEL,
} from '@/types';
import type { CitationPlatform } from '@/types';
import {
  runCitationCheckAction,
  recordCitationCheckAction,
} from './actions';

export const metadata = {
  title: 'AI citation monitor · Cognitive Venture OS',
};

interface PageProps {
  searchParams: Promise<{
    queryId?: string;
    platform?: string;
    brandEntityId?: string;
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

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function CitationMonitorPage({ searchParams }: PageProps) {
  const { queryId: queryIdRaw, platform: platformRaw, brandEntityId: brandEntityIdRaw } =
    await searchParams;
  const platform = asEnum<CitationPlatform>(platformRaw, CITATION_PLATFORMS);

  const [allChecks, bankItems, brandProfiles] = await Promise.all([
    listAICitationChecks(),
    listAIQueryBankItems(),
    listBrandEntityProfiles(),
  ]);

  // 过滤
  const queryIdSet = new Set(
    brandEntityIdRaw
      ? bankItems
          .filter((q) => q.brandEntityId === brandEntityIdRaw)
          .map((q) => q.id)
      : [],
  );
  const filtered = allChecks.filter((c) => {
    if (queryIdRaw && c.queryId !== queryIdRaw) return false;
    if (platform && c.platform !== platform) return false;
    if (brandEntityIdRaw && !queryIdSet.has(c.queryId)) return false;
    return true;
  });

  // 拉 brand 官方链接做 citation rate
  const brandMap = new Map(brandProfiles.map((b) => [b.id, b]));
  const targetUrls = brandEntityIdRaw
    ? brandMap.get(brandEntityIdRaw)?.officialLinks ?? []
    : [];
  const [stats, trend] = await Promise.all([
    computeCitationStats(targetUrls),
    computeTrend({ platform: platform ?? undefined, targetBrandUrls: targetUrls }),
  ]);

  // query -> brand 映射
  const bankMap = new Map(bankItems.map((q) => [q.id, q]));

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-text">
          AI Citation Monitor
        </h1>
        <p className="text-sm text-muted">
          Track whether target brand / product / URL is mentioned or cited
          across 5 AI platforms. Append-only check history.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Total checks"
          value={stats.totalChecks}
          hint={
            platform
              ? `${CITATION_PLATFORM_LABEL[platform]} only`
              : 'across all platforms'
          }
        />
        <Stat
          label="Mention rate"
          value={fmtPct(stats.mentionRate)}
          hint="target brand named in answer"
        />
        <Stat
          label="Citation rate"
          value={fmtPct(stats.citationRate)}
          hint={
            targetUrls.length > 0
              ? 'citedUrl = target URL'
              : 'no brand filter'
          }
        />
        <Stat
          label="Average GEO score"
          value={stats.averageGeoScore.toFixed(1)}
          hint="0-100 from connector"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-3">
            Run a new check (mock auto)
          </h2>
          <p className="text-[10px] text-muted mb-3">
            Quick path: pick query + platform + time, results come from the
            mock connector (deterministic placeholder).
          </p>
          <CitationCheckForm
            bankItems={bankItems}
            onSubmit={runCitationCheckAction}
            defaultQueryId={queryIdRaw}
            defaultPlatform={platform ?? 'chatgpt'}
          />
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-muted mb-3">
            Record check manually
          </h2>
          <p className="text-[10px] text-muted mb-3">
            For real ChatGPT / Perplexity / Gemini answers before Browser MCP
            ships. All result fields go straight into the data layer.
          </p>
          <RecordCitationCheckForm
            bankItems={bankItems}
            onSubmit={recordCitationCheckAction}
            defaultQueryId={queryIdRaw}
            defaultPlatform={platform ?? 'chatgpt'}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-medium text-muted mb-3">
            By platform
          </h2>
          <div className="flex flex-col gap-1.5">
            {CITATION_PLATFORMS.map((p) => {
              const count = stats.byPlatform[p] ?? 0;
              return (
                <div
                  key={p}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <Link
                    href={`/geo/citation-monitor?platform=${p}`}
                    className={`hover:underline ${
                      platform === p ? 'text-accent font-medium' : 'text-text'
                    }`}
                  >
                    {CITATION_PLATFORM_LABEL[p]}
                  </Link>
                  <Badge tone={count > 0 ? 'neutral' : 'neutral'}>
                    {count}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Trend (mention · citation · score)
        </h2>
        <CitationTrendChart points={trend} />
        <p className="mt-2 text-[10px] text-muted">
          Daily aggregates from the last 14 days. Solid lines = rates /
          scores. y-axis 0-100.
        </p>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h2 className="text-sm font-medium text-muted">
            Recent checks ({filtered.length})
          </h2>
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted">
            {(queryIdRaw || platform || brandEntityIdRaw) && (
              <>
                <span>filtered by:</span>
                {queryIdRaw && (
                  <Badge tone="accent">
                    query: {bankMap.get(queryIdRaw)?.query ?? queryIdRaw}
                  </Badge>
                )}
                {platform && (
                  <Badge tone="accent">
                    platform: {CITATION_PLATFORM_LABEL[platform]}
                  </Badge>
                )}
                {brandEntityIdRaw && (
                  <Badge tone="accent">
                    brand:{' '}
                    {brandMap.get(brandEntityIdRaw)?.name ?? brandEntityIdRaw}
                  </Badge>
                )}
                <Link
                  href="/geo/citation-monitor"
                  className="text-accent hover:underline ml-2"
                >
                  clear
                </Link>
              </>
            )}
            <Link
              href="/geo/reports"
              className="text-accent hover:underline"
            >
              Weekly report &rarr;
            </Link>
            <Link
              href="/geo/metrics"
              className="ml-auto text-accent hover:underline"
            >
              GEO metrics &rarr;
            </Link>
          </div>
        </div>
        <CitationCheckList
          checks={filtered}
          limit={20}
          emptyText="No checks match the current filter."
        />
      </Card>
    </div>
  );
}
