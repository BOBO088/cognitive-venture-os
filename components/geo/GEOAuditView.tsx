/**
 * GEOAuditView — 单条 GEOAudit 的展示组件 (RSC)。
 *
 * 展示：
 *   - 头部：整体 geoScore + 调性 + 元数据（id / assetId / inputType / model / 时间）
 *   - 7 维评分（带权重提示 + 调性 badge + 进度条）
 *   - 9 项建议（target queries / core entities / definable terms /
 *     evidence checklist / comparison table / FAQ / structured suggestions /
 *     optimized outline）
 *   - 评分解释
 *
 * 数据流：page (RSC) 直接传 audit + asset + bank 列表进来。
 */
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  GEO_AUDIT_DIMENSIONS,
  GEO_AUDIT_DIMENSION_LABEL,
  GEO_AUDIT_WEIGHTS,
  OPTIMIZER_INPUT_TYPE_LABEL,
  CONTENT_ASSET_TYPE_LABEL,
} from '@/types';
import type {
  GEOAudit,
  GEOAuditDimension,
  OptimizerInputType,
  ContentAsset,
  AIQueryBankItem,
} from '@/types';

interface Props {
  audit: GEOAudit;
  asset: Pick<ContentAsset, 'id' | 'title' | 'url' | 'type'>;
  bankItems: AIQueryBankItem[];
}

function scoreTone(score: number): 'ok' | 'warn' | 'danger' | 'neutral' {
  if (score >= 75) return 'ok';
  if (score >= 50) return 'warn';
  if (score > 0) return 'danger';
  return 'neutral';
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtPct(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

function dimValue(audit: GEOAudit, dim: GEOAuditDimension): number {
  switch (dim) {
    case 'clarity': return audit.score.clarity;
    case 'entity_consistency': return audit.score.entityConsistency;
    case 'evidence_density': return audit.score.evidenceDensity;
    case 'citation_worthiness': return audit.score.citationWorthiness;
    case 'freshness': return audit.score.freshness;
    case 'topical_authority': return audit.score.topicalAuthority;
    case 'query_alignment': return audit.score.queryAlignment;
  }
}

function ProgressBar({ value, tone }: { value: number; tone: 'ok' | 'warn' | 'danger' | 'neutral' }) {
  const toneBar: Record<typeof tone, string> = {
    ok: 'bg-ok',
    warn: 'bg-warn',
    danger: 'bg-danger',
    neutral: 'bg-muted',
  };
  return (
    <div className="h-1.5 w-full rounded-full bg-panel-2 overflow-hidden">
      <div
        className={`h-full ${toneBar[tone]} transition-all`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-medium text-text">{title}</h3>
        {typeof count === 'number' && (
          <span className="text-xs text-muted">({count})</span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted italic">{children}</p>;
}

export function GEOAuditView({ audit, asset, bankItems }: Props) {
  const overallTone = scoreTone(audit.score.geoScore);
  const inputTypeLabel = OPTIMIZER_INPUT_TYPE_LABEL[audit.inputType as OptimizerInputType];
  const assetTypeLabel = CONTENT_ASSET_TYPE_LABEL[asset.type];
  const bankMap = new Map(bankItems.map((q) => [q.id, q]));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-text">
                GEO audit &middot; {asset.title}
              </h2>
              <Badge tone={overallTone} className="text-base px-2.5 py-0.5">
                {audit.score.geoScore.toFixed(1)}
              </Badge>
              <Badge tone="accent">{inputTypeLabel}</Badge>
              <Badge tone="neutral">{assetTypeLabel}</Badge>
            </div>
            <div className="mt-1.5 text-xs text-muted flex items-center gap-2 flex-wrap">
              <span className="font-mono">{audit.id}</span>
              <span className="mx-1">&middot;</span>
              <span>model: {audit.scoringModelVersion}</span>
              <span className="mx-1">&middot;</span>
              <span>created {fmtDate(audit.createdAt)}</span>
              <span className="mx-1">&middot;</span>
              <span>updated {fmtDate(audit.updatedAt)}</span>
            </div>
            <p className="mt-2 text-sm text-text whitespace-pre-wrap">
              {audit.explanation}
            </p>
          </div>
        </div>
      </Card>

      {/* 7-dim breakdown */}
      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          7-dimension score breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {GEO_AUDIT_DIMENSIONS.map((dim) => {
            const v = dimValue(audit, dim);
            const tone = scoreTone(v);
            return (
              <div key={dim} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text">
                      {GEO_AUDIT_DIMENSION_LABEL[dim]}
                    </span>
                    <span className="text-[10px] text-muted">
                      weight {fmtPct(GEO_AUDIT_WEIGHTS[dim])}
                    </span>
                  </div>
                  <Badge tone={tone} className="font-mono">
                    {v}
                  </Badge>
                </div>
                <ProgressBar value={v} tone={tone} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* 9 suggestion buckets */}
      <Card>
        <h2 className="text-sm font-medium text-muted mb-3">
          Optimizer suggestions
        </h2>
        <div className="flex flex-col gap-5">
          {/* 1. Target queries */}
          <Section title="1. Target AI queries" count={audit.suggestions.targetQueries.length}>
            {audit.suggestions.targetQueries.length === 0 ? (
              <EmptyNote>No target queries suggested.</EmptyNote>
            ) : (
              <ul className="text-sm text-text flex flex-col gap-1 list-disc pl-5">
                {audit.suggestions.targetQueries.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            )}
          </Section>

          {/* 2. Core entities */}
          <Section title="2. Core entities" count={audit.suggestions.coreEntities.length}>
            {audit.suggestions.coreEntities.length === 0 ? (
              <EmptyNote>No core entities suggested.</EmptyNote>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {audit.suggestions.coreEntities.map((e, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md border border-border bg-panel-2 px-2 py-0.5 text-xs text-text"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* 3. Definable terms */}
          <Section
            title="3. Definable terms (citation-ready)"
            count={audit.suggestions.definableTerms.length}
          >
            {audit.suggestions.definableTerms.length === 0 ? (
              <EmptyNote>No definable terms suggested.</EmptyNote>
            ) : (
              <ul className="text-sm text-text flex flex-col gap-1.5 list-disc pl-5">
                {audit.suggestions.definableTerms.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </Section>

          {/* 4. Evidence checklist */}
          <Section
            title="4. Evidence checklist"
            count={audit.suggestions.evidenceChecklist.length}
          >
            {audit.suggestions.evidenceChecklist.length === 0 ? (
              <EmptyNote>No evidence gaps identified.</EmptyNote>
            ) : (
              <ol className="text-sm text-text flex flex-col gap-1 list-decimal pl-5">
                {audit.suggestions.evidenceChecklist.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ol>
            )}
          </Section>

          {/* 5. Comparison table */}
          <Section
            title="5. Comparison table"
            count={audit.suggestions.comparisonTable.length}
          >
            {audit.suggestions.comparisonTable.length === 0 ? (
              <EmptyNote>No comparison rows suggested.</EmptyNote>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted border-b border-border">
                      <th className="py-1.5 pr-3 font-medium">Dimension</th>
                      <th className="py-1.5 pr-3 font-medium">This asset</th>
                      <th className="py-1.5 pr-3 font-medium">Other</th>
                      <th className="py-1.5 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.suggestions.comparisonTable.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-3 text-text">{row.dimension}</td>
                        <td className="py-1.5 pr-3 text-text">{row.thisSide}</td>
                        <td className="py-1.5 pr-3 text-text">{row.otherSide}</td>
                        <td className="py-1.5 text-muted text-xs">
                          {row.source ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* 6. FAQ suggestions */}
          <Section
            title="6. FAQ suggestions"
            count={audit.suggestions.faqSuggestions.length}
          >
            {audit.suggestions.faqSuggestions.length === 0 ? (
              <EmptyNote>No FAQ items suggested.</EmptyNote>
            ) : (
              <div className="flex flex-col gap-2">
                {audit.suggestions.faqSuggestions.map((it, i) => {
                  const linked = it.relatedBankItemId
                    ? bankMap.get(it.relatedBankItemId)
                    : undefined;
                  return (
                    <div
                      key={i}
                      className="rounded-md border border-border bg-panel-2 px-3 py-2"
                    >
                      <div className="text-sm font-medium text-text">
                        Q: {it.question}
                      </div>
                      <div className="mt-1 text-sm text-muted">A: {it.answer}</div>
                      {linked && (
                        <div className="mt-1 text-[10px] text-accent font-mono">
                          bank: {linked.id} &middot; {linked.query}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* 7. Structured suggestions */}
          <Section
            title="7. Structured content suggestions"
            count={audit.suggestions.structuredSuggestions.length}
          >
            {audit.suggestions.structuredSuggestions.length === 0 ? (
              <EmptyNote>No structured suggestions.</EmptyNote>
            ) : (
              <ul className="text-sm text-text flex flex-col gap-1 list-disc pl-5">
                {audit.suggestions.structuredSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </Section>

          {/* 8. (intentionally numbered gap — see GEO_ENGINE.md) */}

          {/* 9. Optimized outline */}
          <Section
            title="9. Optimized outline"
            count={audit.suggestions.optimizedOutline.length}
          >
            {audit.suggestions.optimizedOutline.length === 0 ? (
              <EmptyNote>No outline generated.</EmptyNote>
            ) : (
              <div className="flex flex-col gap-3">
                {audit.suggestions.optimizedOutline.map((sec, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-panel-2 px-3 py-2"
                  >
                    <div className="text-sm font-medium text-text">
                      {sec.heading}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      purpose: {sec.purpose}
                    </div>
                    {sec.targetQueries.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sec.targetQueries.map((q, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center rounded border border-border bg-panel px-1.5 py-0.5 text-[10px] text-muted font-mono"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted italic">
                      notes: {sec.notes}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </Card>
    </div>
  );
}
