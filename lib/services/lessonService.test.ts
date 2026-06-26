/**
 * lessonService 单元测试。
 *
 * 覆盖：
 *  - createLesson 拒绝：缺失 projectId / 文本字段为空 / 长度越界
 *  - createLesson launchResultId 引用校验：必须属于同一个 project
 *  - createLesson round-trip + read
 *  - updateLesson 部分 patch 保留 id / createdAt
 *  - updateLesson launchResultId === null 清空
 *  - deleteLesson 成功删除
 *  - listLessonsByProject / listLessonsByLaunch
 *  - generateLessonDraftForLaunch 返回带 projectId / launchResultId 的预填草稿
 */

import { describe, it, expect } from 'vitest';
import {
  createLesson,
  getLesson,
  listLessons,
  listLessonsByProject,
  listLessonsByLaunch,
  updateLesson,
  deleteLesson,
  generateLessonDraftForLaunch,
  LessonServiceError,
} from './lessonService';
import { listMVPProjects } from './mvpProjectService';
import { listLaunchResults } from './launchResultService';
import type { LessonLearned } from '@/types';

const MOCK_NOW = '2026-06-25T12:00:00.000Z';

function genId(): string {
  return `lesson_test_${Math.random().toString(36).slice(2, 8)}`;
}

async function pickExistingProjectId(): Promise<string> {
  const projects = await listMVPProjects();
  expect(projects.length).toBeGreaterThan(0);
  return projects[0]!.id;
}

function makeInput(overrides: Partial<{
  id: string;
  projectId: string;
  launchResultId: string;
}> = {}): Parameters<typeof createLesson>[0] {
  return {
    id: overrides.id ?? genId(),
    projectId: overrides.projectId ?? 'placeholder',
    ...(overrides.launchResultId !== undefined
      ? { launchResultId: overrides.launchResultId }
      : {}),
    whatWorked: 'mock whatWorked',
    whatFailed: 'mock whatFailed',
    why: 'mock why',
    customerInsight: 'mock customerInsight',
    marketInsight: 'mock marketInsight',
    productInsight: 'mock productInsight',
    geoInsight: 'mock geoInsight',
    nextAction: 'mock nextAction',
    scoreModelSuggestion: 'mock scoreModelSuggestion',
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
}

describe('createLesson', () => {
  it('persists a lesson linked to a real project', async () => {
    const projectId = await pickExistingProjectId();
    const id = genId();
    const created = await createLesson(makeInput({ id, projectId }));
    expect(created.id).toBe(id);
    expect(created.projectId).toBe(projectId);
    expect(created.whatWorked).toBe('mock whatWorked');
  });

  it('rejects missing projectId', async () => {
    await expect(createLesson(makeInput({ projectId: '' }))).rejects.toBeInstanceOf(
      LessonServiceError,
    );
  });

  it('rejects unknown projectId', async () => {
    await expect(
      createLesson(makeInput({ projectId: 'mvp_does_not_exist' })),
    ).rejects.toThrow(/MVP project not found/);
  });

  it('rejects empty whatWorked', async () => {
    const projectId = await pickExistingProjectId();
    const input = makeInput({ projectId });
    input.whatWorked = '   ';
    await expect(createLesson(input)).rejects.toThrow(/whatWorked cannot be empty/);
  });

  it('rejects whatWorked > 4000 chars', async () => {
    const projectId = await pickExistingProjectId();
    const input = makeInput({ projectId });
    input.whatWorked = 'a'.repeat(4001);
    await expect(createLesson(input)).rejects.toThrow(/≤ 4000 characters/);
  });

  it('rejects launchResultId that does not belong to the project', async () => {
    const projectId = await pickExistingProjectId();
    const launches = await listLaunchResults();
    const otherLaunch = launches.find((l) => l.mvpProjectId !== projectId);
    if (!otherLaunch) return; // skip if dataset too small
    await expect(
      createLesson(
        makeInput({ projectId, launchResultId: otherLaunch.id }),
      ),
    ).rejects.toThrow(/does not belong to project/);
  });

  it('accepts launchResultId from same project', async () => {
    const projectId = await pickExistingProjectId();
    const launches = await listLaunchResults();
    const sameLaunch = launches.find((l) => l.mvpProjectId === projectId);
    if (!sameLaunch) return; // skip if dataset too small
    const created = await createLesson(
      makeInput({ projectId, launchResultId: sameLaunch.id }),
    );
    expect(created.launchResultId).toBe(sameLaunch.id);
  });
});

describe('listLessons', () => {
  it('returns all lessons sorted by updatedAt desc', async () => {
    const all = await listLessons();
    expect(all.length).toBeGreaterThan(0);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]!.updatedAt <= all[i - 1]!.updatedAt).toBe(true);
    }
  });
});

describe('listLessonsByProject', () => {
  it('filters by projectId', async () => {
    const projects = await listMVPProjects();
    const target = projects[0]!;
    const lessons = await listLessonsByProject(target.id);
    for (const l of lessons) expect(l.projectId).toBe(target.id);
  });
});

describe('listLessonsByLaunch', () => {
  it('filters by launchResultId', async () => {
    const all = await listLessons();
    const withLaunch = all.find((l) => l.launchResultId);
    if (!withLaunch || !withLaunch.launchResultId) return;
    const filtered = await listLessonsByLaunch(withLaunch.launchResultId);
    for (const l of filtered) {
      expect(l.launchResultId).toBe(withLaunch.launchResultId);
    }
  });
});

describe('updateLesson', () => {
  it('preserves id and createdAt on partial patch', async () => {
    const projectId = await pickExistingProjectId();
    const id = genId();
    const created = await createLesson(makeInput({ id, projectId }));
    const updated = await updateLesson(id, {
      whatWorked: 'new whatWorked',
      updatedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.whatWorked).toBe('new whatWorked');
    expect(updated.updatedAt).toBe('2026-06-26T12:00:00.000Z');
  });

  it('clears launchResultId when patch.launchResultId is null', async () => {
    const projectId = await pickExistingProjectId();
    const launches = await listLaunchResults();
    const sameLaunch = launches.find((l) => l.mvpProjectId === projectId);
    if (!sameLaunch) return;
    const id = genId();
    const created = await createLesson(
      makeInput({ id, projectId, launchResultId: sameLaunch.id }),
    );
    expect(created.launchResultId).toBe(sameLaunch.id);
    const cleared = await updateLesson(id, {
      launchResultId: null,
      updatedAt: MOCK_NOW,
    });
    expect(cleared.launchResultId).toBeUndefined();
  });

  it('rejects unknown id', async () => {
    await expect(
      updateLesson('lesson_does_not_exist', {
        whatWorked: 'x',
        updatedAt: MOCK_NOW,
      }),
    ).rejects.toThrow(/not found/);
  });
});

describe('deleteLesson', () => {
  it('removes the record from the store', async () => {
    const projectId = await pickExistingProjectId();
    const id = genId();
    await createLesson(makeInput({ id, projectId }));
    const before = await getLesson(id);
    expect(before?.id).toBe(id);
    await deleteLesson(id);
    const after = await getLesson(id);
    expect(after).toBeUndefined();
  });
});

describe('round-trip', () => {
  it('create + read returns the persisted record', async () => {
    const projectId = await pickExistingProjectId();
    const id = genId();
    const input = makeInput({ id, projectId });
    await createLesson(input);
    const fetched = await getLesson(id);
    expect(fetched?.id).toBe(id);
    expect(fetched?.projectId).toBe(projectId);
    expect(fetched?.whatWorked).toBe('mock whatWorked');
  });
});

describe('generateLessonDraftForLaunch', () => {
  it('returns a prefilled draft bound to the launch', async () => {
    const launches = await listLaunchResults();
    expect(launches.length).toBeGreaterThan(0);
    const launch = launches[0]!;
    const draft: LessonLearned = await generateLessonDraftForLaunch(launch.id);
    expect(draft.projectId).toBe(launch.mvpProjectId);
    expect(draft.launchResultId).toBe(launch.id);
    expect(draft.whatWorked.length).toBeGreaterThan(0);
    expect(draft.nextAction.length).toBeGreaterThan(0);
  });

  it('rejects unknown launchResultId', async () => {
    await expect(
      generateLessonDraftForLaunch('result_does_not_exist'),
    ).rejects.toThrow(/Launch result not found/);
  });
});
