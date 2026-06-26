# AGENTS.md

> Cognitive Venture OS 的 agent 工作守则。
> 基于 2026-06-25 代码扫描。**短、清晰、可执行**——违反任一条 = 任务未完成。

## 1. 项目目标

构建 **AI-native operating system for cognitive ventures**。
MVP 阶段：UI 骨架 + 4 个 provider 接口 + mock 数据。目标是把每次 agent 操作变成可追踪资产。

非目标：现阶段的**真后端**、**用户认证**、**实时通信**——尚未规划。

## 2. 技术栈

| 层 | 选型 | 备注 |
|---|---|---|
| 框架 | Next.js 15 App Router | 静态优先（SSG） |
| 渲染 | React 19 | 默认 RSC |
| 语言 | TypeScript 5 | `strict: true` |
| 样式 | Tailwind CSS 3.4 | 主题走 CSS 变量（`globals.css`） |
| 测试 | Vitest 2 | 当前 `node` 环境 |
| Lint | ESLint 9 flat config | `eslint.config.mjs` |
| 路径别名 | `@/*` | 见 `tsconfig.json` |

详细版本见 `package.json`。

## 3. 目录结构约定

```
app/                  路由 + 页面 (RSC 优先)
components/
  layout/             Shell / Sidebar / Topbar
  ui/                 Card / Badge / Stat / Button
  dashboard/          dashboard widgets
  <domain>/           域组件 (research / graph / opportunities / mvp / geo / learning / codex-tasks)
lib/
  cn.ts env.ts
  providers/          Provider + Connector 接口 + mock 实现（详见 PROVIDER_ARCHITECTURE.md）
  services/           业务 service 层（每个域一个，UI 只 import 这一层）
  repos/              append-only in-memory repo
types/                纯类型, 按域分文件, index.ts 汇总
mock-data/            MVP 数据源, 按域分文件
```

**新文件落位规则：**
- 业务组件 → `components/<scope>/`
- 纯函数 / 工具 → `lib/`
- 领域类型 → `types/<domain>.ts`
- 静态数据 → `mock-data/<domain>.ts`
- 业务 service → `lib/services/<domain>Service.ts`
- in-memory repo → `lib/repos/<domain>.ts`
- Provider / Connector → `lib/providers/<name>.ts`（接口）+ `lib/providers/mock/<name>.ts`（mock 实现）

## 4. 编码规范

- **TypeScript strict**：禁止 `any`、禁止 `@ts-ignore`、禁止未使用局部变量。
- **RSC 优先**：默认 Server Component；只有 hooks / event handler / 浏览器 API 时才加 `'use client'`。
- **不写注释解释 what**：代码自解释；只在解释 *why* 时写注释。
- **import 用 `@/` 别名**，不用相对路径 `../../`。
- **错误处理**：service 层抛具体错误（不返 `null` 当成功），UI 层用 `app/error.tsx` 兜底。
- **service / UI 分离**：`lib/services/*` 内部禁止 `import` 任何 `@/components/*` 或 `react` / `next/*` 客户端依赖。
- **可访问性**：所有交互元素必须可键盘访问，必填 `aria-label`。

## 5. 命名规范

| 对象 | 约定 | 例子 |
|---|---|---|
| 文件 (非组件) | kebab-case | `task-board.ts` |
| React 组件文件 | PascalCase，与 export 同名 | `TaskBoard.tsx` |
| 组件 / 类型 / 接口 | PascalCase | `Venture`, `AgentProvider` |
| Hook | `useXxx` | `useTaskBoard` |
| 枚举值 | 全小写字符串联合 | `'backlog' \| 'doing'` |
| 函数 | camelCase，动词开头 | `getDashboardSnapshot` |
| 常量 | UPPER_SNAKE 仅限真常量 | `MAX_RETRY` |
| CSS 类 | 只用 Tailwind 工具类 | `bg-panel text-text` |

## 6. 数据模型规范

- **`types/` 是单一来源**：所有领域类型在 `types/<domain>.ts` 定义，从 `types/index.ts` 汇总导出。
- **类型与 mock 解耦**：mock 文件 (`mock-data/`) 必须使用 `types/` 的类型，但 mock 不应反向影响类型。
- **加字段流程**：先在 `types/<domain>.ts` 加字段 → mock 补齐 → UI 渲染。
- **时间字段**：全部用 `string`（ISO 8601），不存 `Date` 对象。**禁止在 mock 文件模块顶层用 `new Date()`**（SSG 会冻结，详见 `CODEBASE_RISKS.md` R0-3）。
- **id 字段**：用 `string`，生成用 `crypto.randomUUID()`。
- **不允许**在 `types/` 内放运行时代码——只放 `type` / `interface` / 字面量数组（枚举源）。

## 7. service 层规范

`lib/providers/<name>.ts` 的标准结构（4 个 Provider + 8 个 Connector 共用同一套工厂模式）：

```ts
// 接口
export interface LLMProvider {
  health(): Promise<{ ok: boolean; detail?: string }>;
  // 业务方法...
}

// 工厂 — 缓存单例，调用方零改动切真实实现
let _llm: LLMProvider | null = null;
export async function getLLMProvider(): Promise<LLMProvider> {
  if (!_llm) _llm = createMockLLMProvider();
  return _llm;
}
```

**铁律：**
- 4 个 Provider（LLM / Research / GEO / Evaluation）+ 8 个 Connector（DataSource / Source / GitHub / MCP / Storage / LaunchMetrics / CitationMonitor / SignalSource）— 共 12 个工厂
- 接口与 mock 实现分文件：接口在 `lib/providers/<name>.ts`，mock 在 `lib/providers/mock/<name>.ts`
- `lib/env.ts` 统一读 key，Provider / Connector 内部用 `env.<provider>.<field>`
- **Provider / Connector 内不导入任何 UI 组件 / React 依赖**
- Provider / Connector 内**不直接调裸 `fetch` / `axios`**——用对应 SDK（`@supabase/supabase-js` / `openai` / `@modelcontextprotocol/sdk` / `octokit`）
- 失败时抛带上下文的错误（`Error('LLM generateResearchCard failed: ...')`），不返 `null`
- UI / service 只能从 `@/lib/providers` 导入工厂函数 — **禁止直接 import SDK**
- `getAllProvidersHealth()` 聚合 12 个 health，dashboard SystemStatus 用它做总览

## 8. mock provider 规范

当前 12 个 provider / connector 全部是 mock：
- `health()` 全部返回 `{ ok: true, detail: 'mock' }`（**不代表真实连通**）
- mock 数据从 `mock-data/<domain>.ts` 读，不在 provider 内部硬编码

**接入真实 SDK 的标准流程：**
1. 装 SDK：`npm i <package>`（在 `package.json` 显式记录）
2. `lib/env.ts` 加 key 读取（如未加），并加 `.env.example` 一行
3. 在 `lib/providers/mock/<name>.ts` 旁加 `lib/providers/real/<name>.ts`（真实实现）
4. 改 `lib/providers/index.ts` 的工厂函数体：根据 `env` 选择 mock / real
5. 跑 `lib/providers/index.test.ts` — `getAllProvidersHealth()` 必须仍返回 12 条

**mock 数据 vs mock provider：**
- `mock-data/` = 领域种子数据
- `lib/services/<domain>Service.ts` 调 `lib/repos/<domain>.ts` 读写
- `lib/providers/<name>.ts` = 能力接口（AI 生成 / 外部抓取），与 `lib/services` 是两层
- **不要**在 service 文件里写 mock provider；**不要**在 provider 文件里写领域数据

## 9. 测试命令

```bash
npm run test           # vitest run (单次, CI 友好)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
```

**测试覆盖规则：**
- `lib/`、`services/`、`mock-data/` 内新增的纯函数**必须有测试**
- 测试文件命名：`<source>.test.ts`，与源文件同目录
- 当前 vitest 用 `node` 环境，**不支持** jsdom 下的组件测试——加 React 组件测试时**先在 `vitest.config.ts` 加 `environment: 'jsdom'` + 装 `@testing-library/react`**
- service 的 health / 业务方法必须有测试
- `lib/providers/index.test.ts` 锁定 12 个工厂可用 + `getAllProvidersHealth()` 聚合 12 条

## 10. build 命令

```bash
npm run build          # next build (SSG)
npm run start          # 跑产线包
```

**build 前必须通过：**
- `npm run lint` 0 错 0 警
- `npm run typecheck` 0 错
- `npm run test` 全绿
- 新增页面在 build 输出里出现，且保持 `○` (Static) 标识——**不允许**意外变成 `λ` (Server Function) 或 `f` (Client-only fetch)

## 11. 禁止修改的目录

| 路径 | 原因 |
|---|---|
| `node_modules/` | 依赖目录 |
| `.next/` | Next.js 构建产物 |
| `out/`、`dist/` | 构建产物 |
| `package-lock.json` | 仅在加/删依赖时由 npm 自动改；**禁止手动编辑** |
| `tsconfig.tsbuildinfo`、`next-env.d.ts` | 编译器/Next 自动生成 |
| `.git/` | 版本控制目录 |

**修改前需要人工确认的（不可"顺手"改）：**
- `types/` 公共类型
- `lib/providers/<name>.ts` 接口契约（修改 = 12 个工厂 + health 聚合测试要同步）
- `lib/services/<domain>Service.ts` 业务规则（修改 = 对应 service 测试要同步）
- `next.config.ts` / `tsconfig.json` / `tailwind.config.ts` / `eslint.config.mjs` / `vitest.config.ts`
- `app/layout.tsx`（影响所有页面）

## 12. Definition of Done

每次任务完成**必须全部满足**，缺一不可：

- [ ] **代码能编译**（`npm run build` 通过）
- [ ] **lint 通过**（`npm run lint` 0 错 0 警）
- [ ] **build 通过**（同上）
- [ ] **不修改无关文件**（"顺手"重构 = 不通过）
- [ ] **新功能有 mock 数据**（`mock-data/` 有对应条目，类型与 `types/` 一致）
- [ ] **service 层与 UI 分离**（`services/<provider>/index.ts` 内**不导入**任何 UI / React）
- [ ] **AI 能力必须先通过 provider 接口封装**（直接 `import OpenAI from 'openai'` 在组件里调用 = 不通过）
- [ ] **外部数据源必须先通过 connector 接口封装**（直接 `fetch('https://api.github.com/...')` 在 RSC 里调用 = 不通过）

## 13. 任务完成输出格式

每个任务完成后，agent **必须**按以下格式回报。不要省字段，不要堆细节，不要写到文件。

```markdown
## 任务：[编号 / 简述]

### 改动
- `path/to/changed.ts` — 改了什么（1 行）
- `path/to/new-file.ts` — 新建

### 验证
- `npm run lint`: ✅ / ❌
- `npm run test`: ✅ / ❌ (N tests)
- `npm run typecheck`: ✅ / ❌
- `npm run build`: ✅ / ❌

### 备注
- 与原计划不一致的地方 / 已知限制 / 后续 TODO（如无，写"无"）

**Provider / Connector 改动额外要求：** 修改 `lib/providers/<name>.ts` 或工厂聚合时，必须同时更新 `lib/providers/index.test.ts` 中 `getAllProvidersHealth()` 的预期 length 与 names 数组。

**位置：** 直接贴在对话里。不写文件、不跳过。
