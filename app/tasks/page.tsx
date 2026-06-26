import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { TaskList } from '@/components/tasks/TaskList';
import { listTasks } from '@/lib/repos/tasks';

export const metadata = {
  title: 'Tasks · Cognitive Venture OS',
};

export default async function TasksPage() {
  const tasks = await listTasks();
  const counts = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text">Codex Tasks</h1>
          <p className="text-sm text-muted">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} ·{' '}
            {counts.doing ?? 0} doing · {counts.review ?? 0} review ·{' '}
            {counts.done ?? 0} done · {counts.failed ?? 0} failed
          </p>
        </div>
        <Link href="/tasks/new">
          <Button variant="primary">New task</Button>
        </Link>
      </div>

      <TaskList tasks={tasks} />
    </div>
  );
}
