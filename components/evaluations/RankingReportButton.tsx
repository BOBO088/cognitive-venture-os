'use client';

/**
 * RankingReportButton — 接收 server 端装配好的 input，生成 markdown Blob 并下载。
 *
 * 数据流：app/opportunities/ranking/page.tsx (server) 解析 rankOpportunities() →
 * 传给本组件 → 调用 buildRankingReport → 下载。
 *
 * 不在 client 端重新解析；保证 server / client 看到的快照一致。
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  buildRankingReport,
  buildRankingFilename,
  type RankingReportInput,
} from '@/lib/export/evaluationRankingMarkdown';

interface Props {
  input: RankingReportInput;
}

export function RankingReportButton({ input }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleClick() {
    setBusy(true);
    setErr(null);
    try {
      const md = buildRankingReport(input);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildRankingFilename(input.generatedAt);
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
        aria-label="Export ranking report as Markdown"
      >
        {busy ? 'Exporting…' : 'Export ranking report'}
      </Button>
      {err && <span className="text-[10px] text-danger" role="alert">{err}</span>}
    </div>
  );
}
