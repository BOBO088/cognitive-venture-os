/**
 * GraphCanvasPlaceholder — 视觉占位，标注未来图谱可视化库的挂载点。
 *
 * 当前 MVP 不引入任何图谱库（Cytoscape / vis-network / react-flow 等）。
 * 保留 data-graph-canvas 属性作为契约，详见 lib/visualization/index.ts。
 */

export function GraphCanvasPlaceholder() {
  return (
    <div
      data-graph-canvas
      aria-hidden="true"
      className="border border-dashed border-border rounded-lg p-3 text-[11px] text-muted flex items-center justify-between gap-2"
    >
      <span>Graph canvas — visualization adapter interface reserved.</span>
      <span className="font-mono text-[10px]">lib/visualization</span>
    </div>
  );
}
