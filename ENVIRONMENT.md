# ENVIRONMENT — Cognitive Venture OS

> 三模式 env 系统的权威说明。所有新增 env 必须先在这里登记，再到 `lib/env.ts` 暴露 API。

## 1. 三种模式

由 `NEXT_PUBLIC_APP_MODE` 决定，未识别值统一回落 `demo`：

| 模式 | 触发 | 行为 | 适合谁 |
|---|---|---|---|
| **demo** | 缺省 / `demo` | 全部 provider / connector 走 mock；server env 可全空 | Vercel 演示 / 投资人演示 / 自己调试 |
| **staging** | `staging` / `stage` | Supabase 必填；OpenAI / Google Search Console 选填（warn） | 内部预发 / 接 Supabase 但还没接 OpenAI |
| **production** | `production` / `prod` | Supabase + OpenAI + Google Search Console + `NEXT_PUBLIC_SITE_URL` 全部必填 | 真用户 / 真流量 |

校验逻辑在 `lib/env.ts` 的 `validateEnv()`，可用 `assertEnv()` 抛出版本（适合放 `instrumentation.ts` / server startup）。

## 2. Public env（NEXT_PUBLIC_*）

可放心嵌入 client bundle，**禁止用于任何 secret**。

| 变量 | 类型 | 必填度 | 用途 |
|---|---|---|---|
| `NEXT_PUBLIC_APP_MODE` | `'demo' \| 'staging' \| 'production'` | **必填**（缺省 demo） | 模式开关 |
| `NEXT_PUBLIC_DEMO_MODE` | `'true' \| 'false'` | 可选 | 旧契约兼容；Topbar 用它显示 badge |
| `NEXT_PUBLIC_SITE_URL` | URL string | staging 推荐 / production 必填 | canonical site url；OG 标签、citation 监控依赖 |

## 3. Server env（无 NEXT_PUBLIC_ 前缀）

**严禁**在 `'use client'` 文件 / 客户端组件 / 任何会进入 client bundle 的地方 `import` 或读取。`lib/env.ts: getServerEnv()` 主动调用会抛错（`typeof window` 守卫）。

### 3.1 Supabase

| 变量 | staging | production | 用途 |
|---|---|---|---|
| `SUPABASE_URL` | 必填 | 必填 | supabase-js client URL |
| `SUPABASE_ANON_KEY` | 必填 | 必填 | 前端匿名 key（虽然 server-only 读取，但要配） |
| `SUPABASE_SERVICE_ROLE_KEY` | warn | 必填 | 服务端写操作；**绝对不要泄露到 client** |

### 3.2 OpenAI

| 变量 | staging | production | 用途 |
|---|---|---|---|
| `OPENAI_API_KEY` | warn | 必填 | LLM 调用；接 PRD / GEO / Lesson / Scoring 4 个 provider |

### 3.3 Google Search Console

| 变量 | staging | production | 用途 |
|---|---|---|---|
| `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` | warn | 必填 | GEO citation 监控 OAuth |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` | warn | 必填 | 同上 |

### 3.4 预留（demo 阶段未启用）

| 变量 | 用途 |
|---|---|
| `GITHUB_TOKEN` | 真实 GitHub API 凭据（信号源 connector） |
| `MCP_SERVERS` | MCP server 列表，逗号分隔（如 `stdio:foo,http:bar`） |

## 4. API（lib/env.ts）

```ts
import { isDemoMode, getAppMode, isProduction,
         getPublicEnv, getServerEnv,
         validateEnv, assertEnv, EnvValidationError,
         warnMissingIntegrations } from '@/lib/env';

// Public 路径（client / server 都安全）
isDemoMode()              // boolean — Topbar 用
getAppMode()              // 'demo' | 'staging' | 'production'
isProduction()            // boolean
getPublicEnv()            // { appMode, demoMode, siteUrl }

// Server 路径（client 调用抛错）
getServerEnv()            // { supabase, openai, googleSearchConsole, legacy }

// 校验
validateEnv()             // EnvIssue[]（按 mode 返回 error / warning）
assertEnv()               // 有 error 级 issue 时抛 EnvValidationError
warnMissingIntegrations() // string[]（仅 warning 级的字段名）
```

## 5. 模式切换 checklist

### 5.1 demo → staging

```bash
# .env.local 或 Vercel Dashboard
NEXT_PUBLIC_APP_MODE=staging
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
# 可选：接 AI 能力
OPENAI_API_KEY=sk-...
```

预期：启动时 `validateEnv()` 报 SUPABASE_URL / SUPABASE_ANON_KEY 之外的 warning（如果 OpenAI 也没配）。

### 5.2 staging → production

```bash
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_SITE_URL=https://cvo.example.com
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # 重要：服务端写操作
OPENAI_API_KEY=sk-...
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=...
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=...
```

预期：所有 issue 为 0；`assertEnv()` 通过。

## 6. Vercel 配置清单

到 **Project → Settings → Environment Variables** 添加：

### 6.1 Production 环境

| Key | Value | Sensitive? | 备注 |
|---|---|---|---|
| `NEXT_PUBLIC_APP_MODE` | `production` | no | |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` | no | |
| `SUPABASE_URL` | `https://xxx.supabase.co` | no | |
| `SUPABASE_ANON_KEY` | `eyJ...` | **yes** | |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **yes** | 服务端写操作；**绝对不要给 client** |
| `OPENAI_API_KEY` | `sk-...` | **yes** | |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_ID` | `...` | **yes** | |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET` | `...` | **yes** | |

### 6.2 Preview 环境（PR 部署）

| Key | Value |
|---|---|
| `NEXT_PUBLIC_APP_MODE` | `staging` |
| `SUPABASE_URL` | （同 production 的 staging 实例） |
| `SUPABASE_ANON_KEY` | （同 production 的 staging 实例） |
| `OPENAI_API_KEY` | `sk-...`（可用 production 同一个） |

### 6.3 Development 环境（Vercel for Git 的开发分支）

| Key | Value |
|---|---|
| `NEXT_PUBLIC_APP_MODE` | `demo` |
| 其余全部留空 | （mock 走天下） |

## 7. 本地开发

```bash
# 1. 复制模板
cp .env.example .env.local

# 2. 默认就是 demo 模式，什么都不用改
npm run dev

# 3. 想切 staging：编辑 .env.local，把 NEXT_PUBLIC_APP_MODE 改成 staging，配 SUPABASE_URL / ANON_KEY
```

## 8. 故意不接的 env

下列常见 Next.js env **没纳入**本系统：

- `NEXT_PUBLIC_VERCEL_URL` — Vercel 自动注入，本系统用 `NEXT_PUBLIC_SITE_URL` 替代以保持跨平台
- `VERCEL_OIDC_TOKEN` — Vercel CLI 内部用，不暴露给应用代码
- `PORT` / `HOSTNAME` — 不需要，应用框架自己处理

## 9. 错误信息样本

`assertEnv()` 抛错时的样例：

```
EnvValidationError: Env validation failed (2 errors):
  - SUPABASE_URL: staging 模式需要 Supabase url
  - SUPABASE_ANON_KEY: staging 模式需要 Supabase anon key
```

`validateEnv()` 返回的 `EnvIssue` 结构：

```ts
{
  level: 'error' | 'warning';
  field: string;   // env 变量名（如 'SUPABASE_URL'）
  message: string; // 人类可读
}
```

UI 可在 `/settings` 页面直接渲染这个列表（未来扩展点）。
