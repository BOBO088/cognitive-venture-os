'use server';

/**
 * Lesson 的 server actions。
 * UI 只 import 这里暴露的函数，从不直接 import service / repo。
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createLesson,
  updateLesson,
  deleteLesson,
  getLesson,
  LessonServiceError,
  type CreateLessonInput,
  type UpdateLessonInput,
} from '@/lib/services/lessonService';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function parseString(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parseRequiredString(
  v: FormDataEntryValue | null,
  fieldName: string,
): string {
  const s = parseString(v);
  if (s === undefined) {
    throw new LessonServiceError(`${fieldName} is required`);
  }
  return s;
}

function genLessonId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `lesson_${Date.now().toString(36)}-${rand}`;
}

export async function createLessonAction(formData: FormData): Promise<void> {
  const launchResultId = parseString(formData.get('launchResultId'));
  const input: CreateLessonInput = {
    id: genLessonId(),
    projectId: parseRequiredString(formData.get('projectId'), 'projectId'),
    ...(launchResultId !== undefined ? { launchResultId } : {}),
    whatWorked: parseRequiredString(formData.get('whatWorked'), 'whatWorked'),
    whatFailed: parseRequiredString(formData.get('whatFailed'), 'whatFailed'),
    why: parseRequiredString(formData.get('why'), 'why'),
    customerInsight: parseRequiredString(
      formData.get('customerInsight'),
      'customerInsight',
    ),
    marketInsight: parseRequiredString(
      formData.get('marketInsight'),
      'marketInsight',
    ),
    productInsight: parseRequiredString(
      formData.get('productInsight'),
      'productInsight',
    ),
    geoInsight: parseRequiredString(formData.get('geoInsight'), 'geoInsight'),
    nextAction: parseRequiredString(formData.get('nextAction'), 'nextAction'),
    scoreModelSuggestion: parseRequiredString(
      formData.get('scoreModelSuggestion'),
      'scoreModelSuggestion',
    ),
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
  const created = await createLesson(input);
  revalidatePath('/learning/lessons');
  revalidatePath(`/learning/lessons/${created.id}`);
  revalidatePath(`/mvp/${created.projectId}`);
  if (created.launchResultId) {
    revalidatePath(`/learning/launch-results/${created.launchResultId}`);
  }
  redirect(`/learning/lessons/${created.id}`);
}

export async function updateLessonAction(formData: FormData): Promise<void> {
  const id = parseRequiredString(formData.get('id'), 'id');
  const launchRaw = formData.get('launchResultId');
  // launchResultId 字段策略：未提供（无字段）→ undefined (跳过)；
  // 显式空字符串 → null (清空)；其它 string → 走 service 校验
  const launchResultPatch: string | null | undefined =
    launchRaw === null
      ? undefined
      : typeof launchRaw === 'string' && launchRaw.trim() === ''
        ? null
        : (parseString(launchRaw) ?? null);

  const patch: UpdateLessonInput = {
    projectId: parseString(formData.get('projectId')),
    launchResultId: launchResultPatch,
    whatWorked: parseString(formData.get('whatWorked')),
    whatFailed: parseString(formData.get('whatFailed')),
    why: parseString(formData.get('why')),
    customerInsight: parseString(formData.get('customerInsight')),
    marketInsight: parseString(formData.get('marketInsight')),
    productInsight: parseString(formData.get('productInsight')),
    geoInsight: parseString(formData.get('geoInsight')),
    nextAction: parseString(formData.get('nextAction')),
    scoreModelSuggestion: parseString(formData.get('scoreModelSuggestion')),
    updatedAt: MOCK_NOW,
  };
  const updated = await updateLesson(id, patch);
  revalidatePath('/learning/lessons');
  revalidatePath(`/learning/lessons/${id}`);
  revalidatePath(`/mvp/${updated.projectId}`);
  if (updated.launchResultId) {
    revalidatePath(`/learning/launch-results/${updated.launchResultId}`);
  }
}

export async function deleteLessonAction(id: string): Promise<void> {
  const existing = await getLesson(id);
  await deleteLesson(id);
  revalidatePath('/learning/lessons');
  if (existing) {
    revalidatePath(`/mvp/${existing.projectId}`);
    if (existing.launchResultId) {
      revalidatePath(`/learning/launch-results/${existing.launchResultId}`);
    }
  }
  redirect('/learning/lessons');
}
