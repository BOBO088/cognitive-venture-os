/**
 * 类型总入口：所有领域类型的 barrel export。
 *
 * 域划分（11 个）：
 * - research    研究主题、资料、卡片
 * - graph       知识图谱节点和边
 * - opportunity 信号、机会、评估
 * - mvp         MVP 项目
 * - learning    上线结果、复盘
 * - iteration   Prompt / Loop / Improvement 版本
 * - geo         GEO 品牌、查询、内容资产、引用检查
 * - prd         PRD 草稿
 * - codexTasks  Codex 任务板条目
 * - task        通用 task 模型
 */

// 研究域
export * from './research';

// 图谱域
export * from './graph';

// 机会域
export * from './opportunity';

// PRD 域（依赖 MVP 类型）
export * from './prd';

// MVP 域
export * from './mvp';

// Learning 域
export * from './learning';

// Iteration 域
export * from './iteration';

// 通用 task 模型
export * from './task';

// Codex 任务板
export * from './codexTasks';

// GEO 域
export * from './geo';
