/**
 * Repos 总入口。
 *
 * 页面 / API route 永远通过这里读数据，**不直接 import mock-data**。
 * 切到 Supabase 时只改各 repo 文件的函数体，UI 与 API 零改动。
 *
 * 设计原则：
 *   - 当前实现 = 各 domain 文件直接读写 `mock-data/*.ts` 数组
 *   - service 层只 import 本文件（不直接 import `./research` 等子文件）
 *   - 切到真实后端：每个 domain repo 内部加 env 分支
 *     （参考 DATABASE.md §6 的迁移路径）
 */

export * from './research';
export * from './knowledge-graph';
export * from './opportunities';
export * from './mvp';
export * from './learning';
export * from './iteration';
export * from './geo';
export * from './tasks';
export * from './prd';
