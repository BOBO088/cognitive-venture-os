'use client';

/**
 * GEOAuditReport — 一次 GEOAudit 的 Markdown 导出。
 *
 * 数据流：page (RSC) → 把已经 resolve 好的 audit + asset + brand + bank items
 * 作为 props 传入 → client 组件拼 markdown + 提供 copy / download 按钮。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
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
  ContentAsset,
  OptimizerInputType,
  ContentAssetType,
} from '@/types';

interface ReportTargetQuery {
  id: string;
  query: string;
  intent: string;
}

interface ReportBrand {
  id: string;
  name: string;
  category: string;
}

interface Props {
  audit: GEOAudit;
  asset: Pick<ContentAsset, 'id' | 'title' | 'url' | 'type'>;
  brand: ReportBrand | undefined;
  targetQueries: ReportTargetQuery[];
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

function safeFilename(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'geo-audit'
  );
}

function buildMarkdown(
  audit: GEOAudit,
  asset: Props['asset'],
  brand: ReportBrand | undefined,
  targetQueries: ReportTargetQuery[],
  generatedAt: string,
): string {
  const lines: string[] = [];
  lines.push(`# GEO audit · ${asset.title}`);
  lines.push('');
  lines.push(`- **Asset**: ${asset.title}`);
  lines.push(`- **URL**: ${asset.url}`);
  lines.push(`- **Asset type**: ${CONTENT_ASSET_TYPE_LABEL[asset.type as ContentAssetType]}`);
  lines.push(`- **Optimizer input**: ${OPTIMIZER_INPUT_TYPE_LABEL[audit.inputType as OptimizerInputType]}`);
  if (brand) {
    lines.push(`- **Brand**: ${brand.name} (${brand.category})`);
  } else {
    lines.push(`- **Brand**: _not found_`);
  }
  lines.push(`- **Audit id**: \`${audit.id}\``);
  lines.push(`- **Scoring model**: ${audit.scoringModelVersion}`);
  lines.push(`- **Created**: ${audit.createdAt.slice(0, 10)}`);
  lines.push(`- **Overall GEO score**: **${audit.score.geoScore.toFixed(1)}** / 100`);
  lines.push('');

  lines.push('## 7-dimension breakdown');
  lines.push('');
  for (const dim of GEO_AUDIT_DIMENSIONS) {
    const v = dimValue(audit, dim);
    const w = Math.round(GEO_AUDIT_WEIGHTS[dim] * 100);
    lines.push(`- **${GEO_AUDIT_DIMENSION_LABEL[dim]}** (weight ${w}%): ${v} / 100`);
  }
  lines.push('');

  // 1. Target queries
  lines.push('## 1. Target AI queries');
  lines.push('');
  if (audit.suggestions.targetQueries.length === 0) {
    lines.push('_None._');
  } else {
    for (const q of audit.suggestions.targetQueries) {
      lines.push(`- ${q}`);
    }
  }
  lines.push('');

  // 2. Core entities
  lines.push('## 2. Core entities');
  lines.push('');
  if (audit.suggestions.coreEntities.length === 0) {
    lines.push('_None._');
  } else {
    lines.push(audit.suggestions.coreEntities.map((e) => `\`${e}\``).join(', '));
  }
  lines.push('');

  // 3. Definable terms
  lines.push('## 3. Definable terms (citation-ready)');
  lines.push('');
  if (audit.suggestions.definableTerms.length === 0) {
    lines.push('_None._');
  } else {
    for (const t of audit.suggestions.definableTerms) {
      lines.push(`- ${t}`);
    }
  }
  lines.push('');

  // 4. Evidence checklist
  lines.push('## 4. Evidence checklist');
  lines.push('');
  if (audit.suggestions.evidenceChecklist.length === 0) {
    lines.push('_None._');
  } else {
    audit.suggestions.evidenceChecklist.forEach((e, i) => {
      lines.push(`${i + 1}. ${e}`);
    });
  }
  lines.push('');

  // 5. Comparison table
  lines.push('## 5. Comparison table');
  lines.push('');
  if (audit.suggestions.comparisonTable.length === 0) {
    lines.push('_None._');
  } else {
    lines.push('| Dimension | This asset | Other | Source |');
    lines.push('|---|---|---|---|');
    for (const row of audit.suggestions.comparisonTable) {
      const src = row.source ?? '—';
      lines.push(`| ${row.dimension} | ${row.thisSide} | ${row.otherSide} | ${src} |`);
    }
  }
  lines.push('');

  // 6. FAQ
  lines.push('## 6. FAQ suggestions');
  lines.push('');
  if (audit.suggestions.faqSuggestions.length === 0) {
    lines.push('_None._');
  } else {
    for (const it of audit.suggestions.faqSuggestions) {
      lines.push(`**Q: ${it.question}**`);
      lines.push('');
      lines.push(`A: ${it.answer}`);
      if (it.relatedBankItemId) {
        lines.push('');
        lines.push(`_bank: \`${it.relatedBankItemId}\`_`);
      }
      lines.push('');
    }
  }

  // 7. Structured suggestions
  lines.push('## 7. Structured content suggestions');
  lines.push('');
  if (audit.suggestions.structuredSuggestions.length === 0) {
    lines.push('_None._');
  } else {
    for (const s of audit.suggestions.structuredSuggestions) {
      lines.push(`- ${s}`);
    }
  }
  lines.push('');

  // 9. Optimized outline
  lines.push('## 9. Optimized outline');
  lines.push('');
  if (audit.suggestions.optimizedOutline.length === 0) {
    lines.push('_None._');
  } else {
    for (const sec of audit.suggestions.optimizedOutline) {
      lines.push(`### ${sec.heading}`);
      lines.push('');
      lines.push(`_Purpose_: ${sec.purpose}`);
      lines.push('');
      if (sec.targetQueries.length > 0) {
        lines.push(`_Target queries_: ${sec.targetQueries.map((q) => `\`${q}\``).join(', ')}`);
        lines.push('');
      }
      lines.push(`_Notes_: ${sec.notes}`);
      lines.push('');
    }
  }

  // Explanation
  lines.push('## Explanation');
  lines.push('');
  lines.push(audit.explanation);
  lines.push('');

  // Target queries (bank-linked context)
  if (targetQueries.length > 0) {
    lines.push('## Linked target queries');
    lines.push('');
    for (const q of targetQueries) {
      lines.push(`- \`${q.id}\` &mdash; ${q.query} _(${q.intent})_`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`_Report generated ${generatedAt}._`);
  return lines.join('\n');
}

export function GEOAuditReport({
  audit,
  asset,
  brand,
  targetQueries,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markdown = generatedAt
    ? buildMarkdown(audit, asset, brand, targetQueries, generatedAt)
    : null;

  const handleGenerate = () => {
    setError(null);
    setCopied(false);
    startTransition(() => {
      setGeneratedAt(new Date().toISOString());
    });
  };

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setError('Clipboard API not available in this browser.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copy failed');
    }
  };

  const handleDownload = () => {
    if (!markdown) return;
    try {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename(asset.title)}-geo-audit.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={handleGenerate}
        >
          {pending
            ? 'Generating...'
            : generatedAt
              ? 'Regenerate report'
              : 'Generate report'}
        </Button>
        {markdown && (
          <>
            <Button type="button" variant="ghost" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy markdown'}
            </Button>
            <Button type="button" variant="ghost" onClick={handleDownload}>
              Download .md
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="rounded border border-danger text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}

      {markdown && (
        <pre className="text-xs text-text bg-panel-2 border border-border rounded-md p-3 max-h-[480px] overflow-auto whitespace-pre-wrap break-words">
          {markdown}
        </pre>
      )}
    </div>
  );
}
