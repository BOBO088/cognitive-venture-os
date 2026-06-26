export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <h1 className="text-lg font-semibold text-text">Settings</h1>
      <p className="text-sm text-muted">全局设置占位页。</p>
      <div className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
        🚧 该模块是占位页。下一步：接入真实数据源（mock → supabase）。
      </div>
    </div>
  );
}
