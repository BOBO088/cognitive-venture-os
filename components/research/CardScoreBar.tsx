/** 0-100 的重要性评分可视化。 */
export function CardScoreBar({ score }: { score?: number }) {
  if (score === undefined) {
    return <span className="text-xs text-muted">—</span>;
  }
  const clamped = Math.max(0, Math.min(100, score));
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
