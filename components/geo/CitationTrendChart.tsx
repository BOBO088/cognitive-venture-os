/**
 * CitationTrendChart — 趋势图 (RSC, inline SVG, no chart lib).
 *
 * 输入：每日 mentionRate / citationRate / averageGeoScore 的点列表。
 * 输出：3 条线（mention / citation / score），x = 日期，y = 0-100。
 * 不引入 chart 库，符合 AGENTS.md "不要引入复杂图谱库" 的约定。
 */
import type { TrendPoint } from '@/lib/services/citationMonitorService';

interface Props {
  points: TrendPoint[];
  /** 图高，px。 */
  height?: number;
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function CitationTrendChart({ points, height = 180 }: Props) {
  if (points.length === 0) {
    return (
      <p className="text-xs text-muted italic">No trend data available.</p>
    );
  }

  // 视图框
  const W = 720;
  const H = height;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const n = points.length;
  // 决定 x 坐标：均匀分布
  const xFor = (i: number) =>
    n === 1 ? padL + innerW / 2 : padL + (i * innerW) / (n - 1);
  const yFor = (val: number) => padT + innerH - (val / 100) * innerH;

  // 3 条线
  const lines = [
    { key: 'mention', label: 'Mention rate', color: 'ok', get: (p: TrendPoint) => p.mentionRate * 100 },
    { key: 'citation', label: 'Citation rate', color: 'accent', get: (p: TrendPoint) => p.citationRate * 100 },
    { key: 'score', label: 'Avg GEO score', color: 'warn', get: (p: TrendPoint) => p.averageGeoScore },
  ] as const;

  const colorMap: Record<string, string> = {
    ok: 'var(--color-ok, #4ade80)',
    accent: 'var(--color-accent, #60a5fa)',
    warn: 'var(--color-warn, #fbbf24)',
  };

  // x 轴 label
  const xLabelEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Citation trend chart"
      >
        {/* 背景网格（4 条横线 0/25/50/75/100） */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              y1={yFor(v)}
              x2={W - padR}
              y2={yFor(v)}
              stroke="currentColor"
              strokeOpacity={v === 0 ? 0.4 : 0.15}
              strokeWidth={1}
            />
            <text
              x={padL - 4}
              y={yFor(v) + 3}
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.5}
              textAnchor="end"
            >
              {v}
            </text>
          </g>
        ))}

        {/* 3 条线 */}
        {lines.map((line) => {
          const d = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(line.get(p))}`)
            .join(' ');
          return (
            <g key={line.key}>
              <path
                d={d}
                fill="none"
                stroke={colorMap[line.color]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={xFor(i)}
                  cy={yFor(line.get(p))}
                  r={2.5}
                  fill={colorMap[line.color]}
                />
              ))}
            </g>
          );
        })}

        {/* x 轴 labels */}
        {points.map((p, i) => {
          if (i % xLabelEvery !== 0 && i !== n - 1) return null;
          return (
            <text
              key={p.date}
              x={xFor(i)}
              y={H - 8}
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.5}
              textAnchor="middle"
            >
              {p.date.slice(5)}
            </text>
          );
        })}
      </svg>
      <div className="flex items-center gap-3 text-[10px] text-muted flex-wrap">
        {lines.map((line) => (
          <span key={line.key} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded"
              style={{ background: colorMap[line.color] }}
            />
            {line.label}
          </span>
        ))}
        <span className="ml-auto">
          {n} day{n === 1 ? '' : 's'}, mention today{' '}
          {fmtPct(points[points.length - 1]!.mentionRate)}, citation today{' '}
          {fmtPct(points[points.length - 1]!.citationRate)}, avg score today{' '}
          {points[points.length - 1]!.averageGeoScore.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
