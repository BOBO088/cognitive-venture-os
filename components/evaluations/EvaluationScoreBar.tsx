/** 0-100 强度条。视觉与 SignalConfidenceBar 一致。 */
export function EvaluationScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone =
    clamped >= 70 ? 'bg-ok' : clamped >= 50 ? 'bg-warn' : 'bg-danger';
  return (
    <div className="flex items-center gap-2 w-32">
      <div className="flex-1 h-1.5 bg-panel-2 rounded overflow-hidden">
        <div
          className={`h-full ${tone} transition-all`}
          style={{ width: `${clamped}%` }}
          aria-label={`score ${clamped}/100`}
        />
      </div>
      <span className="text-xs tabular-nums text-text w-10 text-right">
        {clamped.toFixed(1)}
      </span>
    </div>
  );
}
