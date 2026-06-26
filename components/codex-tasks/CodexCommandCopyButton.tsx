'use client';

/**
 * CodexCommandCopyButton — 一键把 codexCommand 复制到剪贴板。
 * 用于 run detail 页面每个 task 旁的"复制"按钮。
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  command: string;
  label?: string;
}

export function CodexCommandCopyButton({ command, label = 'Copy' }: Props) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleClick() {
    setErr(null);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(command);
      } else {
        // 降级：临时 textarea + execCommand
        const ta = document.createElement('textarea');
        ta.value = command;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'copy failed');
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        aria-label={`Copy Codex command: ${command}`}
      >
        {copied ? 'Copied!' : label}
      </Button>
      {err && (
        <span className="text-[10px] text-danger" role="alert">
          {err}
        </span>
      )}
    </div>
  );
}
