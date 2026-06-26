/** 0-100 强度条。视觉与 RelationStrengthBar / CardScoreBar 一致。 */
export function SignalConfidenceBar({ confidence }: { confidence: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(confidence)));
  const tone =
    clamped >= 80 ? 'bg-ok' : clamped >= 50 ? 'bg-warn' : 'bg-danger';
  return (
    <div className="flex items-center gap-2 w-32">
      <div className="flex-1 h-1.5 bg-panel-2 rounded overflow-hidden">
        <div
          className={`h-full ${tone} transition-all`}
          style={{ width: `${clamped}%` }}
          aria-label={`confidence ${clamped}/100`}
        />
      </div>
      <span className="text-xs tabular-nums text-muted w-8 text-right">{clamped}</span>
    </div>
  );
}
