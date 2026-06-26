import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ProviderHealth } from '@/lib/providers';

/** Provider health 的 ok 状态映射到 UI tone。 */
function tone(ok: boolean): 'ok' | 'warn' {
  return ok ? 'ok' : 'warn';
}

/** 从 name 提取短类目（去 "Provider" / "Connector" 后缀），用于显示。 */
function shortName(name: string): string {
  return name.replace(/Provider$/, '').replace(/Connector$/, '');
}

export function SystemStatus({ items }: { items: ProviderHealth[] }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Provider health</h2>
        <span className="text-xs text-muted">{items.length} providers</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((i) => (
          <li key={i.name} className="flex items-center gap-2 text-sm">
            <span className="w-28 text-muted text-[11px] uppercase tracking-wider shrink-0">
              {shortName(i.name)}
            </span>
            <Badge tone={tone(i.ok)}>{i.ok ? 'ok' : 'down'}</Badge>
            <span className="text-muted text-xs flex-1 truncate">{i.detail ?? '—'}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
