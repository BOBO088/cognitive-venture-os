/**
 * Mock LLMProvider — 确定性占位实现。
 *
 * 设计原则：
 * 1. 不依赖 @/mock-data（provider 层与数据层解耦）
 * 2. 不调真实网络
 * 3. 输出基于输入可重现（用 hash 字段做种子）
 * 4. 时间字段用字面量 ISO，禁止 new Date()
 */

import type {
  ResearchTopic,
  ResearchCard,
  SourceItem,
  Opportunity,
  GEOBrandEntity,
  AIQuery,
  LaunchResult,
  LessonLearned,
  PromptVersion,
  LoopVersion,
  BrandEntityProfile,
  AIQueryBankIntent,
  AIQueryBankPlatform,
} from '@/types';
import type {
  LLMProvider,
  OpportunityScore,
  CardDraft,
  OpportunityDraft,
  PRDDraft,
  PRDDraftInput,
  ImprovementDraft,
  AIQueryBankDraft,
} from '../llm';
import type {
  CodexTaskCategory,
  TaskPhase,
  TaskPriority,
  CodexTaskListDraft,
  CodexTaskListInput,
} from '@/types';

const MOCK_NOW = '2026-06-25T00:00:00.000Z';

/** 简易 hash：把任意 string 映射到 32-bit 整数，用于生成稳定 id / 评分。 */
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function uuid(seed: string): string {
  const h = hash32(seed);
  const seg = (n: number, len: number) => (n >>> 0).toString(16).padStart(len, '0').slice(0, len);
  return `${seg(h, 8)}-${seg(h >> 8, 4)}-${seg(h >> 16, 4)}-${seg(h >> 24, 4)}-${seg(h, 12)}`;
}

/** 6 个 category 在生成时按"项目执行顺序"输出。每个 category 对应一个 phase / priority 默认值。 */
const CATEGORY_DEFAULTS: Record<CodexTaskCategory, { phase: TaskPhase; priority: TaskPriority }> = {
  architecture: { phase: 'build', priority: 'high' },
  data_model: { phase: 'build', priority: 'high' },
  page: { phase: 'build', priority: 'medium' },
  api: { phase: 'build', priority: 'medium' },
  test: { phase: 'build', priority: 'medium' },
  deploy: { phase: 'launch', priority: 'medium' },
};

/** 从 PRD 文本里抓 1 行"路线"语句：取第一行非空的描述。仅用于 mock。 */
function firstLine(s: string): string {
  const line = s.split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  return (line ?? '').slice(0, 120);
}

function deriveFilePaths(name: string): Record<CodexTaskCategory, string[]> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mvp';
  return {
    architecture: [
      `lib/services/${slug}Service.ts`,
      'types/' + slug + '.ts',
    ],
    data_model: [
      `lib/repos/${slug}.ts`,
      `mock-data/${slug}.ts`,
    ],
    page: [
      `app/${slug}/page.tsx`,
      `app/${slug}/[id]/page.tsx`,
      `components/${slug}/${slug.charAt(0).toUpperCase() + slug.slice(1)}Form.tsx`,
    ],
    api: [
      `app/api/${slug}/route.ts`,
      `app/api/${slug}/[id]/route.ts`,
    ],
    test: [
      `lib/services/${slug}Service.test.ts`,
    ],
    deploy: [
      '.env.example',
      `scripts/deploy-${slug}.sh`,
    ],
  };
}

function clip(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function createMockLLMProvider(): LLMProvider {
  return {
    async health() {
      return { ok: true, detail: 'mock' };
    },

    async summarizeSource(source: SourceItem) {
      const cred = source.credibilityScore ?? 0;
      return `[mock summary] ${source.title} — ${source.summary ?? '(no summary)'} (type: ${source.type}, credibility: ${cred}/100)`;
    },

    async generateResearchCard(topic: ResearchTopic, sourceIds: string[]) {
      const seed = `${topic.id}:${sourceIds.join(',')}`;
      const score = 50 + (hash32(seed) % 50);
      return {
        id: uuid(`card:${seed}`),
        topicId: topic.id,
        sourceIds,
        title: `[mock] ${topic.title} — auto-generated insight`,
        summary: `Auto-generated card for "${topic.title}" drawing from ${sourceIds.length} source(s). Real LLM would expand with evidence and citations.`,
        keyInsights: [
          `Mock insight 1 derived from topic context`,
          `Mock insight 2 cross-referenced from sources`,
        ],
        evidence: sourceIds.map((id) => `Refer to source ${id}`),
        risks: ['Mock-generated; do not cite as authoritative'],
        tags: ['mock', 'auto'],
        score,
        graphEntityIds: [],
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      } satisfies ResearchCard;
    },

    async generateCardDraftFromSource(source: SourceItem): Promise<CardDraft> {
      const h = hash32(source.id);
      const score = 40 + (h % 60);
      return {
        title: `[mock] ${source.title}`,
        summary: `Auto-extracted card draft from source "${source.title}". Real LLM would distill a single-sentence claim.`,
        keyInsights: [
          `Insight 1: ${source.title} contains reusable claim`,
          `Insight 2: cross-reference with related sources`,
          `Insight 3: actionable for ${source.topicId ?? 'unbound topic'}`,
        ],
        evidence: source.url ? [source.url] : [`Source: ${source.title}`],
        risks: [
          'Mock-generated; verify with the original source',
          'Credibility score is mocked; real LLM should incorporate source.credibilityScore',
        ],
        tags: ['mock', 'auto-from-source', ...(source.tags ?? []).slice(0, 3)],
        score,
      };
    },

    async generateCardDraftFromTopic(
      topic: ResearchTopic,
      sourceIds: string[],
    ): Promise<CardDraft> {
      const h = hash32(`${topic.id}:${sourceIds.join(',')}`);
      const score = 50 + (h % 50);
      return {
        title: `[mock] ${topic.title} — synthesized from ${sourceIds.length} source(s)`,
        summary: `Topic-level card draft synthesizing "${topic.title}" from ${sourceIds.length} linked source(s). Real LLM would surface contradictions and consensus.`,
        keyInsights: [
          `Theme 1 across the sources: ${topic.title}`,
          `Theme 2: differences between sources`,
          `Theme 3: open questions for further research`,
        ],
        evidence: sourceIds.map((id) => `See source ${id}`),
        risks: [
          'Mock-generated; thematic synthesis needs human review',
          'No quantitative analysis of source agreement',
        ],
        tags: ['mock', 'auto-from-topic', ...(topic.tags ?? []).slice(0, 3)],
        score,
      };
    },

    async scoreOpportunity(opportunity: Opportunity) {
      const h = hash32(opportunity.id);
      const market = 4 + (h % 60) / 10;
      const feasibility = 4 + ((h >> 4) % 60) / 10;
      const timing = 4 + ((h >> 8) % 60) / 10;
      const differentiation = 4 + ((h >> 12) % 60) / 10;
      const total = round1((market + feasibility + timing + differentiation) / 4);
      return {
        market: clip(round1(market), 0, 10),
        feasibility: clip(round1(feasibility), 0, 10),
        timing: clip(round1(timing), 0, 10),
        differentiation: clip(round1(differentiation), 0, 10),
        total,
        rationale: `[mock] Score derived from opportunity id ${opportunity.id}. Replace with LLM-driven rationale when wiring real provider.`,
      } satisfies OpportunityScore;
    },

    async generateGEOSuggestions(brand: GEOBrandEntity, queries: AIQuery[]) {
      const pillars = brand.pillars.join(', ') || 'core';
      return [
        `[mock] Publish a "What is ${brand.canonicalName}" article targeting ${queries.length} monitored query/queries.`,
        `[mock] Add structured FAQ to homepage covering the ${pillars} pillars.`,
        `[mock] Acquire 2-3 high-authority backlinks from sources AI engines cite frequently.`,
        `[mock] Refresh existing assets older than 90 days with updated stats.`,
      ];
    },

    async generateOpportunityDraft(input: {
      signalIds: string[];
      researchCardIds: string[];
    }): Promise<OpportunityDraft> {
      const seed = [...input.signalIds, ...input.researchCardIds].sort().join('|');
      const h = hash32(seed || 'empty');
      // 用 signal / card 数量 + hash 做确定性伪内容。
      const n = input.signalIds.length;
      const m = input.researchCardIds.length;
      const slug = (h % 1000).toString(16).padStart(3, '0');
      return {
        title: `[mock draft] Opportunity ${slug} from ${n} signal(s) + ${m} card(s)`,
        description:
          `[mock] Synthesized from ${n} market signal(s) and ${m} research card(s). Refine with real evidence before publishing.`,
        targetUser: '[mock] target user — replace with ICP description',
        painPoint:
          `[mock] Likely pain point inferred from signal/category mix (hash=${h.toString(16).slice(0, 6)}). Validate with 5+ user interviews.`,
        solutionIdea:
          `[mock] Candidate solution shape: a focused MVP that addresses the pain point and rides one of the underlying trends.`,
      } satisfies OpportunityDraft;
    },

    async generatePRDDraft(input: PRDDraftInput): Promise<PRDDraft> {
      const name = input.mvpProject.name;
      const stage = input.mvpProject.stage;
      const launches = input.launchCount ?? 0;
      const opp = input.opportunity;

      // 1. 产品定位：用 mvp.name + stage 生成 1 段话
      const productPositioning = [
        `**${name}** 是一款聚焦 "${stage}" 阶段的 MVP 产品。`,
        opp
          ? `它源自机会 \`${opp.id}\`（${opp.title}），直接解决 ${opp.painPoint.split(/[。.\n]/)[0]?.slice(0, 80) ?? '该方向的市场空白'}。`
          : `它源自 ${stage} 阶段的一个内部假设，目标是验证最小可落地形态。`,
        `当前已有 ${launches} 次 launch 记录，证明方向有早期用户反馈。`,
        `差异化：相比通用工具，${name} 在 "${stage}" 阶段的执行路径上更短。`,
      ].join('\n');

      // 2. 目标用户：基于 opportunity.targetUser + 一段 ICP 描述
      const targetUsers = opp
        ? `**主 ICP**：${opp.targetUser}\n\n` +
          `**次 ICP**：相邻角色的早期采用者（contributor / reviewer / 决策链上 1 度关系）。\n\n` +
          `**反 ICP**：当前不在 ${stage} 阶段、对自动化持观望态度的团队。`
        : `**主 ICP**：${name} 的核心用户群，特点是 ${stage === 'idea' ? '高频试错' : '高效执行'}。\n\n` +
          `**次 ICP**：可能从 ${name} 衍生工具中受益的相邻角色。`;

      // 3. 核心痛点：从 opportunity.painPoint 切 3 条
      const painLines = (opp?.painPoint ?? '需要快速验证 hypothesis；缺少可复用的工具链；流程碎片化。')
        .split(/[\n•-]/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .slice(0, 3);
      if (painLines.length === 0) painLines.push('需要快速验证 hypothesis；缺少可复用工具链；流程碎片化。');
      const corePainPoints =
        painLines.map((p, i) => `${i + 1}. **${p.slice(0, 30)}${p.length > 30 ? '…' : ''}**：${p}`).join('\n');

      // 4. MVP 功能范围：4-6 个 must + 1-2 个 should
      const mustFeatures = [
        { name: 'Onboarding 流', desc: '3 步内完成首次价值', prio: 'must' },
        { name: '核心 dashboard', desc: '展示最关键的 3 个 metric', prio: 'must' },
        { name: '导出 / 报告', desc: '生成可分享的 markdown 报告', prio: 'must' },
        { name: '数据接入', desc: '支持 1 个数据源接入（mock / 手工）', prio: 'must' },
      ];
      const shouldFeatures = [
        { name: '通知', desc: '关键 event 的站内 / 邮件通知', prio: 'should' },
        { name: '搜索', desc: '跨模块全文搜索', prio: 'should' },
      ];
      const mvpFeatureScope = [
        '**Must-have（V1 必交付）**',
        ...mustFeatures.map((f) => `- [${f.prio.toUpperCase()}] **${f.name}** — ${f.desc}`),
        '',
        '**Should-have（V1.1 加）**',
        ...shouldFeatures.map((f) => `- [${f.prio.toUpperCase()}] **${f.name}** — ${f.desc}`),
        '',
        '**Won\'t-have（V1 不做）**',
        '- 多团队 / RBAC',
        '- 第三方 OAuth 集成',
        '- 移动端原生 app',
      ].join('\n');

      // 5. 页面结构：3-5 个核心 route
      const pageStructure = [
        '| Route | 用途 | 关键组件 |',
        '| --- | --- | --- |',
        '| `/` | 着陆页：产品定位 + 注册 | Hero / CTA / 简短 demo |',
        '| `/app` | 主页：核心 dashboard | Stat / Chart / Recent activity |',
        '| `/app/<resource>` | 详情页：单一资源管理 | Table / Drawer / Inline edit |',
        '| `/app/<resource>/new` | 创建页 | Form / Validation / Save |',
        '| `/settings` | 用户设置 | Profile / Billing / API keys |',
      ].join('\n');

      // 6. 数据模型：3-5 个核心 entity
      const dataModel = [
        '**核心实体（V1）**',
        '',
        '| Entity | 关键字段 | 关系 |',
        '| --- | --- | --- |',
        '| User | id, email, role, createdAt | 1—* Resource |',
        '| Resource | id, ownerId, title, status, payload | *—1 User, 1—* Activity |',
        '| Activity | id, resourceId, type, actorId, createdAt | *—1 Resource |',
        '| Report | id, resourceId, content, generatedAt | *—1 Resource |',
        '',
        '**派生视图**：Dashboard（聚合 Resource + Activity，server-side render）',
      ].join('\n');

      // 7. API 设计：4-6 个 endpoint
      const apiDesign = [
        '| Method | Path | 用途 |',
        '| --- | --- | --- |',
        '| GET | `/api/resources` | 列表 + 过滤 |',
        '| POST | `/api/resources` | 创建 |',
        '| GET | `/api/resources/:id` | 详情 |',
        '| PATCH | `/api/resources/:id` | 更新 |',
        '| DELETE | `/api/resources/:id` | 删除 |',
        '| POST | `/api/resources/:id/report` | 触发报告生成（async） |',
      ].join('\n');

      // 8. 验收标准：3-5 条
      const acceptanceCriteria = [
        '**功能验收**',
        '- [ ] 用户可在 3 步内完成 onboarding 并看到核心 dashboard',
        '- [ ] 至少 1 个数据源接入流程走通，Resource 写入与读取一致',
        '- [ ] 详情页可编辑并保存，刷新后值不变',
        '',
        '**质量验收**',
        '- [ ] Lighthouse Performance ≥ 80',
        '- [ ] 关键路径 P95 < 1.5s',
        '- [ ] 所有 form 有 inline validation',
        '',
        '**业务验收**',
        '- [ ] 5 个试用用户完成 onboarding',
        '- [ ] 至少 1 个用户生成报告',
      ].join('\n');

      // 9. 7 天开发计划
      const devPlan = [
        '**Day 1 — Setup & scaffolding**',
        '- 初始化 Next.js / TS / Tailwind',
        '- 主题与 layout 调整',
        '- mock 数据层 + service 层骨架',
        '',
        '**Day 2 — 数据层 + 列表 / 详情**',
        '- 核心 CRUD API',
        '- 列表 / 详情 / 创建 3 个页面',
        '- 表单 + 校验',
        '',
        '**Day 3 — 编辑 + 删除 + 报告导出**',
        '- 详情页编辑流',
        '- markdown 报告生成',
        '- 错误兜底',
        '',
        '**Day 4 — Onboarding + Dashboard**',
        '- 着陆页 + 注册流',
        '- 核心 dashboard（3 个 metric）',
        '- 通知占位',
        '',
        '**Day 5 — 数据接入 + 内部测试**',
        '- 1 个 mock 数据源接入',
        '- 内部 5 人 dogfood',
        '- 修高频 bug',
        '',
        '**Day 6 — Beta 开放 + 反馈收集**',
        '- 邀请 10 个外部试用',
        '- 反馈表单 + 记录',
        '- 性能 baseline 测',
        '',
        '**Day 7 — 复盘 + 决策**',
        '- 试用数据整理',
        '- 复盘文档（continued / pivot / kill）',
        '- 提交 V2 提案',
      ].join('\n');

      return {
        title: `PRD for ${name}`,
        productPositioning,
        targetUsers,
        corePainPoints,
        mvpFeatureScope,
        pageStructure,
        dataModel,
        apiDesign,
        acceptanceCriteria,
        devPlan,
      } satisfies PRDDraft;
    },


    async generateCodexTaskList(input: CodexTaskListInput): Promise<CodexTaskListDraft> {
      const name = input.mvpProject.name;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mvp';
      const desc = firstLine(input.mvpProject.description);
      const stage = input.mvpProject.stage;
      const prdVersion = input.prd.version;
      const featureLine = firstLine(input.prd.mvpFeatureScope);
      const pageLine = firstLine(input.prd.pageStructure);
      const dataLine = firstLine(input.prd.dataModel);
      const apiLine = firstLine(input.prd.apiDesign);
      const acceptanceLine = firstLine(input.prd.acceptanceCriteria);
      const devLine = firstLine(input.prd.devPlan);

      const paths = deriveFilePaths(name);

      // Pre-build 6 task drafts in a fixed order.
      const drafts: Array<{
        category: CodexTaskCategory;
        title: string;
        description: string;
        codexCommand: string;
        changedFiles: string[];
      }> = [];

      drafts.push({
        category: 'architecture',
        title: `[${name}] 设计技术架构 + 目录骨架`,
        description:
          `基于 PRD v${prdVersion} 拆解技术架构（"${stage}" 阶段）。` +
          `当前定位：${desc.slice(0, 80)}。` +
          '\n\nAcceptance: lib/services/<slug>Service.ts 与 types/<slug>.ts 存在；通过 typecheck。',
        codexCommand: `codex "在 cognitive-venture-os 中为 ${name} 建立 service + types 骨架，运行 npm run typecheck"`,
        changedFiles: paths.architecture,
      });

      drafts.push({
        category: 'data_model',
        title: `[${name}] 定义数据模型 + mock 数据 + repo`,
        description:
          `基于 PRD 的数据模型章节设计字段。` +
          `原始 line：${dataLine}` +
          '\n\nAcceptance: 至少 5 条 mock 数据；repo 增删改查走通。',
        codexCommand: `codex "为 ${name} 在 lib/repos/${slug}.ts 与 mock-data/${slug}.ts 实现 CRUD；写 5 条种子数据；运行 npm run test"`,
        changedFiles: paths.data_model,
      });

      drafts.push({
        category: 'page',
        title: `[${name}] 实现页面（列表 / 详情 / 创建）+ form`,
        description:
          `基于 PRD 页面结构章节建表 / 详情 / 创建 3 个页面。` +
          `原始 line：${pageLine}` +
          '\n\nAcceptance: 列表 / 详情 / 创建 3 个路由可访问；表单带校验。',
        codexCommand: `codex "为 ${name} 新建 app/${slug}/page.tsx + app/${slug}/[id]/page.tsx + app/${slug}/new/page.tsx + form 组件，运行 npm run build"`,
        changedFiles: paths.page,
      });

      drafts.push({
        category: 'api',
        title: `[${name}] 实现 API route 增删改查`,
        description:
          `基于 PRD API 设计章节建 REST 端点。` +
          `原始 line：${apiLine}` +
          '\n\nAcceptance: GET / POST / PATCH / DELETE 都通；返回 JSON 形态符合 PRD。',
        codexCommand: `codex "为 ${name} 在 app/api/${slug}/ 新建 route.ts 处理 GET/POST/PATCH/DELETE；返回符合 PRD 的 JSON；运行 npm run build"`,
        changedFiles: paths.api,
      });

      drafts.push({
        category: 'test',
        title: `[${name}] 补充 service 单元测试 + e2e 冒烟`,
        description:
          `基于 PRD 验收标准章节写测试。` +
          `原始 line：${acceptanceLine}` +
          '\n\nAcceptance: lib/services/${slug}Service.test.ts 覆盖核心路径；npm run test 全绿。',
        codexCommand: `codex "为 ${name} 的 service 写 vitest 单元测试（覆盖正常 / 边界 / 失败 3 类输入），运行 npm run test 确保全绿"`,
        changedFiles: paths.test,
      });

      drafts.push({
        category: 'deploy',
        title: `[${name}] 配置环境变量 + 部署脚本 + 7 天计划对齐`,
        description:
          `基于 PRD 7 天开发计划章节（${devLine}）准备 deploy 资产。` +
          '\n\nAcceptance: .env.example + 部署脚本可读；7 天计划 Day 7 复盘条目落地。',
        codexCommand: `codex "为 ${name} 新增 .env.example + scripts/deploy-${slug}.sh；确保 MVP_PIPELINE.md 复盘章节更新；运行 npm run lint && npm run build"`,
        changedFiles: paths.deploy,
      });

      const tasks: Array<{
        title: string;
        description: string;
        category: CodexTaskCategory;
        phase: TaskPhase;
        priority: TaskPriority;
        codexCommand: string;
        changedFiles: string[];
      }> = drafts.map((d) => ({
        title: d.title,
        description: d.description,
        category: d.category,
        phase: CATEGORY_DEFAULTS[d.category].phase,
        priority: CATEGORY_DEFAULTS[d.category].priority,
        codexCommand: d.codexCommand,
        changedFiles: d.changedFiles,
      }));

      return {
        summary: `${name} — 基于 PRD v${prdVersion} 派生的 6 步 Codex 任务（feature: ${featureLine.slice(0, 60)}）`,
        tasks,
      } satisfies CodexTaskListDraft;
    },

    async generateLessons(launchResult: LaunchResult) {
      // 由 launch result 的 status 决定 whatWorked / whatFailed 的初始语气；
      // user 拿到预填后通常会大幅改写，再 save。
      const status = launchResult.resultStatus;
      const seed = launchResult.id;
      const whatWorked =
        status === 'success'
          ? 'Launch 在 6 周内达到预设的成功指标，付费转化率达到目标。'
          : status === 'neutral'
            ? '部分指标达到预期（如注册数），但留存或付费转化未达目标。'
            : status === 'failed'
              ? '关键指标（转化 / 留存）未达到 kill threshold，需要诊断失败原因。'
              : '数据不足以判断成功 / 失败，建议延长观察期。';
      const whatFailed =
        status === 'success'
          ? 'Onboarding 仍有 25% 流失；获客成本高于 ARR run-rate 允许范围。'
          : status === 'neutral'
            ? '信号噪音大，难以判断下一步该 iterate 还是 pivot。'
            : status === 'failed'
              ? '客户访谈反馈"未解决核心痛点"，定位假设需要重新验证。'
              : 'Launch 后 2 周内 signups=0，监控布点可能未生效。';
      const why =
        status === 'success'
          ? 'ICP 定位与产品 messaging 高度匹配，付费意愿强。'
          : status === 'failed'
            ? 'ICP 与产品假设错位 — 目标客户的痛点强度低于假设。'
            : '部分假设成立，部分需要再验证；建议小步试错。';
      return {
        id: uuid(`lesson:${seed}`),
        projectId: launchResult.mvpProjectId,
        launchResultId: launchResult.id,
        whatWorked,
        whatFailed,
        why,
        customerInsight:
          '（待人工补充：客户原话、痛点语言、对比替代品的维度）',
        marketInsight:
          '（待人工补充：竞品动态、监管变化、宏观趋势）',
        productInsight:
          '（待人工补充：功能 / UX / 技术债的影响）',
        geoInsight:
          '（待人工补充：AI 搜索 / 答案引擎的可见度变化）',
        nextAction:
          '（待人工补充：下周具体行动 + 验证方式 + owner）',
        scoreModelSuggestion:
          '（待人工补充：OpportunityEvaluation 9 维度的权重 / 阈值调整建议）',
        createdAt: MOCK_NOW,
        updatedAt: MOCK_NOW,
      } satisfies LessonLearned;
    },
    async suggestImprovement(
      target:
        | { kind: 'prompt'; prompt: PromptVersion }
        | { kind: 'loop'; loop: LoopVersion },
    ): Promise<ImprovementDraft> {
      if (target.kind === 'prompt') {
        const p = target.prompt;
        return {
          problem: `当前 ${p.type} prompt (v${p.version}) 缺少对前序 launch 反馈的显式引用，导致输出无法针对历史痛点做差异化。`,
          suggestion: `建议 v${p.version + 1} 在 prompt 中显式加入 "prior launch feedback" 字段，并要求 LLM 在输出中引用至少 1 句客户原话。`,
        };
      }
      const loop = target.loop;
      return {
        problem: `当前 loop (v${loop.version}) 的 evaluationCriteria 没有量化指标，导致每轮输出质量参差、难横向比较。`,
        suggestion: `建议 v${loop.version + 1} 在 evaluationCriteria 中加入 1-2 个 0-100 的量化维度（如 "output completeness" / "factual accuracy"），并设置 PASS 阈值。`,
      };
    },
    async generateAIQueryBankDraft(input: {
      brand: BrandEntityProfile;
      intent: AIQueryBankIntent;
      platform: AIQueryBankPlatform;
      count: number;
    }): Promise<AIQueryBankDraft[]> {
      // Mock: 用 brand name + intent 生成确定性 seed，输出 count 个问题。
      const seed = `${input.brand.name}|${input.intent}|${input.platform}`;
      const n = Math.max(1, Math.min(input.count, 20));
      const intentPhrases: Record<AIQueryBankIntent, string[]> = {
        informational: [
          'what is',
          'how does',
          'why use',
          'overview of',
        ],
        comparison: [
          'vs',
          'compared to',
          'difference between',
          'better than',
        ],
        recommendation: [
          'best',
          'top',
          'recommend',
          'which',
        ],
        how_to: [
          'how to',
          'steps to',
          'guide to',
          'tutorial',
        ],
        review: [
          'review',
          'experience',
          'is it worth',
          'honest take',
        ],
        pricing: [
          'how much',
          'pricing',
          'cost',
          'cheap',
        ],
        alternative: [
          'alternative to',
          'cheaper than',
          'similar to',
          'instead of',
        ],
        trend: [
          'future of',
          'trend in',
          '2026 outlook',
          'where is going',
        ],
        problem_solution: [
          'how to solve',
          'fix',
          'address',
          'overcome',
        ],
      };
      const platformHint: Record<AIQueryBankPlatform, string> = {
        chatgpt: '',
        perplexity: '',
        gemini: '',
        google_ai_overview: '',
        claude: '',
      };
      const phrases = intentPhrases[input.intent];
      const out: AIQueryBankDraft[] = [];
      for (let i = 0; i < n; i++) {
        const phrase = phrases[i % phrases.length]!;
        const h = hash32(seed + '|' + i.toString());
        const priorityScore = 50 + (h % 50); // 50-99
        out.push({
          query: `${phrase} ${input.brand.name} for ${input.intent} (${platformHint[input.platform]}mock #${i + 1})`.trim(),
          intent: input.intent,
          platform: input.platform,
          priorityScore,
        });
      }
      return out;
    },
  };
}
