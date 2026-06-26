# CODEBASE_RISKS — Cognitive Venture OS

> 基于 2026-06-26 实际代码扫描。每条标注具体文件 + 行号。
> 优先级：P0 = 阻塞 / 严重正确性；P1 = 重要但可绕过；P2 = 改进。

## P0 — 已在上线前审计中修复

### R-0-1：mock 数据 18 处跨表引用断裂 ✅
- **位置：** `mock-data/opportunities.ts`（18 处 `ent_*` 前缀应为 `entity_*`）+ `mock-data/knowledge-graph.ts`（缺 6 个 GraphEntity 实体）
- **症状：** Signal / Opportunity 详情页显示 `(missing)` 红标。
- **修复：** sed 改 18 处前缀 + 新增 6 个 GraphEntity（Apple / NYT / Princeton GEO / LangChain / TikTok / McKinsey）。
- **验证：** 自写 smoke 脚本扫全量跨表引用，从 18 断链 → 0 断链。

## P1 — 上线后下一轮处理

### R-1-1：根 `/` Dashboard 是初始 4 卡片 stub
- **位置：** `app/page.tsx` + `components/dashboard/*`
- **症状：** 访客进入首页看不到 71 路由入口；`SystemStatus` 文案写死 "4 providers"。
- **影响：** Demo 首次印象与实际项目规模不匹配。
- **修复方向：** R-7 任务，把 Dashboard 改成"7 域入口 + 真实 stats + Provider health 聚合"。

### R-1-2：`services/` 目录 4 个 stub provider 是死代码
- **位置：** `services/{supabase,openai,mcp,github}/index.ts`
- **证据：** `rg "from '@/services"` 在 `app/` / `lib/` / `components/` 内零命中。
- **影响：** 误导新人；占 80+ 行。
- **修复方向：** 直接删除整个 `services/` 目录。

### R-1-3：12 个 Provider / Connector 命名约定不统一
- **位置：** `lib/providers/` 旧版本命名混杂（`getSourceConnector` 不在 health 聚合）
- **状态：** 已在 R-2/R-3 修复（添加 `getSignalSourceConnector` + 把 `SourceConnector` 纳入 `getAllProvidersHealth`）。
- **测试锁：** `lib/providers/index.test.ts` 验证 length=12 + names 顺序。

### R-1-4：缺 `app/error.tsx` 全局错误兜底
- **位置：** `app/` 树
- **症状：** 任一 RSC 抛错会冒到 Next.js 默认错误页。
- **影响：** 接入真实数据后任何 fetch 失败都会破坏 UI。
- **修复方向：** 加 `app/error.tsx`（根）+ 每条域路由的局部 error.tsx。

### R-1-5：缺 `.env.example` 与 `DEPLOYMENT.md`
- **状态：** 已在 R-5/R-6 修复（`lib/env.ts` 列出 5 个 key + Vercel / Docker / Node 三种部署形态）。

### R-1-6：env 变量无启动期校验
- **位置：** `lib/env.ts`
- **证据：** 全部 `?? ''` 兜底，缺 key 不报错。
- **影响：** 接入真实 provider 后配错 key 不会启动失败，要等首次请求。
- **修复方向：** 接入真实 SDK 时改成 zod schema 启动期校验。

### R-1-7：Sidebar active 状态会被子路径误判
- **位置：** `components/layout/Sidebar.tsx`
- **证据：** `pathname.startsWith(item.href)` 会让 `/ventures-old` 高亮 `/ventures`。
- **当前无该路径，未暴露。**
- **修复方向：** 改用 `pathname === item.href || pathname.startsWith(item.href + '/')`。

### R-1-8：SystemStatus / StatGrid 文案硬编码 "4 providers" 与 "/4"
- **位置：** `components/dashboard/SystemStatus.tsx`、`StatGrid.tsx`
- **状态：** 将在 R-7 顺手修（dashboard 重做时改用 `items.length` 与 `systemStatus.length`）。

## P2 — 不阻塞

### R-2-1：移动端 Sidebar 直接 hidden
- **位置：** `components/layout/Sidebar.tsx`
- **症状：** `< md` 视口下导航不可达。
- **修复方向：** 加 drawer / hamburger 菜单。

### R-2-2：暗色主题硬编码，无 light mode
- **位置：** `app/globals.css`
- **症状：** 10 个变量写死暗色值。
- **修复方向：** 加 `prefers-color-scheme` 或切换按钮。

### R-2-3：`eslint-config-next` 是死依赖
- **位置：** `package.json` devDeps
- **证据：** `eslint.config.mjs` 用 `@next/eslint-plugin-next`，未 import `eslint-config-next`。
- **修复方向：** `npm uninstall eslint-config-next`。

### R-2-4：`@vitejs/plugin-react` 是死依赖
- **位置：** `package.json` devDeps
- **证据：** `vitest.config.ts` 未 import；当前测试无 React 组件测试。
- **修复方向：** 加 React 组件测试前先 `npm uninstall`，加测试时再装。

### R-2-5：缺 CHANGELOG
- **位置：** 项目根
- **修复方向：** 后续按需。

### R-2-6：mock 时间戳在 build 时部分冻结
- **位置：** `mock-data/ventures.ts` / `agents.ts` / `activity.ts` 模块顶层 `new Date(...)`
- **症状：** SSG 模式下模块顶层代码 build 时执行一次，部署后"5 分钟前"永远指向 build 时刻的 5 分钟前。
- **当前不阻塞**——这 3 个文件是初始 scaffold 的 4 卡片 Dashboard 使用，R-7 会一并重做。

## 风险地图（修复后状态）

```
                  P0 (阻塞)                P1 (重要)                P2 (改进)
                ┌──────────┐            ┌──────────┐            ┌──────────┐
  数据/服务层   │          │            │ R-1-2    │            │ R-2-3    │
                │          │            │ R-1-6    │            │ R-2-4    │
                ├──────────┤            ├──────────┤            ├──────────┤
  路由/页面层   │          │            │ R-1-1    │            │ R-2-1    │
                │          │            │ R-1-4    │            │ R-2-2    │
                │          │            │          │            │ R-2-5    │
                ├──────────┤            ├──────────┤            ├──────────┤
  组件/UI       │          │            │ R-1-7    │            │          │
                │          │            │ R-1-8    │            │          │
                ├──────────┤            ├──────────┤            ├──────────┤
  工具/构建     │          │            │          │            │ R-2-3    │
                │          │            │          │            │ R-2-4    │
                └──────────┘            └──────────┘            └──────────┘
                  0 条                     7 条                     6 条
```

## 修复顺序

```
已完成 (2026-06-26)：
  R-0-1  P0  跨表引用断裂
  R-1-3  P1  Provider 完整性
  R-1-5  P1  .env.example + DEPLOYMENT.md

下一轮 (按优先级)：
  R-1-1  P1  重做根 Dashboard        ← R-7 任务
  R-1-2  P1  删 services/ 死代码     ← R-1 任务
  R-1-4  P1  error.tsx 兜底
  R-1-6  P1  env zod 校验 (接真实 SDK 时一起做)
  R-1-7  P1  Sidebar active 修复
  R-1-8  P1  dashboard 文案去魔数
  R-2-*  P2  体验打磨
```
