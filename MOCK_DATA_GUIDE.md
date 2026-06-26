# MOCK_DATA_GUIDE — Cognitive Venture OS

> Mock 数据层使用指南。所有数据在 `mock-data/`，查询入口在 `lib/repos/`。

## 1. 目录布局

```
mock-data/                   静态数据 (raw)
├── research.ts              5 topics + 7 sources + 8 cards
├── knowledge-graph.ts       10 entities + 11 relations
├── opportunities.ts         7 signals + 5 opps + 9 evaluations
├── mvp-projects.ts          5 MVPs + 6 launch results
├── geo.ts                   5 brands + 7 assets + 8 queries + 11 checks
└── learning.ts              8 lessons

lib/repos/                   查询入口 (RSC 内 await 调用)
├── research.ts              listResearchTopics / listResearchCards / ...
├── knowledge-graph.ts       listGraphEntities / listGraphRelationsByEntity
├── opportunities.ts         listSignals / listOpportunities / listEvaluationsByOpportunity
├── mvp.ts                   listMVPProjects / listLaunchResultsByMVP
├── geo.ts                   listBrands / listAIQueriesByBrand / listCitationChecksByQuery
├── learning.ts              listLessons / listLessonsByCategory / listLessonsByMVP
└── index.ts                 barrel
```

## 2. 铁律

### 2.1 页面 / API **不直接 import mock-data**
```ts
// ❌ 错
import { mockMVPProjects } from '@/mock-data/mvp-projects';

// ✅ 对
import { listMVPProjects } from '@/lib/repos';
```
原因：未来切到 Supabase 时只改 repo 函数体，UI 与 API 零改动。

### 2.2 mock-data 顶层不用 `new Date()`
所有时间字段用**字面量 ISO 字符串**。原因见 `CODEBASE_RISKS.md` R0-3：
模块顶层 `new Date()` 在 SSG 模式下 build 时执行一次，部署后永远显示 build 时刻。

### 2.3 跨类型只通过 `id` 关联
mock 数据**不嵌入对象**，用 `xxxIds: string[]` 反向冗余。例：
```ts
{ id: 'topic_geo_market_2026', sourceIds: ['src_xxx', 'src_yyy'] }
```

## 3. 数据故事线

围绕"GEO 赛道"展开一条主轴：

```
[外部信号]
  sig_perplexity_funding (融资)
  sig_openai_search_launch (SearchGPT 公测)
  sig_apple_intelligence
  ...
  ↓ 触发
[机会]
  opp_geo_monitor ──→ 评估 3 次 (5/20, 6/5, 6/22, 分数从 7.2 → 8.3)
  opp_citation_optimizer
  opp_aarw_consulting (killed)
  ...
  ↓ 派生
[MVP]
  mvp_geo_pulse (beta)  ──→ result_geo_pulse_beta + v1
  mvp_citeboost (building)
  mvp_signal_radar (iterating)  ──→ v1 + v2
  mvp_aarw_academy (killed)
  ↓ 产出
[复盘]
  lesson_geo_lag, lesson_brand_clarity, lesson_citation_decay ...
  lesson_killed_aarw, lesson_iteration_speed ...
```

并行轨道：

```
[GEO 监控]
  brand_cvo (自己) + 4 竞品
    └─ query_xxx × N
        └─ check_xxx (按时间)
            └─ verdict: cited / mentioned / absent / competitor_only
```

```
[知识图谱]
  10 个 entity (Perplexity / OpenAI / Anthropic / Google / CVO / Krishna / llms.txt / MCP / GEO / AARW)
    └─ 11 条边 (竞合 / 投资 / 技术依赖 / 著作)
```

## 4. 用法示例

### 4.1 RSC 页面读数据
```tsx
// app/research/page.tsx
import { listResearchTopics } from '@/lib/repos';

export default async function ResearchPage() {
  const topics = await listResearchTopics();
  return (
    <ul>
      {topics.map((t) => <li key={t.id}>{t.title}</li>)}
    </ul>
  );
}
```

### 4.2 跨域 join（页面内手动）
```tsx
import { listMVPProjects, listLessonsByMVP } from '@/lib/repos';

const mvp = await getMVPProject('mvp_geo_pulse');
const lessons = mvp ? await listLessonsByMVP(mvp.id) : [];
```

### 4.3 画趋势线
```tsx
import { listEvaluationsByOpportunity } from '@/lib/repos';

const evals = await listEvaluationsByOpportunity('opp_geo_monitor');
// evals 按时间升序, 直接给 chart 库
```

## 5. 数据条数（达标检查）

| 类型 | 条数 | 域 |
|---|---|---|
| ResearchTopic | 5 | research |
| SourceItem | 7 | research |
| ResearchCard | 8 | research |
| GraphEntity | 10 | graph |
| GraphRelation | 11 | graph |
| Signal | 7 | opportunities |
| Opportunity | 5 | opportunities |
| OpportunityEvaluation | 9 | opportunities |
| MVPProject | 5 | mvp-projects |
| LaunchResult | 6 | mvp-projects |
| GEOBrandEntity | 5 | geo |
| GEOContentAsset | 7 | geo |
| AIQuery | 8 | geo |
| CitationCheckResult | 11 | geo |
| LessonLearned | 8 | learning |
| **合计** | **112** 条 | 6 文件 |

> 全部 15 个核心类型 ≥ 5 条 ✅

## 6. ID 命名规范

| 类型 | 前缀 | 例 |
|---|---|---|
| ResearchTopic | `topic_` | `topic_geo_market_2026` |
| SourceItem | `src_` | `src_perplexity_funding` |
| ResearchCard | `card_` | `card_geo_definition` |
| GraphEntity | `entity_` | `entity_perplexity` |
| GraphRelation | `rel_` | `rel_perp_vs_openai` |
| Signal | `sig_` | `sig_perplexity_funding` |
| Opportunity | `opp_` | `opp_geo_monitor` |
| OpportunityEvaluation | `eval_` | `eval_geo_monitor_1` |
| MVPProject | `mvp_` | `mvp_geo_pulse` |
| LaunchResult | `result_` | `result_geo_pulse_v1` |
| GEOBrandEntity | `brand_` | `brand_cvo` |
| GEOContentAsset | `asset_` | `asset_cvo_geo_guide` |
| AIQuery | `query_` | `query_best_geo_tool` |
| CitationCheckResult | `check_` | `check_q1_2026_06_25` |
| LessonLearned | `lesson_` | `lesson_geo_lag` |

> slug 而非 UUID，便于人工读 + grep。生产环境 Supabase 用 UUID 替换。

## 7. 切到 Supabase 的替换点

未来做数据层迁移时，按文件改函数体即可，**类型与调用方零改动**：

```ts
// lib/repos/research.ts (现)
export async function listResearchTopics(): Promise<ResearchTopic[]> {
  return mockResearchTopics;  // ← 改这里
}

// (切到 Supabase 后)
export async function listResearchTopics(): Promise<ResearchTopic[]> {
  const { data, error } = await supabase
    .from('research_topics')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`...`);
  return data;
}
```

`mock-data/` 文件保留作为测试 fixture，不需要删除。
