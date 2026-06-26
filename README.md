# Cognitive Venture OS

> AI-native operating system for cognitive ventures.
> MVP 阶段：本地 mock 数据层 + 4 provider + 8 connector + 71 路由 + 268 个单测全绿。

## 1. 项目目标

把每一次 venture / research / opportunity / MVP / launch / lesson 变成可追踪、可回放、可迭代的资产。
MVP 阶段不接真实外部服务，所有能力通过 provider / connector 接口封装，零业务改动切到真实 SDK。

## 2. 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 框架 | Next.js（App Router，SSG + 动态） | 15.x |
| 渲染 | React | 19.x |
| 语言 | TypeScript `strict: true` | 5.6 |
| 样式 | Tailwind CSS（CSS 变量主题） | 3.4 |
| 测试 | Vitest | 2.1 |
| Lint | ESLint 9 flat config | 9.x |
| 路径别名 | `@/*` | — |

无数据库、无后端运行时——MVP 阶段纯前端 + mock service 接口。

## 3. 快速开始

```bash
npm install
cp .env.example .env.local   # 可选，所有 key 留空也能跑
npm run dev                  # http://localhost:3000
```

## 4. 脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 跑产线包（`next start`） |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest（单次） |

## 5. 目录结构

```
app/                Next.js App Router（71 路由）
components/
  layout/           Shell / Sidebar / Topbar
  ui/               Card / Badge / Stat / Button
  dashboard/        dashboard widgets
  <domain>/         每个域一组组件（research / graph / opportunities / mvp / geo / learning）
lib/
  cn.ts env.ts
  providers/        Provider + Connector 接口 + mock 实现（见 §6）
  services/         业务 service 层（每个域一个，UI 不直接碰 mock）
  repos/            append-only in-memory repo
mock-data/          8 个域的 mock 数据
types/              15 个域的纯类型
```

完整路由表见 [PROJECT_MAP.md](PROJECT_MAP.md)，数据流见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 6. Provider / Connector

| 类型 | 数量 | 路径 |
|---|---|---|
| Provider（AI / 评分） | 4 | `lib/providers/{llm,research,geo,evaluation}.ts` |
| Connector（外部数据源） | 8 | `lib/providers/connectors/{data-source,source,github,mcp,storage,launch-metrics,citation-monitor,signal-source}.ts` |
| Mock 实现 | 12 | `lib/providers/mock/...` |

工厂函数全部从 `lib/providers` 单点导出；`getAllProvidersHealth()` 聚合 12 个 health 返回。

## 7. 数据流

```
Page (RSC)
  └─ import { xxxService } from '@/lib/services'
       └─ 业务规则校验 + append-only 写入
            └─ lib/repos (in-memory append-only)
                 └─ mock-data/ 初始数据
```

未来切到 Supabase：只改 `lib/repos/<domain>.ts` 内的实现，UI + service 零改动。

## 8. 当前状态

- [x] 71 路由 + Layout + Dashboard
- [x] UI primitives + 8 域组件
- [x] 4 provider + 8 connector 接口 + 12 mock 实现
- [x] mock 数据层（8 域，~150 条种子数据，全部跨表引用通过验证）
- [x] 268 个单元测试
- [ ] 真实 Supabase 接入
- [ ] 真实 OpenAI 接入
- [ ] 真实 MCP 接入
- [ ] 真实 GitHub 接入

## 9. 文档索引

- [AGENTS.md](AGENTS.md) — agent 工作守则
- [ARCHITECTURE.md](ARCHITECTURE.md) — 架构与决策
- [PROJECT_MAP.md](PROJECT_MAP.md) — 现状速查
- [CODEBASE_RISKS.md](CODEBASE_RISKS.md) — 已知风险
- [DATA_MODEL.md](DATA_MODEL.md) — 数据模型
- [DEPLOYMENT.md](DEPLOYMENT.md) — 部署手册
- [PROVIDER_ARCHITECTURE.md](PROVIDER_ARCHITECTURE.md) — provider/connector 详细
