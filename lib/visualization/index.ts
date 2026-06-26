/**
 * Graph visualization adapter — 接口 stub。
 *
 * 当前 MVP 用「卡片 + 列表 + 关系表」实现 /graph 简化视图（见 app/graph/page.tsx）。
 * 未来接入 Cytoscape / vis-network / react-flow 等图谱库时，新增一个
 * services/visualization/<provider>/index.ts，实现本接口；
 * app/graph/page.tsx 的 data-graph-canvas 占位挂载点保持不变。
 *
 * 设计原则：
 *   - 不在 UI 组件里直接 import 图谱库（保持 tree-shakable + 切换零成本）
 *   - 输入是 service 层已经规范化好的 GraphEntity / GraphRelation
 *   - mount() 接收一个 HTMLElement（page 里用 ref 拿到 data-graph-canvas 容器）
 */

import type { GraphEntity, GraphRelation } from '@/types';

export interface GraphVisualizationAdapter {
  /** 适配器名（用于诊断日志和调试面板）。 */
  readonly name: string;
  /**
   * 挂载到容器。当前实现可空（不渲染任何东西），未来真实实现负责初始化
   * 图谱实例并把节点/边布局到容器内。
   */
  mount(container: HTMLElement): void;
  /** 卸载并释放资源。Next.js 路由切换时会被调用。 */
  unmount(): void;
  /** 注入数据；可多次调用（带 diff 更新）。 */
  setData(input: { entities: GraphEntity[]; relations: GraphRelation[] }): void;
  /** 高亮一个实体（点击卡片时的副作用）。 */
  focusEntity(entityId: string): void;
  /** 清除高亮。 */
  clearFocus(): void;
}

/**
 * 当前默认实现 — no-op。占位用。
 * 当 lib/visualization/noop.ts 被 app/graph/page.tsx 引用时，不渲染图谱画布，
 * 仅作为「未来挂载点」的接口契约存在。
 */
export class NoopGraphVisualizationAdapter implements GraphVisualizationAdapter {
  readonly name = 'noop';
  mount(_container: HTMLElement): void {
    /* no-op */
  }
  unmount(): void {
    /* no-op */
  }
  setData(_input: { entities: GraphEntity[]; relations: GraphRelation[] }): void {
    /* no-op */
  }
  focusEntity(_entityId: string): void {
    /* no-op */
  }
  clearFocus(): void {
    /* no-op */
  }
}
