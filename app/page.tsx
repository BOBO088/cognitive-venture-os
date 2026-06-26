import { getDashboardSnapshot } from '@/lib/services/dashboardService';
import { StatGrid } from '@/components/dashboard/StatGrid';
import { RecentUpdates } from '@/components/dashboard/RecentUpdates';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { QuickActions } from '@/components/dashboard/QuickActions';

export const metadata = {
  title: 'Dashboard · Cognitive Venture OS',
  description: '跨 7 大域的总览：research / graph / opportunities / mvp / geo / learning / codex tasks。',
};

export default async function DashboardPage() {
  const snap = await getDashboardSnapshot();
  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-text">Dashboard</h1>
        <p className="text-sm text-muted">
          跨 7 大域 + 12 provider 的总览 · 生成于 {new Date(snap.generatedAt).toLocaleString()}
        </p>
      </div>

      <StatGrid stats={snap.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentUpdates items={snap.recent} />
        </div>
        <SystemStatus items={snap.providers} />
      </div>

      <QuickActions />
    </div>
  );
}
