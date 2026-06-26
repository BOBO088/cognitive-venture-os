import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import type { Task } from '@/types';

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          暂无任务。点击右上角"New task"创建第一条。
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Title</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Priority</th>
            <th className="px-4 py-2 font-medium">Phase</th>
            <th className="px-4 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              className="border-t border-border hover:bg-panel-2 transition"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/tasks/${t.id}`}
                  className="text-text hover:text-accent font-medium"
                >
                  {t.title}
                </Link>
                {t.testResult && (
                  <span className="ml-2 text-xs text-muted">
                    {t.testResult.passed}/{t.testResult.total} tests
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <TaskStatusBadge status={t.status} />
              </td>
              <td className="px-4 py-2.5">
                <TaskPriorityBadge priority={t.priority} />
              </td>
              <td className="px-4 py-2.5 text-muted">
                {t.phase ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-muted text-xs">
                {fmtDate(t.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
