import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';

const toneClass: Record<Tone, string> = {
  neutral: 'border-border text-muted',
  ok: 'border-ok text-ok',
  warn: 'border-warn text-warn',
  danger: 'border-danger text-danger',
  accent: 'border-accent text-accent',
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className, ...rest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] uppercase tracking-wider',
        toneClass[tone],
        className,
      )}
      {...rest}
    />
  );
}
