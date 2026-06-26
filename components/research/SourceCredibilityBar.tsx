/** 0-100 的可信度可视化。 */
export function SourceCredibilityBar({ score }: { score?: number }) {
  if (score === undefined) {
    return <span className="text-xs text-muted">—</span>;
  }
  const clamped = Math.max(0, Math.min(100, score));
  // 颜色：< 40 danger / 40-69 warn / >= 70 ok
  const tone =
    clamped < 40
      ? 'bg-danger'
      : clamped < 70
        ? 'bg-warn'
        : 'bg-ok';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-panel-2 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-muted tabular-nums">{clamped}</span>
    </div>
  );
}
