export default function VenturesPage() {
  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <h1 className="text-lg font-semibold text-text">Ventures</h1>
      <p className="text-sm text-muted">业务项目占位页：列出全部 ventures、stage、health。</p>
      <div className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
        🚧 该模块是占位页。下一步：接入真实数据源（mock → supabase）。
      </div>
    </div>
  );
}
