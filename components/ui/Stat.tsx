import type { ReactNode } from 'react';
import { Card } from './Card';

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

export function Stat({ label, value, hint }: Props) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-text">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}
