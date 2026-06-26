/**
 * StorageProvider — 持久化抽象。
 *
 * 真实实现接 Supabase（PG）或 KV。MVP 阶段 mock 用内存 Map。
 * 所有 repo（lib/repos/*）的"读 / 写"最终走本接口。
 *
 * 通用表名以领域类型名小写复数表示（'researchTopics' / 'signals' / ...）。
 * 返回值 T 期望是 types/ 下的领域类型。
 */

export interface ListOptions {
  limit?: number;
  offset?: number;
  /** 简单等值过滤，key 对应字段名，value 限定基本类型。 */
  filter?: Record<string, string | number | boolean>;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export interface StorageProvider {
  health(): Promise<{ ok: boolean; detail?: string }>;

  get<T>(table: string, id: string): Promise<T | null>;

  list<T>(table: string, opts?: ListOptions): Promise<ListResult<T>>;

  insert<T extends { id: string }>(table: string, record: T): Promise<T>;

  update<T extends { id: string }>(
    table: string,
    id: string,
    patch: Partial<T>,
  ): Promise<T>;

  delete(table: string, id: string): Promise<void>;
}
