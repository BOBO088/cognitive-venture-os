import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { getTask } from '@/lib/repos/tasks';
import { updateTaskAction, deleteTaskAction } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();

  // 用 bind 注入 id 到 action，避免在客户端拼接
  const onSubmit = updateTaskAction.bind(null, task.id);
  const onDelete = deleteTaskAction.bind(null, task.id);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/tasks" className="text-sm text-muted hover:text-text">
          ← Back to tasks
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-lg font-semibold text-text truncate">{task.title}</h1>
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <p className="text-xs text-muted mt-1">
          id: {task.id} · created {task.createdAt.slice(0, 10)} · updated {task.updatedAt.slice(0, 10)}
        </p>
      </div>

      <Card>
        <div className="text-sm font-semibold text-text mb-3">Read-only context</div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          {task.codexCommand && (
            <>
              <dt className="text-muted">Command</dt>
              <dd className="text-text font-mono text-xs">{task.codexCommand}</dd>
            </>
          )}
          {task.testResult && (
            <>
              <dt className="text-muted">Tests</dt>
              <dd className="text-text">
                {task.testResult.passed}/{task.testResult.total} passed
                {task.testResult.summary && (
                  <span className="ml-2 text-xs text-muted">
                    {task.testResult.summary}
                  </span>
                )}
              </dd>
            </>
          )}
          {task.changedFiles.length > 0 && (
            <>
              <dt className="text-muted">Files</dt>
              <dd className="text-text text-xs font-mono">
                {task.changedFiles.map((f) => (
                  <div key={f}>{f}</div>
                ))}
              </dd>
            </>
          )}
          {task.failureReason && (
            <>
              <dt className="text-muted">Failure</dt>
              <dd className="text-danger text-sm">{task.failureReason}</dd>
            </>
          )}
          {task.reviewNotes && (
            <>
              <dt className="text-muted">Review</dt>
              <dd className="text-text text-sm whitespace-pre-wrap">{task.reviewNotes}</dd>
            </>
          )}
        </dl>
      </Card>

      <div>
        <div className="text-sm font-semibold text-text mb-2">Edit</div>
        <TaskForm
          mode="edit"
          initial={task}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
