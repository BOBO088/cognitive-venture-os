# DEPLOYMENT — Cognitive Venture OS

> MVP / Demo 阶段的部署手册。目标是 5 分钟内把 71 个路由跑到公网。

## 1. 部署形态

- **类型：** Next.js 15 App Router 静态/混合渲染（SSG + 动态 fallback）
- **运行模式：** `DEMO_MODE=true`（默认），所有 provider / connector 走 mock，零外部依赖
- **数据层：** 纯本地 mock，所有访问者共享同一份数据
- **持久化：** 进程内存 append-only repo；**每次重启回到 mock 初始态**

## 2. Vercel 部署（推荐，零配置）

### 2.1 一键部署

最简单的方式：用下面按钮 / 命令在 Vercel 创建一个新项目。

```bash
# 一次性
npm i -g vercel
vercel login

# 项目根目录
vercel                    # 预览部署
vercel --prod             # 生产部署
```

Vercel 会自动：
- 检测 `package.json` 跑 `npm install` + `npm run build`
- 把 `.next/` 部署到 Vercel Edge Network
- 分配 `https://<project>.vercel.app` URL

### 2.2 环境变量（Vercel Dashboard）

到 Project → **Settings** → **Environment Variables**，加 1 个变量即可：

| Key | Value | 适用环境 |
|---|---|---|
| `DEMO_MODE` | `true` | Production / Preview / Development |

> **不填也能跑**——`lib/env.ts` 把 `DEMO_MODE` 缺省值设为 `'true'`。但建议显式设上，方便团队成员一眼看出部署模式。

`NEXT_PUBLIC_DEMO_MODE=true` 也可以加一份（与 `DEMO_MODE` 等价，UI 端用得上）。

**不要填：**
- `OPENAI_API_KEY` / `GITHUB_TOKEN` / `MCP_SERVERS` / Supabase 任意 key

填了也不会报错（`lib/env.ts` 用 `?? ''` 兜底），但会让 dashboard 状态从"demo 干净"变成"missing key 警告"。Demo 阶段全部留空。

### 2.3 部署后验证

```bash
# 1. 访问首页（应该 200，看到 7 域统计 + 12 provider health + Recent updates + Quick actions）
curl -I https://<project>.vercel.app/

# 2. 探活关键路由
for r in / /research/topics /graph/entities /opportunities /mvp /geo/brands /learning/launch-results /codex-tasks; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://<project>.vercel.app${r}")
  echo "${code}  ${r}"
done

# 3. 看 Topbar 右上角是否有 "Demo mode · mock data" 黄色 badge
```

### 2.4 Vercel 项目配置（可选）

`next.config.ts` 已经包含 `outputFileTracingRoot`，Vercel 部署时无需 `vercel.json`。

如果需要自定义：

```json
// vercel.json
{
  "regions": ["hnd1"],
  "buildCommand": "npm run build",
  "framework": "nextjs"
}
```

### 2.5 切到真实模式（Demo 之后）

等接入真实 SDK 时：

1. Vercel Dashboard 把 `DEMO_MODE` 改为 `false`
2. 填齐对应 provider 的 env key（`OPENAI_API_KEY` 等）
3. 改 `lib/providers/<name>.ts` 工厂函数体（用 `env.demoMode` 选实现）
4. 跑 `npm run test -- providers/index` 确认 `getAllProvidersHealth()` 仍 12 条

## 3. Docker 自托管

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV DEMO_MODE=true
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DEMO_MODE=true
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm","start"]
```

启动：
```bash
docker build -t cvo:demo .
docker run -p 3000:3000 -e DEMO_MODE=true cvo:demo
```

## 4. 任意 Node 22+ 主机

```bash
npm ci --omit=dev
npm run build
DEMO_MODE=true npm run start   # 监听 0.0.0.0:3000
```

## 5. 部署前检查清单

```bash
# 1. 静态检查
npm run lint
npm run typecheck

# 2. 单元测试（包含 DEMO_MODE 契约测试）
npm run test

# 3. 生产构建
DEMO_MODE=true npm run build

# 4. 产线包路由冒烟
DEMO_MODE=true npm run start &
SERVER_PID=$!
sleep 3
for r in / /research /graph /opportunities /mvp /geo /learning /codex-tasks; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${r}")
  echo "${code}  ${r}"
done
kill $SERVER_PID
```

全部 200/404（无 500）即视为通过。

## 6. Demo 入口建议

部署后访客首次进入看到的是 `/` 的新 Dashboard。**真实功能在左侧 Sidebar**：

| 路径 | 内容 |
|---|---|
| `/research/topics` | 研究主题列表（7 条） |
| `/graph/entities` | 知识图谱实体（32 条） |
| `/opportunities/signals` | 市场信号（15 条） |
| `/mvp` | MVP 项目看板（7 条） |
| `/geo/brands` | GEO 品牌（6 条） |
| `/learning/launch-results` | 上线结果（5 条） |
| `/codex-tasks` | Codex 任务板（6 条） |

Topbar 右上角的 **"Demo mode · mock data"** badge 会一直显示，提醒访客这是 mock 数据。

## 7. 已知限制

- 写入操作走 service 层 in-memory repo，**重启即清空**——每次进程重启会回到 mock 初始态
- 无用户系统，所有访问者共享同一份状态
- 无 API 路由（`app/api/` 暂未启用），所有能力由 RSC 直调 service 层
- `outputFileTracingRoot: __dirname` 写死在 `next.config.ts`，本地构建时用于阻止 Next 找到上层 lockfile；Vercel 隔离环境无影响

## 8. 回滚

部署平台（Vercel / 自建 CI）保留历史 build，直接 redeploy 上一版本即可。无数据库迁移步骤。
