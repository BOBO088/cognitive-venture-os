# PROJECT_MAP — Cognitive Venture OS

> 现状速查。**基于 2026-06-26 当天代码扫描**。
> 项目位置：`/Users/mima0000/Documents/基础工程系统/cognitive-venture-os/`

## 1. 技术栈

| 层 | 选型 | 版本 | 证据 |
|---|---|---|---|
| Web 框架 | Next.js（App Router） | 15.5 | `package.json`、`app/` |
| 渲染 | React | 19.x | `package.json` |
| 语言 | TypeScript `strict: true` | 5.6 | `tsconfig.json` |
| 样式 | Tailwind CSS + CSS 变量主题 | 3.4 | `tailwind.config.ts`、`app/globals.css` |
| 工具 | clsx + tailwind-merge | latest | `lib/cn.ts` |
| 测试 | Vitest | 2.1 | `vitest.config.ts` |
| Lint | ESLint 9 + `@next/eslint-plugin-next` | 9.x | `eslint.config.mjs` |
| 路径别名 | `@/*` → `./*` | — | `tsconfig.json` paths |

**无数据库、无后端运行时。** 数据层 = 纯内存 append-only repo + mock-data 种子。

## 2. 目录结构

```
cognitive-venture-os/
├── app/                                # 71 路由 (RSC 优先)
│   ├── layout.tsx / page.tsx / globals.css / not-found.tsx
│   ├── codex-tasks/  geo/  graph/  learning/  mvp/
│   ├── opportunities/  prd/  research/  tasks/
│   ├── agents/  integrations/  settings/  ventures/   # 占位
│
├── components/
│   ├── layout/   Shell / Sidebar / Topbar
│   ├── ui/       Card / Badge / Stat / Button
│   ├── dashboard/  StatGrid / ActivityFeed / SystemStatus / QuickActions
│   ├── research/  graph/  opportunities/  mvp/  geo/  learning/  codex-tasks/
│
├── lib/
│   ├── cn.ts  cn.test.ts               # className 工具 + 3 个测试
│   ├── env.ts                          # 集中读 5 个 env key
│   ├── providers/                      # 4 Provider + 8 Connector
│   │   ├── {llm,research,geo,evaluation}.ts        # Provider 接口
│   │   ├── connectors/                 # 8 个 Connector 接口
│   │   ├── mock/                       # 12 个 mock 实现
│   │   ├── index.ts                    # 12 个工厂 + getAllProvidersHealth()
│   │   └── index.test.ts               # 4 个契约测试
│   ├── services/                       # 13 个业务 service（每域 1 个 + prd + codexTaskGenerator）
│   │   └── *.test.ts                   # 13 个 service 测试文件，264 用例
│   └── repos/                          # append-only in-memory repo
│
├── mock-data/                          # 8 个域的种子数据
│   ├── tasks.ts  research.ts  opportunities.ts  mvp-projects.ts
│   ├── knowledge-graph.ts  geo.ts  learning.ts  dashboard.ts
│
├── types/                              # 15 个域的纯类型 + index.ts 汇总
│
├── public/  .gitignore  .env.example  README.md
├── ARCHITECTURE.md  AGENTS.md  CODEBASE_RISKS.md  DATA_MODEL.md
├── DEPLOYMENT.md  PROVIDER_ARCHITECTURE.md  PROJECT_MAP.md
├── next.config.ts  postcss.config.mjs  tailwind.config.ts
├── tsconfig.json  eslint.config.mjs  vitest.config.ts
├── next-env.d.ts  package.json  package-lock.json
```

**统计：**
- 71 路由（`find app -name 'page.tsx' -o -name 'route.ts' | wc -l`）
- 14 个测试文件 / 268 个测试用例
- 12 个 Provider / Connector 工厂
- 13 个业务 service

## 3. 核心业务模块

| 域 | 类型 | mock 条数 | service | 路由数 |
|---|---|---|---|---|
| Research Topic | `ResearchTopic` | 7 | `researchTopicService` | 3 |
| Source | `SourceItem` | 7 | `sourceService` | 3 |
| Research Card | `ResearchCard` | 8 | `researchCardService` | 3 |
| Graph Entity | `GraphEntity` | 32 | `graphEntityService` | 3 |
| Graph Relation | `GraphRelation` | 17 | `graphRelationService` | 3 |
| Signal | `Signal` | 15 | `signalService` | 3 |
| Opportunity | `Opportunity` | 6 | `opportunityService` | 3 |
| Evaluation | `OpportunityEvaluation` | 7 | `evaluationService` | 2 |
| MVP Project | `MVPProject` | 7 | `mvpProjectService` | 4 |
| Launch Result | `LaunchResult` | 5 | `launchResultService` | 3 |
| Lesson | `LessonLearned` | 8 | `lessonService` | 3 |
| Prompt Version | `PromptVersion` | 5 | `promptVersionService` | 1 |
| Loop Version | `LoopVersion` | 4 | `loopVersionService` | 1 |
| Improvement Log | `ImprovementLog` | 6 | `improvementLogService` | 1 |
| Brand Entity | `BrandEntityProfile` | 6 | `geoBrandService` | 3 |
| AI Query Bank | `AIQueryBankItem` | 8 | `aiQueryService` | 3 |
| Content Asset | `ContentAsset` | 6 | `contentAssetService` | 3 |
| GEO Audit | `GEOAudit` | 5 | `geoOptimizerService` | 1 |
| Citation Check | `AICitationCheck` | 22 | `citationMonitorService` | 3 |
| Codex Task | `Task` | 6 | (mock 直读) | 3 |
| PRD | — | — | `prdService` + `codexTaskGeneratorService` | 2 |

**总计：21 域、~180 条 mock 记录、13 个 service、71 路由。**

## 4. 数据流

```
Page (RSC)
  └─ import { xxxService } from '@/lib/services'
       └─ 业务规则校验（限长 / 引用一致性 / 必填字段）
            └─ lib/repos/<domain>.ts   (append-only in-memory)
                 └─ mock-data/<domain>.ts   初始种子
```

未来切到 Supabase：只改 `lib/repos/<domain>.ts` 内的实现，UI + service 零改动。

## 5. API 结构

**当前无 API 路由**（`app/api/` 不存在）。所有能力由 RSC 直调 service 层。
计划中的 API 路由（接入真实 provider 后）：
- `app/api/providers/health/route.ts` — 返回 `getAllProvidersHealth()`
- `app/api/<domain>/route.ts` — 每个域的 CRUD（仅在接入 Supabase 后启用）

## 6. 构建命令

```bash
npm run build          # next build
npm run start          # next start (产线包)
npm run dev            # next dev
```

构建产物：71 路由（混合 `○` Static + `ƒ` Dynamic），共享 First Load JS 102 kB。

## 7. 测试命令

```bash
npm run test           # vitest run (14 文件, 268 用例, ~1s)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
```

## 8. 当前项目风险

详见 [CODEBASE_RISKS.md](CODEBASE_RISKS.md)。

## 9. 适合交给 Codex 自动开发的 30 个任务

按 R-7 重做 Dashboard 之后，**最新任务池**见 `codex-tasks/board` 路由。

按优先级排序的常驻 backlog：

1. R-7：根 `/` Dashboard 联通 71 路由
2. R-1：删除 `services/` 死代码（4 个 stub provider）
3. 接入真实 Supabase（替换 `lib/repos/<domain>.ts`）
4. 接入真实 OpenAI Provider（替换 `lib/providers/llm.ts` 实现）
5. 接入真实 GitHub Connector（替换 `lib/providers/connectors/github.ts`）
6. 接入真实 MCP Connector
7. error.tsx 兜底（每条路由的 error boundary）
8. 移动端 Sidebar drawer
9. light mode 主题切换
10. 268 测试覆盖到 mock-data 全部域
