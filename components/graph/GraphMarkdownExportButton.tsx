'use client';

/**
 * GraphMarkdownExportButton — 把当前 graph 视图（server 端已经算好）序列化为
 * markdown 文件并触发下载。
 *
 * 数据流：app/graph/page.tsx (server) 计算 filtered data → 传给本组件 → 客户端
 * 调用 lib/export/graphMarkdown.ts 序列化 → Blob → 触发下载。
 *
 * 不在 client 端重新过滤（避免和 server 端过滤逻辑分叉）。
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { buildGraphMarkdown, type GraphMarkdownInput } from '@/lib/export/graphMarkdown';

interface GraphMarkdownExportButtonProps {
  input: GraphMarkdownInput;
}

function buildFilename(input: GraphMarkdownInput): string {
  const date = (input.generatedAt || new Date().toISOString()).slice(0, 10);
  const parts: string[] = ['graph'];
  if (input.filters.entityType) parts.push(input.filters.entityType);
  if (input.filters.relationType) parts.push(input.filters.relationType);
  if (input.selectedEntityId) parts.push('focused');
  return `${parts.join('-')}-${date}.md`;
}

export function GraphMarkdownExportButton({ input }: GraphMarkdownExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  function handleClick() {
    setBusy(true);
    setLastError(null);
    try {
      const md = buildGraphMarkdown(input);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildFilename(input);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'export failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        onClick={handleClick}
        disabled={busy}
        aria-label="Export current graph view as Markdown"
      >
        {busy ? 'Exporting…' : 'Export Markdown'}
      </Button>
      {lastError && (
        <span className="text-[10px] text-danger" role="alert">
          {lastError}
        </span>
      )}
    </div>
  );
}
