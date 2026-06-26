import Link from 'next/link';
import { TaskForm } from '@/components/tasks/TaskForm';
import { createTaskAction } from '../actions';

export const metadata = {
  title: 'New task · Cognitive Venture OS',
};

export default function NewTaskPage() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <Link href="/tasks" className="text-sm text-muted hover:text-text">
          ← Back to tasks
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-text">New task</h1>
        <p className="text-sm text-muted">
          创建一个 Codex 任务。开始时 status 默认 backlog；执行后回填命令、改动、测试结果。
        </p>
      </div>

      <TaskForm mode="create" onSubmit={createTaskAction} />
    </div>
  );
}
