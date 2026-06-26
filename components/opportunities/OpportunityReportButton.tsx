'use client';

/**
 * OpportunityReportButton — 接收 server 端装配好的 input，生成 markdown Blob 并下载。
 *
 * 数据流：app/opportunities/[id]/page.tsx (server) 解析 opportunity + 关联 signal /
 * card / entity 名字 → 传给本组件 → 调用 buildOpportunityReport → 下载。
 *
 * 不在 client 端重新解析；保证 server / client 看到的快照一致。
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { buildOpportunityReport, type OpportunityReportInput } from '@/lib/export/opportunityMarkdown';

interface Props {
  input: OpportunityReportInput;
}

function buildFilename(oppId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `opportunity-${oppId}-${date}.md`;
}

export function OpportunityReportButton({ input }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleClick() {
    setBusy(true);
    setErr(null);
    try {
      const md = buildOpportunityReport(input);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildFilename(input.opportunity.id);
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
        aria-label="Export opportunity report as Markdown"
      >
        {busy ? 'Exporting…' : 'Export report'}
      </Button>
      {err && <span className="text-[10px] text-danger" role="alert">{err}</span>}
    </div>
  );
}
