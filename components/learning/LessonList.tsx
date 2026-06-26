/**
 * LessonList — 复盘列表。
 * RSC；按 updatedAt desc 排（service 已排好）。
 * 表格只展示元信息（日期 / project / launch），正文 9 个字段在详情页展开。
 */
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { LessonLearned, MVPProject, LaunchResult } from '@/types';

interface Row {
  lesson: LessonLearned;
  mvpProject: MVPProject | undefined;
  launchResult: LaunchResult | undefined;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function LessonList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-sm text-muted">
          No lessons recorded yet. Write your first retrospective to start
          the learning loop.
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-panel-2 text-muted">
          <tr className="text-left">
            <th className="px-4 py-2 font-medium">Updated</th>
            <th className="px-4 py-2 font-medium">Project</th>
            <th className="px-4 py-2 font-medium">Launch</th>
            <th className="px-4 py-2 font-medium">Top insights</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ lesson, mvpProject, launchResult }) => {
            const preview =
              lesson.customerInsight
                .split('\n')[0]
                ?.slice(0, 80) ?? '';
            return (
              <tr
                key={lesson.id}
                className="border-t border-border hover:bg-panel-2 transition align-top"
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <Link
                    href={`/learning/lessons/${lesson.id}`}
                    className="text-text hover:text-accent font-medium"
                  >
                    {fmtDate(lesson.updatedAt)}
                  </Link>
                  <div className="text-[10px] text-muted font-mono mt-0.5">
                    {lesson.id}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {mvpProject ? (
                    <Link
                      href={`/mvp/${mvpProject.id}`}
                      className="text-muted hover:text-accent"
                    >
                      {mvpProject.name}
                    </Link>
                  ) : (
                    <span className="text-muted">{lesson.projectId}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {launchResult ? (
                    <Link
                      href={`/learning/launch-results/${launchResult.id}`}
                      className="text-muted hover:text-accent"
                    >
                      {fmtDate(launchResult.launchDate)}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted max-w-md">
                  <span className="text-text line-clamp-2">{preview}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
