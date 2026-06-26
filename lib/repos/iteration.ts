/**
 * Iteration 仓储：PromptVersion + LoopVersion + ImprovementLog 查询 + 写入入口。
 *
 * 3 个 entity 共享一个 mock 存储但提供各自独立 API，便于 service 层做引用校验。
 * 写入（create / update / delete）由 service 层管理（验证 + 字段长度 + 引用一致性）。
 */

import {
  mockPromptVersions,
  mockLoopVersions,
  mockImprovementLogs,
} from '@/mock-data/iteration';
import type {
  PromptVersion,
  LoopVersion,
  ImprovementLog,
  PromptType,
} from '@/types';

/* ============================================================
 * PromptVersion
 * ============================================================ */

export async function listPromptVersions(): Promise<PromptVersion[]> {
  return mockPromptVersions;
}

export async function listPromptVersionsSorted(): Promise<PromptVersion[]> {
  return [...mockPromptVersions].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listPromptVersionsByType(
  type: PromptType,
): Promise<PromptVersion[]> {
  return mockPromptVersions
    .filter((p) => p.type === type)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listPromptVersionsByName(
  name: string,
): Promise<PromptVersion[]> {
  return mockPromptVersions
    .filter((p) => p.name === name)
    .sort((a, b) => a.version - b.version);
}

export async function getPromptVersion(
  id: string,
): Promise<PromptVersion | undefined> {
  return mockPromptVersions.find((p) => p.id === id);
}

/** 找 (type, name) 下的下一个 version 号：max(existing.version) + 1，从 1 开始。 */
export async function getNextPromptVersion(
  type: PromptType,
  name: string,
): Promise<number> {
  const same = mockPromptVersions.filter(
    (p) => p.type === type && p.name === name,
  );
  if (same.length === 0) return 1;
  return Math.max(...same.map((p) => p.version)) + 1;
}

export async function insertPromptVersion(
  prompt: PromptVersion,
): Promise<PromptVersion> {
  mockPromptVersions.push(prompt);
  return prompt;
}

export async function updatePromptVersionInStore(
  id: string,
  patch: Partial<PromptVersion>,
): Promise<PromptVersion | undefined> {
  const i = mockPromptVersions.findIndex((p) => p.id === id);
  if (i < 0) return undefined;
  const next: PromptVersion = {
    ...mockPromptVersions[i]!,
    ...patch,
    id: mockPromptVersions[i]!.id,
  };
  mockPromptVersions[i] = next;
  return next;
}

export async function deletePromptVersionFromStore(
  id: string,
): Promise<boolean> {
  const i = mockPromptVersions.findIndex((p) => p.id === id);
  if (i < 0) return false;
  mockPromptVersions.splice(i, 1);
  return true;
}

/* ============================================================
 * LoopVersion
 * ============================================================ */

export async function listLoopVersions(): Promise<LoopVersion[]> {
  return mockLoopVersions;
}

export async function listLoopVersionsSorted(): Promise<LoopVersion[]> {
  return [...mockLoopVersions].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listLoopVersionsByName(
  name: string,
): Promise<LoopVersion[]> {
  return mockLoopVersions
    .filter((l) => l.name === name)
    .sort((a, b) => a.version - b.version);
}

export async function getLoopVersion(
  id: string,
): Promise<LoopVersion | undefined> {
  return mockLoopVersions.find((l) => l.id === id);
}

export async function getNextLoopVersion(name: string): Promise<number> {
  const same = mockLoopVersions.filter((l) => l.name === name);
  if (same.length === 0) return 1;
  return Math.max(...same.map((l) => l.version)) + 1;
}

export async function insertLoopVersion(
  loop: LoopVersion,
): Promise<LoopVersion> {
  mockLoopVersions.push(loop);
  return loop;
}

export async function updateLoopVersionInStore(
  id: string,
  patch: Partial<LoopVersion>,
): Promise<LoopVersion | undefined> {
  const i = mockLoopVersions.findIndex((l) => l.id === id);
  if (i < 0) return undefined;
  const next: LoopVersion = {
    ...mockLoopVersions[i]!,
    ...patch,
    id: mockLoopVersions[i]!.id,
  };
  mockLoopVersions[i] = next;
  return next;
}

export async function deleteLoopVersionFromStore(
  id: string,
): Promise<boolean> {
  const i = mockLoopVersions.findIndex((l) => l.id === id);
  if (i < 0) return false;
  mockLoopVersions.splice(i, 1);
  return true;
}

/* ============================================================
 * ImprovementLog
 * ============================================================ */

export async function listImprovementLogs(): Promise<ImprovementLog[]> {
  return mockImprovementLogs;
}

export async function listImprovementLogsSorted(): Promise<ImprovementLog[]> {
  return [...mockImprovementLogs].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listImprovementLogsByTarget(
  targetId: string,
): Promise<ImprovementLog[]> {
  return mockImprovementLogs
    .filter((l) => l.targetId === targetId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getImprovementLog(
  id: string,
): Promise<ImprovementLog | undefined> {
  return mockImprovementLogs.find((l) => l.id === id);
}

export async function insertImprovementLog(
  log: ImprovementLog,
): Promise<ImprovementLog> {
  mockImprovementLogs.push(log);
  return log;
}

export async function updateImprovementLogInStore(
  id: string,
  patch: Partial<ImprovementLog>,
): Promise<ImprovementLog | undefined> {
  const i = mockImprovementLogs.findIndex((l) => l.id === id);
  if (i < 0) return undefined;
  const next: ImprovementLog = {
    ...mockImprovementLogs[i]!,
    ...patch,
    id: mockImprovementLogs[i]!.id,
  };
  mockImprovementLogs[i] = next;
  return next;
}

export async function deleteImprovementLogFromStore(
  id: string,
): Promise<boolean> {
  const i = mockImprovementLogs.findIndex((l) => l.id === id);
  if (i < 0) return false;
  mockImprovementLogs.splice(i, 1);
  return true;
}
