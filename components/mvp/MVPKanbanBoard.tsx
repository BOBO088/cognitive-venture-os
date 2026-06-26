/**
 * MVPKanbanBoard — 7 列 kanban 视图。
 * RSC；通过 URL ?stage=... 链接到列表页；"Move to next stage" 按钮走 server action。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { MVPStageBadge } from './MVPStageBadge';
import { MVP_STAGES, MVP_STAGE_LABEL, type MVPStage } from '@/types';
import type { MVPProject } from '@/types';

interface Row {
  project: MVPProject;
  opportunityTitle?: string;
}

interface Props {
  grouped: Record<MVPStage, Row[]>;
  /** 单卡操作的服务端回调（'use server'），用于把项目从当前 stage 推到下一 stage。 */
  moveToNextAction: (id: string, toStage: string) => Promise<void>;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function nextStage(s: MVPStage): MVPStage | null {
  const idx = MVP_STAGES.indexOf(s);
  if (idx < 0 || idx >= MVP_STAGES.length - 1) return null;
  // skip 'killed' on auto-next
  if (MVP_STAGES[idx + 1] === 'killed') {
    if (idx + 1 >= MVP_STAGES.length - 1) return null;
    return MVP_STAGES[idx + 2] ?? null;
  }
  return MVP_STAGES[idx + 1] ?? null;
}

export function MVPKanbanBoard({ grouped, moveToNextAction }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {MVP_STAGES.map((stage) => {
        const rows = grouped[stage] ?? [];
        return (
          <div key={stage} className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-medium text-text">
                {MVP_STAGE_LABEL[stage]}
              </h2>
              <span className="text-[10px] text-muted tabular-nums">
                {rows.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {rows.length === 0 ? (
                <div className="text-[11px] text-muted px-2 py-3 border border-dashed border-border rounded">
                  empty
                </div>
              ) : (
                rows.map(({ project: p, opportunityTitle }) => {
                  const next = nextStage(p.stage);
                  return (
                    <Card key={p.id} className="p-3">
                      <Link
                        href={`/mvp/${p.id}`}
                        className="text-sm font-medium text-text hover:text-accent line-clamp-2"
                      >
                        {p.name}
                      </Link>
                      <div className="mt-1.5">
                        <MVPStageBadge stage={p.stage} />
                      </div>
                      <div className="mt-2 text-[11px] text-muted">
                        {p.owner} · started {fmtDate(p.startDate)}
                      </div>
                      {(p.revenue > 0 || p.cost > 0) && (
                        <div className="mt-1.5 text-[11px] tabular-nums">
                          <span className="text-text">
                            {p.revenue.toLocaleString()}
                          </span>
                          <span className="text-muted"> / </span>
                          <span className="text-muted">
                            {p.cost.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {opportunityTitle && (
                        <div className="mt-1.5 text-[10px] text-muted truncate">
                          ↳ {opportunityTitle}
                        </div>
                      )}
                      {next && next !== 'killed' && (
                        <form
                          action={async () => {
                            'use server';
                            await moveToNextAction(p.id, next);
                          }}
                          className="mt-2"
                        >
                          <button
                            type="submit"
                            className="text-[10px] text-accent hover:underline"
                            aria-label={`Move ${p.name} to ${MVP_STAGE_LABEL[next]}`}
                          >
                            → {MVP_STAGE_LABEL[next]}
                          </button>
                        </form>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
