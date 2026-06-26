/**
 * PRD 仓储：PRD 查询入口。
 *
 * 写入（create / update / delete）由 service 层管理（验证 + mvpProjectId
 * 引用一致性 + version 递增）。
 */

import { mockPRDs } from '@/mock-data/prd';
import type { PRD } from '@/types';

export async function listPRDs(): Promise<PRD[]> {
  return mockPRDs;
}

/** 读取全量并按 updatedAt desc 排。 */
export async function listPRDsSorted(): Promise<PRD[]> {
  return [...mockPRDs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPRD(id: string): Promise<PRD | undefined> {
  return mockPRDs.find((p) => p.id === id);
}

/** 按 MVPProject 反查所有 PRD（同一 mvp 下的多版本）。 */
export async function listPRDsByMVP(mvpProjectId: string): Promise<PRD[]> {
  return mockPRDs
    .filter((p) => p.mvpProjectId === mvpProjectId)
    .sort((a, b) => b.version - a.version);
}

/** 返回该 MVPProject 下一个可用 version（= max(existing) + 1；无 existing 时 = 1）。 */
export async function getNextVersionForMVP(
  mvpProjectId: string,
): Promise<number> {
  const list = mockPRDs.filter((p) => p.mvpProjectId === mvpProjectId);
  if (list.length === 0) return 1;
  return Math.max(...list.map((p) => p.version)) + 1;
}

/** 按 id + version 精确取一条；用于 service 在创建时校验不重号。 */
export async function getPRDByMVPAndVersion(
  mvpProjectId: string,
  version: number,
): Promise<PRD | undefined> {
  return mockPRDs.find(
    (p) => p.mvpProjectId === mvpProjectId && p.version === version,
  );
}

/** 在内存中追加一条 PRD。返回插入后的对象。 */
export async function insertPRD(prd: PRD): Promise<PRD> {
  mockPRDs.push(prd);
  return prd;
}

/** 在内存中更新一条 PRD。返回更新后的对象；找不到返回 undefined。 */
export async function updatePRDInStore(
  id: string,
  patch: Partial<PRD>,
): Promise<PRD | undefined> {
  const i = mockPRDs.findIndex((p) => p.id === id);
  if (i < 0) return undefined;
  const next: PRD = { ...mockPRDs[i]!, ...patch, id: mockPRDs[i]!.id };
  mockPRDs[i] = next;
  return next;
}

/** 在内存中删除一条 PRD。返回是否成功。 */
export async function deletePRDFromStore(id: string): Promise<boolean> {
  const i = mockPRDs.findIndex((p) => p.id === id);
  if (i < 0) return false;
  mockPRDs.splice(i, 1);
  return true;
}
