/**
 * MVPFinancialsPanel — 收入 / 成本 / 净利 / ROI 汇总卡片。
 * RSC；接收 service 计算好的 summary。
 */
import { Card } from '@/components/ui/Card';
import type { MVPFinancialSummary } from '@/lib/services/mvpProjectService';

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtPct(n: number | null): string {
  if (n === null) return '—';
  return `${n.toFixed(1)}%`;
}

interface Props {
  summary: MVPFinancialSummary;
}

export function MVPFinancialsPanel({ summary }: Props) {
  const netTone = summary.netProfit > 0 ? 'text-ok' : summary.netProfit < 0 ? 'text-danger' : 'text-muted';
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card>
        <div className="text-xs text-muted">Total revenue</div>
        <div className="text-lg font-semibold text-text tabular-nums mt-1">
          {fmtMoney(summary.totalRevenue)}
        </div>
      </Card>
      <Card>
        <div className="text-xs text-muted">Total cost</div>
        <div className="text-lg font-semibold text-text tabular-nums mt-1">
          {fmtMoney(summary.totalCost)}
        </div>
      </Card>
      <Card>
        <div className="text-xs text-muted">Net profit</div>
        <div className={`text-lg font-semibold tabular-nums mt-1 ${netTone}`}>
          {summary.netProfit > 0 ? '+' : ''}
          {fmtMoney(summary.netProfit)}
        </div>
      </Card>
      <Card>
        <div className="text-xs text-muted">ROI</div>
        <div className={`text-lg font-semibold tabular-nums mt-1 ${netTone}`}>
          {fmtPct(summary.roi)}
        </div>
      </Card>
    </div>
  );
}
