/**
 * Learning 仓储：LessonLearned 查询 + 写入入口。
 *
 * LessonLearned 的来源横跨 MVP launch / opportunity evaluation / GEO 观察 /
 * kill decision；所以单独一个文件，不和 MVP 仓储混在一起。
 *
 * 写入（create / update / delete）由 service 层管理（验证 + projectId /
 * launchResultId 引用一致性 + 文本字段长度）。
 */

import { mockLessons } from '@/mock-data/learning';
import type { LessonLearned } from '@/types';

export async function listLessons(): Promise<LessonLearned[]> {
  return mockLessons;
}

export async function listLessonsSorted(): Promise<LessonLearned[]> {
  return [...mockLessons].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listLessonsByProject(
  projectId: string,
): Promise<LessonLearned[]> {
  return mockLessons
    .filter((l) => l.projectId === projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listLessonsByLaunch(
  launchResultId: string,
): Promise<LessonLearned[]> {
  return mockLessons
    .filter((l) => l.launchResultId === launchResultId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLesson(
  id: string,
): Promise<LessonLearned | undefined> {
  return mockLessons.find((l) => l.id === id);
}

/** 在内存中追加一条 LessonLearned。返回插入后的对象。 */
export async function insertLesson(
  lesson: LessonLearned,
): Promise<LessonLearned> {
  mockLessons.push(lesson);
  return lesson;
}

/** 在内存中更新一条 LessonLearned。返回更新后的对象；找不到返回 undefined。 */
export async function updateLessonInStore(
  id: string,
  patch: Partial<LessonLearned>,
): Promise<LessonLearned | undefined> {
  const i = mockLessons.findIndex((l) => l.id === id);
  if (i < 0) return undefined;
  const next: LessonLearned = {
    ...mockLessons[i]!,
    ...patch,
    id: mockLessons[i]!.id,
  };
  mockLessons[i] = next;
  return next;
}

/** 在内存中删除一条 LessonLearned。返回是否成功。 */
export async function deleteLessonFromStore(id: string): Promise<boolean> {
  const i = mockLessons.findIndex((l) => l.id === id);
  if (i < 0) return false;
  mockLessons.splice(i, 1);
  return true;
}
