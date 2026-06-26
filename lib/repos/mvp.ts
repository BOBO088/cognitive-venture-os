/**
 * MVP 仓储：MVPProject / LaunchResult 查询入口。
 *
 * MVPProject 写入（create / update / delete）由 service 层管理（验证 +
 * opportunityId 引用一致性 + 财务字段边界）。LaunchResult / LessonLearned
 * 的查询在另两个文件（lib/repos/mvp.ts 已含 LaunchResult，learning.ts 含 Lesson）。
 *
 * 注：MVPProject 不再持有 launchResultIds / lessonIds 列表；下游实体通过
 * mvpProjectId 反查。
 */

import { mockMVPProjects, mockLaunchResults } from '@/mock-data/mvp-projects';
import type { MVPProject, LaunchResult, MVPStage } from '@/types';

/* ----------------- MVPProject ----------------- */

export async function listMVPProjects(): Promise<MVPProject[]> {
  return mockMVPProjects;
}

export async function getMVPProject(id: string): Promise<MVPProject | undefined> {
  return mockMVPProjects.find((m) => m.id === id);
}

export async function listMVPProjectsByStage(
  stage: MVPStage,
): Promise<MVPProject[]> {
  return mockMVPProjects.filter((m) => m.stage === stage);
}

/** 按 opportunity 反查已派生的 MVPProject（用于 /opportunities/[id] 显示）。 */
export async function listMVPProjectsByOpportunity(
  opportunityId: string,
): Promise<MVPProject[]> {
  return mockMVPProjects.filter((m) => m.opportunityId === opportunityId);
}

/** 在内存中追加一条 MVPProject。返回插入后的对象。 */
export async function insertMVPProject(
  project: MVPProject,
): Promise<MVPProject> {
  mockMVPProjects.push(project);
  return project;
}

/** 在内存中更新一条 MVPProject。返回更新后的对象；找不到返回 undefined。 */
export async function updateMVPProjectInStore(
  id: string,
  patch: Partial<MVPProject>,
): Promise<MVPProject | undefined> {
  const i = mockMVPProjects.findIndex((m) => m.id === id);
  if (i < 0) return undefined;
  const next: MVPProject = {
    ...mockMVPProjects[i]!,
    ...patch,
    id: mockMVPProjects[i]!.id,
  };
  mockMVPProjects[i] = next;
  return next;
}

/** 在内存中删除一条 MVPProject。返回是否成功。 */
export async function deleteMVPProjectFromStore(id: string): Promise<boolean> {
  const i = mockMVPProjects.findIndex((m) => m.id === id);
  if (i < 0) return false;
  mockMVPProjects.splice(i, 1);
  return true;
}

/* ----------------- LaunchResult ----------------- */

export async function listLaunchResults(): Promise<LaunchResult[]> {
  return mockLaunchResults;
}

/** 按时间升序返回某 MVP 的所有 launch，便于看迭代轨迹。 */
export async function listLaunchResultsByMVP(
  mvpProjectId: string,
): Promise<LaunchResult[]> {
  return mockLaunchResults
    .filter((r) => r.mvpProjectId === mvpProjectId)
    .sort((a, b) => a.launchDate.localeCompare(b.launchDate));
}

export async function listLaunchResultsSorted(): Promise<LaunchResult[]> {
  return [...mockLaunchResults].sort((a, b) =>
    b.launchDate.localeCompare(a.launchDate),
  );
}

export async function getLaunchResult(
  id: string,
): Promise<LaunchResult | undefined> {
  return mockLaunchResults.find((r) => r.id === id);
}

export async function insertLaunchResult(
  result: LaunchResult,
): Promise<LaunchResult> {
  mockLaunchResults.push(result);
  return result;
}

export async function updateLaunchResultInStore(
  id: string,
  patch: Partial<LaunchResult>,
): Promise<LaunchResult | undefined> {
  const i = mockLaunchResults.findIndex((r) => r.id === id);
  if (i < 0) return undefined;
  const next: LaunchResult = {
    ...mockLaunchResults[i]!,
    ...patch,
    id: mockLaunchResults[i]!.id,
  };
  mockLaunchResults[i] = next;
  return next;
}

export async function deleteLaunchResultFromStore(
  id: string,
): Promise<boolean> {
  const i = mockLaunchResults.findIndex((r) => r.id === id);
  if (i < 0) return false;
  mockLaunchResults.splice(i, 1);
  return true;
}
