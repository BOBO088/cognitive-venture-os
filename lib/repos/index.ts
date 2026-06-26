/**
 * Repos 总入口。
 *
 * 页面 / API route 永远通过这里读数据，**不直接 import mock-data**。
 * 未来切到 Supabase：只改各 repo 文件的函数体，UI 与 API 零改动。
 */

export * from './research';
export * from './knowledge-graph';
export * from './opportunities';
export * from './mvp';
export * from './geo';
export * from './learning';

export * from './tasks';
