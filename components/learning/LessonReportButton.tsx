'use client';

/**
 * LessonReportButton — 接收 server 端装配好的 input，生成 markdown Blob 并下载。
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  buildLessonReport,
  buildLessonReportFilename,
  type LessonReportInput,
} from '@/lib/export/lessonReportMarkdown';

interface Props {
  input: LessonReportInput;
}

export function LessonReportButton({ input }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleClick() {
    setBusy(true);
    setErr(null);
    try {
      const md = buildLessonReport(input);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildLessonReportFilename(input.lesson.id);
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
        aria-label="Export lesson as Markdown"
      >
        {busy ? 'Exporting…' : 'Export retro'}
      </Button>
      {err && (
        <span className="text-[10px] text-danger" role="alert">
          {err}
        </span>
      )}
    </div>
  );
}
