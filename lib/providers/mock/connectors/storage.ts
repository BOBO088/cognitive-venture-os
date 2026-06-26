/**
 * Mock StorageProvider — 内存 Map 实现。
 *
 * 与 mock-data 解耦：所有数据在 storage 内部维护，跨调用一致。
 * 切到 Supabase 时只换实现；repos（lib/repos/*）保持签名不变。
 */

import type {
  StorageProvider,
  ListOptions,
  ListResult,
} from '../../connectors/storage';

const MOCK_NOW = '2026-06-25T00:00:00.000Z';

type Table = Record<string, { id: string } & Record<string, unknown>>;

const tables: Map<string, Table> = new Map();

function getTable(name: string): Table {
  let t = tables.get(name);
  if (!t) {
    t = {};
    tables.set(name, t);
  }
  return t;
}

function matches(value: unknown, filter: Record<string, string | number | boolean>): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  for (const [k, expected] of Object.entries(filter)) {
    if (v[k] !== expected) return false;
  }
  return true;
}

export function createMockStorageProvider(): StorageProvider {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async get<T>(table: string, id: string) {
      const t = getTable(table);
      return (t[id] as T | undefined) ?? null;
    },

    async list<T>(table: string, opts?: ListOptions) {
      const t = getTable(table);
      let items = Object.values(t) as T[];
      if (opts?.filter) {
        items = items.filter((it) => matches(it, opts.filter!));
      }
      const total = items.length;
      const start = opts?.offset ?? 0;
      const end = opts?.limit !== undefined ? start + opts.limit : items.length;
      return { items: items.slice(start, end), total } satisfies ListResult<T>;
    },

    async insert<T extends { id: string }>(table: string, record: T) {
      const t = getTable(table);
      const withTimestamps = {
        ...record,
        createdAt: (record as { createdAt?: string }).createdAt ?? MOCK_NOW,
        updatedAt: (record as { updatedAt?: string }).updatedAt ?? MOCK_NOW,
      } as T;
      t[record.id] = withTimestamps as unknown as { id: string } & Record<string, unknown>;
      return withTimestamps;
    },

    async update<T extends { id: string }>(
      table: string,
      id: string,
      patch: Partial<T>,
    ) {
      const t = getTable(table);
      const existing = t[id];
      if (!existing) {
        throw new Error(`[mock storage] record not found: ${table}#${id}`);
      }
      const merged = {
        ...existing,
        ...patch,
        id,
        updatedAt: MOCK_NOW,
      } as unknown as T;
      t[id] = merged as unknown as { id: string } & Record<string, unknown>;
      return merged;
    },

    async delete(table: string, id: string) {
      const t = getTable(table);
      delete t[id];
    },
  };
}

/** 测试 / 调试用：清空所有表。 */
export function __resetMockStorage(): void {
  tables.clear();
}
