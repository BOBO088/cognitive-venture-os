# ARCHITECTURE — Cognitive Venture OS

> 架构与决策记录。**基于 2026-06-26 当天代码**。

## 1. 系统边界

**在范围内：**
- 单仓库 Next.js 应用，71 路由（RSC 优先 + 动态 fallback）
- 13 个业务 service 层（每域 1 个，UI 不直接碰 mock）
- 12 个 Provider / Connector 接口 + 12 个 mock 实现
- 8 域 mock 数据 + 21 域纯类型

**不在范围内（预留）：**
- 真实后端服务（无 `app/api/`、无数据库连接）
- 任何多用户隔离 / 鉴权
- 实时通信（无 SSE / WebSocket / polling）

## 2. 渲染模型

| 组件层 | 形态 | 数量（估） |
|---|---|---|
| `app/layout.tsx` | RSC | 1 |
| `app/page.tsx` | RSC | 1 |
| 域详情页 `[id]/page.tsx` | RSC | 22 |
| 域列表 / 新建页 | RSC | ~30 |
| 域 action `actions.ts` | **Server Action** | ~13 |
| `components/layout/Sidebar.tsx` | **Client** | 1（用 `usePathname()`） |
| 其他 `components/*` | RSC | ~50 |

**结论：** 绝大多数组件是 RSC，首屏 JS bundle 102 kB（共享），最大单页 116 kB。

## 3. 数据流

```
浏览器 GET /research/topics/topic_geo_market_2026
  └─ Next.js RSC
       └─ app/research/topics/[id]/page.tsx render
            └─ await getResearchTopic('topic_geo_market_2026')
                 └─ lib/services/researchTopicService.ts
                      └─ lib/repos/researchTopicRepo.ts  (in-memory append-only)
                           └─ mock-data/research.ts 种子
       └─ HTML 返回浏览器
            └─ Sidebar hydrate（active 高亮）
```

**特点：**
- 异步链路（`async/await`）
- 写入通过 Server Action → service → repo
- 客户端不持任何业务状态

## 4. 三层架构

```
┌────────────────────────────────────────────────────────────┐
│  app/  (Page, RSC)                                         │
│  └─ 不直接 import mock-data，只 import service             │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  lib/services/<domain>Service.ts                           │
│  └─ 业务规则：限长 / 引用一致性 / 必填校验                │
│  └─ 调 lib/repos / lib/providers                          │
└────────────────────────────────────────────────────────────┘
                          ↓           ↓
┌────────────────────────────┐  ┌────────────────────────────┐
│  lib/repos/<domain>.ts     │  │  lib/providers/*           │
│  append-only in-memory     │  │  12 工厂 + mock 实现       │
│  未来换成 Supabase 客户端  │  │  未来换成真实 SDK           │
└────────────────────────────┘  └────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  mock-data/<domain>.ts + types/<domain>.ts                 │
└────────────────────────────────────────────────────────────┘
```

**为什么三层：**
- UI 改版 → 不动 service / repo / provider
- 业务规则变 → 不动 UI / repo / provider
- 切真实 SDK → 不动 UI / service
- 切真实数据库 → 不动 UI / service / provider

## 5. Provider / Connector 模式

12 个工厂（`lib/providers/index.ts`）统一为同一模式：

```ts
let _x: X | null = null;
export async function getX(): Promise<X> {
  if (!_x) _x = createMockX();
  return _x;
}
```

`getAllProvidersHealth()` 聚合 12 个 health 入口给 `app/page.tsx` 的 SystemStatus 用。

**4 个 Provider：** LLM / Research / GEO / Evaluation（都是 AI 类）
**8 个 Connector：** DataSource / Source / GitHub / MCP / Storage / LaunchMetrics / CitationMonitor / SignalSource（都是外部数据源）

接入真实 SDK 时：只改 `lib/providers/<name>.ts` 的工厂函数体，UI 零改动。

## 6. 样式系统

**双层：**
1. **CSS 变量**（`app/globals.css`）— 10 个 RGB 三元组：`--bg / --panel / --panel-2 / --border / --text / --muted / --accent / --ok / --warn / --danger`
2. **Tailwind 主题扩展**（`tailwind.config.ts`）— `bg-bg / text-text / border-border / ...` + `<alpha-value>` 占位符

切主题 = 改 10 个变量，不动任何组件。

## 7. 关键设计决策

| 决策 | 理由 |
|---|---|
| App Router + RSC | 静态优先，JS bundle 小 |
| append-only repo | MVP 阶段不接 DB；append-only 简化"上次状态"问题 |
| `lib/providers` 12 工厂统一模式 | 切真实 SDK 时一处改，零业务改动 |
| UI 不直接 import mock | 测试时可替换 service 注入 |
| `app/error.tsx` 缺失 | P1 项；接入真实 DB 后必加 |
| 暗色主题硬编码，无 light mode | MVP 阶段 |
| 移动端 Sidebar hidden | MVP 阶段 |
