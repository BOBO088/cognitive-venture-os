# DATABASE — Cognitive Venture OS

> 双后端数据层（mock + supabase）的**设计契约**。SQL schema + seed 就绪；代码层目前**只走 mock**。本文件说明"接 supabase 之前要做什么 / 之后要做什么"。

## 1. 目录结构

```
database/
├── migrations/
│   └── 0001_init_schema.sql   # 18 张表 + 索引 + CHECK + 触发器 + RLS
├── seed/
│   └── seed.sql               # 最小 seed（每表 2-3 条，验证 schema 正确）
└── README.md                  # 快速参考

lib/
└── repos/                     # 当前：各 domain repo 直接读写 mock-data 数组
    ├── index.ts               # barrel re-export（service 唯一入口）
    ├── research.ts            # ResearchTopic / SourceItem / ResearchCard
    ├── knowledge-graph.ts     # GraphEntity / GraphRelation
    ├── opportunities.ts       # Signal / Opportunity / OpportunityEvaluation
    ├── mvp.ts                 # MVPProject / LaunchResult
    ├── learning.ts            # LessonLearned
    ├── iteration.ts           # PromptVersion / LoopVersion / ImprovementLog
    ├── geo.ts                 # GEO Brand/Content/Query/Citation + v2 entities
    ├── tasks.ts               # Codex Task
    └── prd.ts                 # PRD
```

## 2. 派发逻辑（当前 = mock only）

```
service.listXxx() / .getXxx() / .createXxx() / ...
        ↓
lib/repos/<domain>.ts 里的具体函数
        ↓
直接读 / 写 mock-data/<domain>.ts 里的数组
```

**没有运行时派发**。所有 9 个 domain repo 的函数体都是 in-memory array 操作，重启进程数据回种子。

切换 supabase 的设计路径见 §6。

## 3. 18 张表 → 18 个类型 一一对应

| SQL 表 | TS 类型 | types/ 文件 |
|---|---|---|
| `research_topics` | `ResearchTopic` | `types/research.ts` |
| `sources` | `SourceItem` | `types/research.ts` |
| `research_cards` | `ResearchCard` | `types/research.ts` |
| `graph_entities` | `GraphEntity` | `types/graph.ts` |
| `graph_relations` | `GraphRelation` | `types/graph.ts` |
| `signals` | `Signal` | `types/opportunity.ts` |
| `opportunities` | `Opportunity` | `types/opportunity.ts` |
| `opportunity_evaluations` | `OpportunityEvaluation` | `types/opportunity.ts` |
| `mvp_projects` | `MVPProject` | `types/mvp.ts` |
| `launch_results` | `LaunchResult` | `types/mvp.ts` |
| `lessons_learned` | `LessonLearned` | `types/learning.ts` |
| `geo_brand_entities` | `GEOBrandEntity` | `types/geo.ts` |
| `geo_content_assets` | `GEOContentAsset` | `types/geo.ts` |
| `ai_queries` | `AIQuery` | `types/geo.ts` |
| `citation_check_results` | `CitationCheckResult` | `types/geo.ts` |
| `codex_tasks` | `Task` | `types/task.ts` |
| `prompt_versions` | `PromptVersion` | `types/iteration.ts` |
| `loop_versions` | `LoopVersion` | `types/iteration.ts` |

## 4. Schema 关键约定

### ID
- **text**（不是 uuid），保留 mock data 的字符串 ID 风格（`task-001`, `entity_openai` 等）。这样 seed 可以直接用现有 ID，不需要翻译。

### 时间戳
- `created_at` / `updated_at` 用 `timestamptz NOT NULL DEFAULT now()`
- `updated_at` 有触发器自动维护
- TS 端用 `string`（ISO 8601），不存 `Date` 对象（防 SSR hydration mismatch）

### 数组
- `text[]` 对应 `tags: string[]` / `sourceIds: string[]` 等
- 常用数组列上建了 gin 索引（tags / sourceIds / relatedEntityIds 等）

### JSON 字段
- `key_insights`, `evidence`, `risks`, `metadata`, `test_result` 用 `jsonb`

### CHECK 约束
- 所有 enum 字段（status / category / priority / phase 等）都有 CHECK
- 数值字段（score / confidence / *_score）有 `BETWEEN 0 AND 100`
- `revenue / cost >= 0`，必填 text 字段有 `char_length` 上下界

### 关系
- **强外键**（cascade / set null）：`sources.topic_id`、`research_cards.topic_id`、`opportunity_evaluations.opportunity_id`、`mvp_projects.opportunity_id`、`launch_results.mvp_project_id`、`lessons_learned.project_id`、`lessons_learned.launch_result_id`、`geo_content_assets.brand_id`、`ai_queries.brand_id`、`citation_check_results.query_id/brand_id`
- **弱外键**（不强制）：`research_cards.signal_id`（signal 可被 cards 引用，删除时不 cascade）
- **自引用**：`research_topics.parent_topic_id`（主题树）
- **反向引用**（ID 数组列）：`sourceIds` / `cardIds` / `linkedEntityIds` 等由 service 层手动维护，不在 SQL 层加触发器

### RLS
- 18 张表全部 `ENABLE ROW LEVEL SECURITY`
- MVP 阶段不写策略 —— 切到多用户生产时再补（典型：`auth.uid() = user_id`）

## 5. 部署到 Supabase

### 5.1 初始化（一次性）

```bash
# 1. 创建 Supabase 项目（https://supabase.com/dashboard）
# 2. 在 Project Settings → API 拿到 URL + service role key + anon key
# 3. 在 .env.local / Vercel Dashboard 配：
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 重要：只在 server env，**绝不** NEXT_PUBLIC_
NEXT_PUBLIC_APP_MODE=staging       # 或 production
```

### 5.2 跑 migration

```bash
# 方式 A：Supabase CLI
supabase db push

# 方式 B：复制 database/migrations/0001_init_schema.sql 全文
#        → 粘贴到 Supabase Dashboard 的 SQL Editor → Run
```

### 5.3 跑 seed

```bash
psql $SUPABASE_DB_URL -f database/seed/seed.sql
```

## 6. 接 supabase 的代码层路径（**当前没做**）

### 当前状态
- ✅ SQL schema（18 张表 + 索引 + CHECK + 触发器 + RLS）
- ✅ Seed SQL
- ✅ `.env.example` 含 supabase 三个 key
- ✅ `lib/env.ts` 有 `isSupabaseConfigured()` helper（diagnostic 用）
- ❌ **`lib/repos/*` 的函数体仍然是 mock-data 数组操作**，没接 supabase client
- ❌ **没装 `@supabase/supabase-js` 包**（真要接时再加，避免未用 dep）
- ❌ **没写 `lib/supabase.ts` client factory**（真要接时再加）

### mock 模式（默认）
- `NEXT_PUBLIC_APP_MODE=demo`（或不设）
- service 走 `lib/repos/<domain>.ts` → 直接读 `mock-data/<domain>.ts` 数组
- 重启进程数据回种子

### 接 supabase 的两种姿势（任选其一）

**姿势 A：repo 函数体加 env 分支**（推荐起步）
```ts
// lib/repos/research.ts —— 改 listResearchTopics:
import { getServerEnv } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import { mockResearchTopics } from '@/mock-data/research';

export async function listResearchTopics(): Promise<ResearchTopic[]> {
  const srv = getServerEnv();
  if (srv.supabase.url && srv.supabase.serviceRoleKey) {
    const sb = createClient(srv.supabase.url, srv.supabase.serviceRoleKey);
    const { data, error } = await sb.from('research_topics').select('*');
    if (error) throw new Error(`research_topics.list: ${error.message}`);
    return (data ?? []).map(rowFromSnake);
  }
  return mockResearchTopics;
}
```
- 优点：service 零改动；mock 模式继续工作
- 缺点：每个函数都写一遍 env 分支和字段转换

**姿势 B：抽一层抽象 + 工厂**（等 supabase repo 数量 > 6 再考虑）
- 引入 `lib/repos/types.ts` 定义 `Repo<T>` 接口
- 抽 `lib/repos/mock/_base.ts` 的 `InMemoryRepo<T>`
- 抽 `lib/repos/supabase/_base.ts` 的 `SupabaseRepo<T>`（camel ↔ snake + JSON 字段）
- `lib/repos/index.ts` 改成工厂 `getRepos(): Repos`
- 逐个 service 从 `mock-data/*.ts` 切到 `getRepos().<domain>.<method>()`
- 优点：DRY，类型约束好
- 缺点：service 要改 23 个文件，要测两边都有数据

### 选哪个？
- 当前业务量（mock demo）：**姿势 A** 性价比高，先把所有 18 个函数加 supabase 分支
- 之后 supabase 真正稳定 + 多表都有复杂 query：再考虑姿势 B

### 风险点
- **JSON 字段边界**（keyInsights / evidence / risks / metadata / testResult）：空数组 / null / undefined 在 jsonb 里的行为要测
- **CHECK 约束与 types 不一致**：如果 types 加了 enum 值但 SQL 还没补 CHECK，insert 会失败
- **触发器 vs service 写 `updatedAt`**：二选一，不要两边都写
- **RLS 没策略 = 完全 deny**（除 service role）：生产前必须补
