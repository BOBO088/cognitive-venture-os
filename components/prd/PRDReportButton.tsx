'use client';

/**
 * PRDReportButton — 接收 server 端装配好的 input，生成 markdown Blob 并下载。
 * 数据流：app/prd/[id]/page.tsx (server) 解析 PRD + mvp + opportunity
 * → 传给本组件 → 调用 buildPRDReport → 下载。
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  buildPRDReport,
  buildPRDReportFilename,
  type PRDReportInput,
} from '@/lib/export/prdReportMarkdown';

interface Props {
  input: PRDReportInput;
}

export function PRDReportButton({ input }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleClick() {
    setBusy(true);
    setErr(null);
    try {
      const md = buildPRDReport(input);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildPRDReportFilename(input.project.id);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'export failed');
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
        aria-label="Export PRD as Markdown"
      >
        {busy ? 'Exporting…' : 'Export report'}
      </Button>
      {err && (
        <span className="text-[10px] text-danger" role="alert">
          {err}
        </span>
      )}
    </div>
  );
}
