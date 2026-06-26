import { isDemoMode } from '@/lib/env';
import { Badge } from '@/components/ui/Badge';

export function Topbar() {
  const demo = isDemoMode();
  return (
    <header className="h-12 shrink-0 border-b border-border bg-panel flex items-center px-4 gap-3">
      <div className="text-sm text-muted">Search</div>
      <div className="ml-auto flex items-center gap-3">
        {demo && (
          <Badge tone="warn" className="uppercase">
            Demo mode · mock data
          </Badge>
        )}
        <div className="h-7 w-7 rounded-full bg-panel-2 border border-border" />
        <div className="text-sm text-text">operator</div>
      </div>
    </header>
  );
}
