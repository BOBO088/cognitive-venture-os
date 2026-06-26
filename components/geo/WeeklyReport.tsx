'use client';

/**
 * WeeklyReport — GEO 周报 Markdown 导出 (client)。
 *
 * 数据流：page (RSC) 把已 resolve 好的 report + brand 传进来。
 * Markdown 模板：标题 / 时间范围 / 摘要 / byPlatform / byQuery /
 * trend / topCitedUrls / topCompetitors。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { CITATION_PLATFORM_LABEL } from '@/types';
import type { WeeklyReport } from '@/lib/services/citationMonitorService';
import type { CitationPlatform } from '@/types';

interface ReportBrand {
  id: string;
  name: string;
  category: string;
}

interface Props {
  report: WeeklyReport;
  brand: ReportBrand | undefined;
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function buildMarkdown(
  report: WeeklyReport,
  brand: ReportBrand | undefined,
  generatedAt: string,
): string {
  const lines: string[] = [];
  lines.push(`# GEO weekly report · ${brand ? brand.name : 'all brands'}`);
  lines.push('');
  lines.push(`- **Window**: ${report.startDate} → ${report.endDate}`);
  if (brand) {
    lines.push(`- **Brand**: ${brand.name} (${brand.category})`);
  } else {
    lines.push(`- **Brand**: _all brands_`);
  }
  lines.push(`- **Total checks**: ${report.totalChecks}`);
  lines.push(`- **Mention rate**: ${fmtPct(report.mentionRate)}`);
  lines.push(`- **Citation rate** (citedUrl = target): ${fmtPct(report.citationRate)}`);
  lines.push(`- **Average GEO score**: ${report.averageGeoScore.toFixed(1)} / 100`);
  lines.push('');

  // byPlatform
  lines.push('## By platform');
  lines.push('');
  lines.push('| Platform | Checks | Mention rate | Avg GEO score |');
  lines.push('|---|---|---|---|');
  for (const p of Object.keys(report.byPlatform) as CitationPlatform[]) {
    const s = report.byPlatform[p];
    lines.push(
      `| ${CITATION_PLATFORM_LABEL[p]} | ${s.count} | ${fmtPct(s.mentionRate)} | ${s.averageGeoScore.toFixed(1)} |`,
    );
  }
  lines.push('');

  // byQuery
  if (report.byQuery.length > 0) {
    lines.push('## By query');
    lines.push('');
    lines.push('| Query | Checks | Mention rate | Avg GEO score |');
    lines.push('|---|---|---|---|');
    for (const q of report.byQuery) {
      lines.push(
        `| ${q.queryText} | ${q.count} | ${fmtPct(q.mentionRate)} | ${q.averageGeoScore.toFixed(1)} |`,
      );
    }
    lines.push('');
  }

  // trend
  if (report.trend.length > 0) {
    lines.push('## Daily trend');
    lines.push('');
    lines.push('| Date | Checks | Mention rate | Citation rate | Avg GEO score |');
    lines.push('|---|---|---|---|---|');
    for (const p of report.trend) {
      lines.push(
        `| ${p.date} | ${p.count} | ${fmtPct(p.mentionRate)} | ${fmtPct(p.citationRate)} | ${p.averageGeoScore.toFixed(1)} |`,
      );
    }
    lines.push('');
  }

  // topCitedUrls
  if (report.topCitedUrls.length > 0) {
    lines.push('## Top cited URLs');
    lines.push('');
    for (const u of report.topCitedUrls) {
      lines.push(`- ${u.url} _(${u.count}x)_`);
    }
    lines.push('');
  }

  // topCompetitors
  if (report.topCompetitors.length > 0) {
    lines.push('## Top competitor mentions');
    lines.push('');
    for (const c of report.topCompetitors) {
      lines.push(`- ${c.name} _(${c.count}x)_`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`_Report generated ${generatedAt}._`);
  return lines.join('\n');
}

function safeFilename(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'geo-weekly-report'
  );
}

export function WeeklyReportClient({ report, brand }: Props) {
  const [pending, startTransition] = useTransition();
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markdown = generatedAt
    ? buildMarkdown(report, brand, generatedAt)
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
      const fname = brand
        ? `${safeFilename(brand.name)}-geo-weekly-${report.startDate}_${report.endDate}.md`
        : `geo-weekly-${report.startDate}_${report.endDate}.md`;
      a.download = fname;
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
              : 'Generate markdown'}
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
