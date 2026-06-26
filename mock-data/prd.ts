/**
 * PRD 域 mock 数据。
 *
 * 3 条 PRD：覆盖 3 个不同 MVPProject，其中 GEO Pulse 有 v1 / v2 两版演示版本管理。
 *
 * 9 个 section 的内容是手写 demo 文本，service 层只做长度校验。
 */

import type { PRD } from '@/types';

export const mockPRDs: PRD[] = [
  {
    id: 'prd_geo_pulse_v1',
    mvpProjectId: 'mvp_geo_pulse',
    version: 1,
    title: 'PRD for GEO Pulse',
    productPositioning:
      '**GEO Pulse** 是一款面向 B2B 品牌团队的 AI 答案引擎品牌可见度监控 SaaS。\n\n' +
      '它在 ChatGPT / Perplexity / Claude / Gemini 等 7 个 AI 答案引擎上监测一组预定义 query，' +
      '统计品牌在答案中出现的频次、被引用为源 URL 的次数，以及品牌相对竞品的 share-of-voice。\n\n' +
      '差异化：相比 Otterly / Profound 等竞品，**GEO Pulse 聚焦 SMB 价位（$500/月），并把 "可执行洞察" 而非 "原始数据" 作为输出形态**。',
    targetUsers:
      '**主 ICP**：5-50 人 B2B 品牌 / 内容营销团队，已有 SEO 实践但对 AI 搜索无监控能力。\n\n' +
      '**次 ICP**：in-house content lead / 品牌总监 / 增长负责人；agency 内的 GEO 顾问。\n\n' +
      '**反 ICP**：纯个人创作者、to-C 消费品品牌、单纯做 Google SEO 的传统 SEO agency。',
    corePainPoints:
      '1. **多平台覆盖难**：手动在 7+ AI 引擎跑同一组 query，每周 8 小时起步。\n' +
      '2. **结果不可比**：不同引擎答案格式不同，没有统一指标判断"我的品牌在 AI 里被讲了多少"。\n' +
      '3. **行动路径模糊**：看到数据后不知道下一步该写什么内容、投什么来源。',
    mvpFeatureScope:
      '**Must-have（V1 必交付）**\n' +
      '- [MUST] **监控 query 配置** — 增删改 query 列表（每个 query 30 个为上限）\n' +
      '- [MUST] **7 引擎扫描** — 每日自动跑 7 个引擎的 query 列表\n' +
      '- [MUST] **share-of-voice 仪表盘** — 展示 brand mention % + 引用源 URL 列表\n' +
      '- [MUST] **周报导出** — 邮件 + dashboard 内的 markdown 报告\n' +
      '\n' +
      '**Should-have（V1.1 加）**\n' +
      '- [SHOULD] **竞品对比** — 同时监控 3 个竞品品牌，输出 SoV 对比图\n' +
      '- [SHOULD] **query 建议** — 基于品牌已有 query，推荐新 query\n' +
      '\n' +
      '**Won\'t-have（V1 不做）**\n' +
      '- 多团队 / RBAC\n' +
      '- 自定义 AI 引擎接入\n' +
      '- 内容生成 / 自动发布',
    pageStructure:
      '| Route | 用途 | 关键组件 |\n' +
      '| --- | --- | --- |\n' +
      '| `/` | 着陆页：产品定位 + 7 天免费试用 | Hero / Demo video / Pricing / CTA |\n' +
      '| `/login` | 邮箱 + magic link | Magic link form |\n' +
      '| `/app` | 仪表盘：核心 SoV 数字 + 趋势图 | Stat grid / Trend chart / Recent activity |\n' +
      '| `/app/queries` | query 列表 + 增删改 | Table / Inline edit / Bulk import |\n' +
      '| `/app/queries/:id` | 单 query 详情：跨引擎 mention 详情 | Per-engine cards / Source URL list |\n' +
      '| `/app/competitors` | 竞品配置 | Form / Comparison chart |\n' +
      '| `/app/reports` | 周报列表 | Card grid / Export button |\n' +
      '| `/app/settings` | 团队 + 计费设置 | Tabs / Plan / API keys |',
    dataModel:
      '**核心实体（V1）**\n\n' +
      '| Entity | 关键字段 | 关系 |\n' +
      '| --- | --- | --- |\n' +
      '| User | id, email, teamId, role, createdAt | *—1 Team |\n' +
      '| Team | id, name, plan, createdAt | 1—* Brand |\n' +
      '| Brand | id, teamId, name, domains[], createdAt | 1—* Query, 1—* ScanResult |\n' +
      '| Query | id, brandId, text, category, createdAt | 1—* ScanResult |\n' +
      '| ScanResult | id, queryId, engine, runAt, mentioned (bool), sourceUrls[], answerSnippet | 1—* Mention |\n' +
      '| Mention | id, scanResultId, brandId, position (0..1), sourceUrl | *—1 ScanResult |\n' +
      '| WeeklyReport | id, brandId, weekOf, content (md), generatedAt | *—1 Brand |\n' +
      '\n' +
      '**派生视图**：ShareOfVoiceSummary（按周聚合，server-side cache）',
    apiDesign:
      '| Method | Path | 用途 |\n' +
      '| --- | --- | --- |\n' +
      '| GET | `/api/brands` | 当前团队的品牌列表 |\n' +
      '| POST | `/api/brands` | 创建品牌 |\n' +
      '| GET | `/api/brands/:id/queries` | query 列表 |\n' +
      '| POST | `/api/brands/:id/queries` | 新增 query |\n' +
      '| DELETE | `/api/queries/:id` | 删除 query |\n' +
      '| POST | `/api/brands/:id/scan` | 触发立即扫描（async） |\n' +
      '| GET | `/api/brands/:id/sov` | 拿 share-of-voice 序列 |\n' +
      '| POST | `/api/brands/:id/reports/weekly` | 生成周报（async） |',
    acceptanceCriteria:
      '**功能验收**\n' +
      '- [ ] 用户 3 步内完成 onboarding（创建品牌 → 添加 5 个 query → 看到首次扫描结果）\n' +
      '- [ ] 7 个 AI 引擎的扫描结果都返回（即使 mention=0）\n' +
      '- [ ] 周报自动每周一早 8 点生成 + 邮件发送\n' +
      '\n' +
      '**质量验收**\n' +
      '- [ ] Lighthouse Performance ≥ 80\n' +
      '- [ ] dashboard 关键路径 P95 < 1.5s\n' +
      '- [ ] 任意 form 都有 inline validation\n' +
      '\n' +
      '**业务验收**\n' +
      '- [ ] 12 个试用品牌完成 onboarding（当前：12/20）\n' +
      '- [ ] 至少 8 个品牌在试用期发出过 ≥ 1 份周报\n' +
      '- [ ] NPS ≥ 40',
    devPlan:
      '**Day 1 — Setup & scaffolding**\n' +
      '- Next.js + TS + Tailwind 初始化\n' +
      '- mock 数据 + service 层骨架\n' +
      '- 主题 + layout\n' +
      '\n' +
      '**Day 2 — 数据层 + 列表 / 详情**\n' +
      '- 7 引擎扫描 mock connector\n' +
      '- 品牌 / query 列表 / 详情页\n' +
      '- 表单 + 校验\n' +
      '\n' +
      '**Day 3 — Dashboard + 扫描触发**\n' +
      '- SoV 仪表盘\n' +
      '- 手动扫描按钮\n' +
      '- 缓存 + 异步 job\n' +
      '\n' +
      '**Day 4 — 周报 + 导出**\n' +
      '- 周报生成（md）\n' +
      '- 邮件发送 stub\n' +
      '- dashboard 内报告查看\n' +
      '\n' +
      '**Day 5 — Onboarding + 试用流**\n' +
      '- 着陆页 + 注册\n' +
      '- 试用倒计时\n' +
      '- 引导式首次扫描\n' +
      '\n' +
      '**Day 6 — Beta 开放 + 反馈收集**\n' +
      '- 邀请 20 个外部试用\n' +
      '- 反馈表单 + 记录\n' +
      '- 修高频 bug\n' +
      '\n' +
      '**Day 7 — 复盘 + 决策**\n' +
      '- 试用数据整理\n' +
      '- 复盘文档\n' +
      '- V1.1 提案',
    generatedByMock: false,
    createdAt: '2026-05-20T11:00:00.000Z',
    updatedAt: '2026-05-25T09:00:00.000Z',
  },
  {
    id: 'prd_geo_pulse_v2',
    mvpProjectId: 'mvp_geo_pulse',
    version: 2,
    title: 'PRD for GEO Pulse (v2 — paid tier)',
    productPositioning:
      'GEO Pulse V2 在 V1 基础上扩展到 12 个 AI 引擎，新增 **周报订阅** 与 **竞品对比** 模块。\n\n' +
      '目标是把 ARPU 从 $500/月 提到 $1200/月，并降低 30 天 churn 率。',
    targetUsers:
      'V1 ICP 不变，新增"已付费 + 用满 30 天"的客户作为新功能的"power user" 反馈圈。',
    corePainPoints:
      '1. V1 客户希望看到 **跨周的趋势** 而非单点数据\n' +
      '2. V1 客户经常问"对手在我们监控的 query 上表现如何"\n' +
      '3. V1 客户需要把 GEO 数据**汇报给老板**，手动导 md 不够',
    mvpFeatureScope:
      '**新增（V2）**\n' +
      '- [MUST] **周报订阅** — 客户自选订阅频率（每周 / 每月）+ 收件人列表\n' +
      '- [MUST] **竞品对比** — 最多 3 个竞品，输出 SoV 对比图 + 引用源差异表\n' +
      '- [MUST] **趋势视图** — 任意 query / brand 的 4/12/24 周趋势\n' +
      '\n' +
      '**延续 V1**\n' +
      '- 7 引擎扫描、query 管理、品牌配置',
    pageStructure:
      '| Route | 用途 |\n' +
      '| --- | --- |\n' +
      '| `/app/competitors` | 竞品配置 + 对比图（V1 已有壳，V2 填血肉） |\n' +
      '| `/app/reports/subscriptions` | 订阅配置 |\n' +
      '| `/app/trends/:queryId` | 趋势详情 |',
    dataModel:
      '**新增表**\n' +
      '| Entity | 关键字段 |\n' +
      '| --- | --- |\n' +
      '| Competitor | id, brandId, name, domains[] |\n' +
      '| ReportSubscription | id, brandId, frequency, recipients[], active |',
    apiDesign:
      '| Method | Path | 用途 |\n' +
      '| --- | --- | --- |\n' +
      '| POST | `/api/brands/:id/competitors` | 添加竞品 |\n' +
      '| GET | `/api/brands/:id/competitors/:cid/sov` | 竞品 SoV 对比 |\n' +
      '| POST | `/api/brands/:id/subscriptions` | 创建订阅 |\n' +
      '| GET | `/api/queries/:id/trend?weeks=12` | 趋势数据 |',
    acceptanceCriteria:
      '- [ ] 12 个付费客户中 10 个配置了至少 1 个订阅\n' +
      '- [ ] 竞品对比功能 7 天内被 ≥ 50% 的付费客户使用过\n' +
      '- [ ] 30 天 churn < 5%',
    devPlan:
      '**Day 1-2** 竞品模块后端 + 前端\n' +
      '**Day 3-4** 订阅系统 + 邮件触发\n' +
      '**Day 5** 趋势视图\n' +
      '**Day 6** Beta 推送 + 客户 onboarding\n' +
      '**Day 7** 复盘 + V2.1 提案',
    generatedByMock: true,
    createdAt: '2026-06-23T10:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
  },
  {
    id: 'prd_citeboost_v1',
    mvpProjectId: 'mvp_citeboost',
    version: 1,
    title: 'PRD for CiteBoost',
    productPositioning:
      '**CiteBoost** 是面向 SEO / 内容团队的内容改写 SaaS：上传文章 → 自动生成 AI-搜索友好的改写版 + 引用建议。\n\n' +
      '差异化：相比 Surfer / Frase，CiteBoost 专注 **AI 引擎引用率** 而非 Google 排名。',
    targetUsers:
      '已发表 100+ 篇内容、想做 GEO 升级的 in-house 内容团队。\n\n反 ICP：纯社媒内容、零文字资产的初创品牌。',
    corePainPoints:
      '1. 改写一篇长文 4-8 小时，**批量改写** 不可行\n' +
      '2. 改写完不知道 AI 引擎会不会**真的引用**\n' +
      '3. 引用源建议完全靠经验，没有数据支撑',
    mvpFeatureScope:
      '- [MUST] **单篇改写** — 粘贴 URL / 上传文件 → 5 分钟内返回改写版\n' +
      '- [MUST] **引用建议** — 输出 top 5 推荐引用源（域名 + 推荐理由）\n' +
      '- [MUST] **改写前/后对比** — 突出 diff + 引用率预测\n' +
      '- [SHOULD] **批量改写** — 一次最多 10 篇\n' +
      '- [SHOULD] **团队工作流** — 多人 review / 状态机',
    pageStructure:
      '| Route | 用途 |\n' +
      '| --- | --- |\n' +
      '| `/` | 着陆页 |\n' +
      '| `/app/rewrite` | 单篇改写上传页 |\n' +
      '| `/app/rewrite/:id` | 改写详情（diff + 引用建议） |\n' +
      '| `/app/batch` | 批量改写 |',
    dataModel:
      '| Entity | 关键字段 |\n' +
      '| --- | --- |\n' +
      '| Rewrite | id, ownerId, sourceUrl, rewrittenText, citationSuggestions[], status, createdAt |',
    apiDesign:
      '- `POST /api/rewrite` — 创建改写任务\n' +
      '- `GET /api/rewrite/:id` — 拿结果\n' +
      '- `POST /api/rewrite/batch` — 批量创建',
    acceptanceCriteria:
      '- [ ] 单篇改写 P95 < 5 分钟\n' +
      '- [ ] 引用建议命中率（用户采纳率）> 40%\n' +
      '- [ ] 5 个试用客户完成至少 1 次改写',
    devPlan:
      '**Day 1-2** 改写引擎 + 引用建议算法\n' +
      '**Day 3-4** UI 列表 / 详情 / diff\n' +
      '**Day 5** 批量改写\n' +
      '**Day 6-7** Beta + 复盘',
    generatedByMock: false,
    createdAt: '2026-05-15T10:00:00.000Z',
    updatedAt: '2026-05-20T10:00:00.000Z',
  },
];
