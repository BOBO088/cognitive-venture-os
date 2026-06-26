'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  /** 返回 markdown 字符串的纯函数（service 的 exportMarkdown）。 */
  getMarkdown: () => string;
  /** 建议的文件名（不含扩展名）。 */
  filename: string;
}

export function CardMarkdownDownload({ getMarkdown, filename }: Props) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const md = getMarkdown();
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="secondary" onClick={handleDownload} disabled={busy}>
      {busy ? 'Preparing…' : 'Export Markdown'}
    </Button>
  );
}
