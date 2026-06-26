'use client';

/**
 * ContentAssetReport — 内容资产报告 Markdown 导出。
 *
 * 数据流：detail page (RSC) → 把已经 resolve 好的 brand / targetQueries / asset
 * 作为 props 传入 → client 组件拼 markdown + 提供 copy / download 按钮。
 *
 * 不通过 server action：markdown 是数据视图，服务端拼字符串反而绕。
 */
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { CONTENT_ASSET_TYPE_LABEL } from '@/types';
import type { ContentAsset } from '@/types';

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
  asset: ContentAsset;
  brand: ReportBrand | undefined;
  targetQueries: ReportTargetQuery[];
}

function buildMarkdown(
  asset: ContentAsset,
  brand: ReportBrand | undefined,
  targetQueries: ReportTargetQuery[],
  generatedAt: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${asset.title}`);
  lines.push('');
  lines.push(`- **Type**: ${CONTENT_ASSET_TYPE_LABEL[asset.type]}`);
  lines.push(`- **URL**: ${asset.url}`);
  if (brand) {
    lines.push(`- **Brand**: ${brand.name} (${brand.category})`);
  } else {
    lines.push(`- **Brand**: \`${asset.brandEntityId}\` (not found)`);
  }
  lines.push(`- **GEO score**: ${asset.geoScore} / 100`);
  lines.push(
    `- **Last updated (content)**: ${asset.lastUpdated.slice(0, 10)}`,
  );
  lines.push(`- **Record updated**: ${asset.updatedAt.slice(0, 10)}`);
  lines.push(`- **Asset id**: \`${asset.id}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(asset.summary);
  lines.push('');
  if (asset.structuredEvidence.length > 0) {
    lines.push('## Structured evidence');
    lines.push('');
    for (let i = 0; i < asset.structuredEvidence.length; i += 1) {
      const ev = asset.structuredEvidence[i]!;
      lines.push(`${i + 1}. **${ev.claim}**`);
      if (ev.source) {
        lines.push(`   - Source: ${ev.source}`);
      }
      if (ev.quote) {
        lines.push(`   - Quote: ${ev.quote}`);
      }
    }
    lines.push('');
  } else {
    lines.push('## Structured evidence');
    lines.push('');
    lines.push('_No evidence recorded._');
    lines.push('');
  }
  if (targetQueries.length > 0) {
    lines.push('## Target AI queries');
    lines.push('');
    for (const q of targetQueries) {
      lines.push(`- \`${q.id}\` &mdash; ${q.query} _(${q.intent})_`);
    }
    lines.push('');
  } else {
    lines.push('## Target AI queries');
    lines.push('');
    lines.push('_No target queries linked._');
    lines.push('');
  }
  lines.push('---');
  lines.push(`_Report generated ${generatedAt}._`);
  return lines.join('\n');
}

function safeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'content-asset'
  );
}

export function ContentAssetReport({
  asset,
  brand,
  targetQueries,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markdown = generatedAt
    ? buildMarkdown(asset, brand, targetQueries, generatedAt)
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
      a.download = `${safeFilename(asset.title)}.md`;
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
