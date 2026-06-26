# Provider / Connector Architecture

> Cognitive Venture OS 的外部能力抽象层。基于 2026-06-25 代码状态。

## 1. 设计目标

把"AI 生成能力"和"外部数据源"统一封装到 8 个接口后面，让 UI / 页面 / API route **不直接**依赖任何第三方 SDK。切真实服务时只换工厂函数体，调用方零改动。

## 2. 分层

```
┌─────────────────────────────────────────────────────────┐
│  app/ (RSC)  components/  app/api/                      │  ← UI / 路由层：只调工厂函数
└──────────────────────┬──────────────────────────────────┘
                       │ import { getLLMProvider } ...
                       ▼
┌─────────────────────────────────────────────────────────┐
│  lib/providers/index.ts                                 │  ← 工厂 + 聚合 health
│  getLLMProvider / getResearchProvider / ...             │
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌─────────────────┐            ┌────────────────────────┐
│  Interface 层   │            │  Mock 实现层           │
│  llm.ts         │◄───────────│  mock/llm.ts           │
│  research.ts    │  contract  │  mock/research.ts      │
│  scoring.ts     │            │  mock/scoring.ts       │
│  geo.ts         │            │  mock/geo.ts           │
│  connectors/    │            │  mock/connectors/*     │
│    data-source  │            │                        │
│    github       │            │                        │
│    mcp          │            │                        │
│    storage      │            │                        │
└─────────────────┘            └────────────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │  未来：真实 SDK 实现   │
                          │  openai / @octokit     │
                          │  @modelcontextprotocol │
                          │  @supabase/supabase-js │
                          └────────────────────────┘
```

## 3. 接口契约

### 3.1 Provider（4 个，AI 能力）

| 接口 | 关键方法 | 职责 | 未来实现 |
|---|---|---|---|
| `LLMProvider` | `summarizeSource` / `generateResearchCard` / `scoreOpportunity` / `generateGEOSuggestions` / `generateLessons` | 通用 LLM 文本生成；**所有 AI 生成的唯一入口** | OpenAI / Anthropic SDK |
| `ResearchProvider` | `suggestTopics` / `extractInsights` / `findRelatedCards` / `expandGraph` | 研究语义专用（找相关、抽洞察、补图谱） | 包装 LLM + 检索 |
| `ScoringProvider` | `scoreOpportunity` / `compareOpportunities` | 多维评分 + 批量排序 | 包装 LLM + 规则引擎 |
| `GEOProvider` | `generateSuggestions` / `analyzeCheck` / `suggestQueries` | GEO 优化（生成资产、分析引用、扩 query 池） | 包装 LLM + 引用检查 |

### 3.2 Connector（4 个，外部数据）

| 接口 | 关键方法 | 职责 | 未来实现 |
|---|---|---|---|
| `DataSourceConnector` | `fetchSignals` / `fetchSources` / `normalizeData` | 外部信源（新闻、RSS、付费数据） | NewsAPI / 行业 API |
| `GitHubConnector` | `listRepos` / `listIssues` / `getReadme` | GitHub 元数据 | `@octokit/rest` |
| `MCPConnector` | `listServers` / `listTools` / `callTool` | Model Context Protocol 工具调用 | `@modelcontextprotocol/sdk` |
| `StorageProvider` | `get` / `list` / `insert` / `update` / `delete` | 持久化 | `@supabase/supabase-js` |

### 3.3 公共约定

- 每个接口都带 `health(): Promise<{ ok: boolean; detail?: string }>` —— 供 `SystemStatus` 聚合展示。
- 所有方法都是 `async` —— 真实 SDK 几乎都是异步，统一签名便于切换。
- 失败语义：
  - `health()` → `ok: false`（不抛错）
  - 业务方法 → 抛带上下文的 `Error('xxx failed: <reason>')`
  - `MCPConnector.callTool` 特殊：失败时返 `{ isError: true, ... }`，便于上层聚合

## 4. 工厂函数

`lib/providers/index.ts` 暴露 8 个工厂，**应用代码只 import 这些**：

```ts
import { getLLMProvider, getGitHubConnector } from '@/lib/providers';

const llm = await getLLMProvider();
const card = await llm.generateResearchCard(topic, sourceIds);

const gh = await getGitHubConnector();
const repos = await gh.listRepos('vercel');
```

工厂内部用 `let _xxx` 模块级缓存，避免每次调用都 new 实例。

额外导出 `getAllProvidersHealth(): Promise<ProviderHealth[]>`，供 dashboard `SystemStatus` 一次性拉全 8 个状态。

## 5. 历史背景

`services/<provider>/` 目录（2026-06 之前的初始 scaffold 留下 4 个 stub：supabase / openai / mcp / github）已于 2026-06-26 随 R-1 任务删除。它们的"是否配了 env key"职责已被 `lib/env.ts` 的 `warnMissingIntegrations()` 接管，health / describe 在 `lib/providers/index.ts` 的 12 工厂中统一实现。

- `lib/providers/` 是 AI / 外部数据源的唯一入口
- 业务 service（`lib/services/<domain>Service.ts`）只调 `lib/providers/`，不绕过
- 接入真实 SDK 时只改 `lib/providers/mock/<name>.ts` → `lib/providers/real/<name>.ts`，或直接在工厂函数体里 if/else 选实现

## 6. 接入真实 SDK 的标准步骤

以把 `LLMProvider` 从 mock 切到 OpenAI 为例：

1. 装 SDK：`npm i openai`
2. `lib/env.ts` 已有 `env.openai.apiKey`，确认 `.env.example` 同步
3. 新建 `lib/providers/openai/llm.ts` 实现 `LLMProvider` 接口
4. 改 `lib/providers/index.ts` 的 `getLLMProvider`：
   ```ts
   export async function getLLMProvider(): Promise<LLMProvider> {
     if (!env.openai.apiKey) {
       return createMockLLMProvider();   // fallback
     }
     return createOpenAILLMProvider();
   }
   ```
5. 在 `app/api/llm/health/route.ts` 暴露 health（可选）
6. 调用方零改动

其他 7 个接口同理。

## 7. AGENTS.md DoD 自检

| DoD 条目 | 满足方式 |
|---|---|
| AI 必须经 LLMProvider | 所有 AI 文本生成（summarize / generate card / score / GEO / lessons）只在 LLMProvider 内 |
| 外部数据必须经 Connector | GitHub / MCP / 信源 / 持久化都封装在 4 个 connector 内 |
| service 层与 UI 分离 | `lib/providers/*.ts` 内无 React import，无 UI import |
| mock 真实可调 | 8 个 mock 工厂均可直接调用，输出基于输入可重现 |
| 工厂单点切换 | 全部经过 `lib/providers/index.ts` 的 8 个工厂 |

## 8. 目录速查

```
lib/providers/
├── llm.ts                 # LLMProvider 接口
├── research.ts            # ResearchProvider 接口
├── scoring.ts             # ScoringProvider 接口
├── geo.ts                 # GEOProvider 接口
├── index.ts               # 8 个工厂 + getAllProvidersHealth
├── connectors/
│   ├── data-source.ts     # DataSourceConnector 接口
│   ├── github.ts          # GitHubConnector 接口
│   ├── mcp.ts             # MCPConnector 接口
│   ├── storage.ts         # StorageProvider 接口
│   └── index.ts           # 4 个 connector 接口汇总
└── mock/
    ├── llm.ts             # MockLLMProvider
    ├── research.ts        # MockResearchProvider
    ├── scoring.ts         # MockScoringProvider
    ├── geo.ts             # MockGEOProvider
    ├── index.ts           # 8 个 mock 工厂汇总
    └── connectors/
        ├── data-source.ts
        ├── github.ts
        ├── mcp.ts
        └── storage.ts
```
