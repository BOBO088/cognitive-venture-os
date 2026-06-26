# AI Provider — Cognitive Venture OS

> LLMProvider 的设计 / 派发 / 成本治理的权威说明。13 工厂里第 1 个的真实实现接 OpenAI；保留 mock fallback。

## 1. 8 个核心方法

| # | 方法 | 输入 | 输出 | 备注 |
|---|---|---|---|---|
| 1 | `summarizeSource(source)` | `SourceItem` | `string` | 2-3 句摘要，保留数字 / 名字 / 关键论断 |
| 2 | `generateResearchCard(topic, sourceIds)` | `ResearchTopic` + `string[]` | `ResearchCard` | id / 时间戳由 provider 生成，service 不覆盖 |
| 3 | `scoreOpportunity(opp)` | `Opportunity` | `OpportunityScore` | 4 维 0-10 + rationale |
| 4 | `generatePRD(input)` | `PRDDraftInput` | `PRDDraft` | 9 章节 |
| 5 | `generateCodexTasks(input)` | `CodexTaskListInput` | `CodexTaskListDraft` | 固定 6 条（architecture / data_model / page / api / test / deploy） |
| 6 | `generateGEOSuggestions(brand, queries)` | `GEOBrandEntity` + `AIQuery[]` | `string[]` | 4-6 条 GEO 建议 |
| 7 | `generateLessonLearned(launch)` | `LaunchResult` | `LessonLearned` | 9 字段结构化复盘 |
| 8 | `improvePromptVersion(target)` | `{kind:'prompt'\|'loop', ...}` | `ImprovementDraft` | `{problem, suggestion}` |

调用方统一从 `@/lib/providers` 拿：

```ts
import { getLLMProvider } from '@/lib/providers';
const llm = await getLLMProvider();
const card = await llm.generateResearchCard(topic, sourceIds);
```

## 2. 派发逻辑

```
getLLMProvider()  // 在 lib/providers/index.ts 工厂里
  if (APP_MODE ∈ {staging, production} && isOpenAIConfigured())
       → createOpenAILLMProvider()  +  createFallbackLLMProvider(real, mock)
  else
       → createMockLLMProvider()
```

**关键点**：

- `isOpenAIConfigured()` 检查 `OPENAI_API_KEY` 是否非空
- 真实实现**总是**被 `FallbackLLMProvider` 包裹 —— real 失败 → mock
- dynamic import `await import('./real/llm')` 避免 demo 模式拉 `openai` SDK
- 工厂缓存单例（`_llm`），重启进程或 `clearCostLog` 不影响

## 3. 真实实现 (`lib/providers/real/llm.ts`)

### 通用 helper: `callOpenAI()`

每个 8 个核心方法都通过 `callOpenAI<T>()` helper：

```ts
async function callOpenAI<T>(args: {
  method: string;
  system: string;
  user: string;
  model?: string;     // 默认 'gpt-4o-mini'
  timeoutMs?: number; // 默认 30_000
}): Promise<{ value: T; entry: CostLogEntry }>
```

特性：

- **JSON mode** (`response_format: { type: 'json_object' }`)：强制模型返回 JSON，类型安全
- **超时**：30s `AbortController`；超时 → throw，fallback 兜底
- **错误处理**：try/catch 捕获 network / rate limit / 解析错误；抛 `LLMProvider.<method> [model]: <err>`
- **成本计算**：用 token 用量 × model 单价（gpt-4o-mini: 0.15/2.5 USD per 1M，gpt-4o: 0.6/10）→ USD 6 位小数

### 8 个方法的 prompt 设计

每个方法都有自己的 system prompt，强调"具体 / 可验证 / 不要发明"。详见 `lib/providers/real/llm.ts`。共同原则：

- **System prompt**：固定指令 + 输出 JSON schema
- **User prompt**：拼装领域字段（topic / source / opp / launch / prompt）
- **温度未显式设**（OpenAI 默认 1.0）—— 后续可调低（0.3-0.5）以提高一致性

### 5 个未实现的方法

`generateCardDraftFromSource` / `generateCardDraftFromTopic` / `generateOpportunityDraft` / `generateAIQueryBankDraft` —— real 实现**抛** `LLMProvider.<method>: not implemented in real mode`，由 `FallbackLLMProvider` 捕获，调用 mock 拿值。**这是有意的**：

- 用户明确要求 8 个核心方法 —— 真实实现只覆盖这 8 个
- 5 个 draft 方法本身有专用 service 层包装（researchCardService / opportunityService / aiQueryService），它们有自己的 mock 行为
- 不假装"real mode 也支持"是诚实的工程态度

## 4. Fallback 包装 (`lib/providers/real/fallback.ts`)

`FallbackLLMProvider` 是个无状态包装（除了 fallback log）：

```ts
async wrap(method, primaryFn, fallbackFn) {
  try { return await primaryFn(); }
  catch (e) {
    fallbackLog.push({ method, primaryError: e.message, timestamp });
    console.warn(`[LLMProvider.fallback] ${method} → mock (primary error: ...)`);
    return fallbackFn();
  }
}
```

触发 fallback 的场景：

- OpenAI 30s 超时
- OpenAI 返回 5xx / rate limit / 内容审核
- Real 自己抛 `not implemented in real mode`（5 个 draft 方法）

包装对调用方**透明**（仍是 `LLMProvider` 接口），`getCostLog()` 会把 fallback 事件展平成 `model='mock-fallback'` 的 `CostLogEntry`，方便 dashboard 看到 fallback 频率。

## 5. 成本日志

```ts
export interface CostLogEntry {
  method: string;            // 'summarizeSource' / 'generatePRD' / ...
  model: string;             // 'gpt-4o-mini' / 'mock' / 'mock-fallback'
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;           // 估算（6 位小数）
  durationMs: number;
  fallback: boolean;
  error?: string;
  timestamp: string;
}
```

API：

```ts
const llm = await getLLMProvider();
llm.getCostLog();    // readonly 拷贝
llm.clearCostLog();  // 清空（测试 / 周期归零）
```

**特性**：

- Real 实现：每次成功 / 失败调用都写 entry
- Mock 实现：永远返 `[]`（没有真实 token 消耗）
- Fallback 包装：把 fallback 事件也展平为 entry（`model='mock-fallback'`, `fallback=true`）
- **不持久化**：进程重启即清空（接入 DB 后改成 `costLogService` 写 `cost_log` 表）

## 6. 错误处理 / 超时 / 重试

| 维度 | 当前实现 | 后续 TODO |
|---|---|---|
| 超时 | `AbortController` 30s | 按方法可配（PRD 应 > Codex Task 应 <） |
| 重试 | 无 | 加指数退避（针对 429 / 5xx） |
| Rate limit | 透传 OpenAI 错 → fallback mock | 加 429-aware backoff |
| 内容审核 | 透传 OpenAI 错 → fallback mock | 区分 prompt 错 vs 内容错 |
| 配额预警 | 无 | 接入 OpenAI usage API，按月预算告警 |

## 7. 模型选择

当前硬编码 `gpt-4o-mini`（性价比高，~99% 场景够用）。要切到 `gpt-4o`：

- 改 `lib/providers/real/llm.ts` 的 `DEFAULT_MODEL`
- 或加 env `OPENAI_DEFAULT_MODEL=gpt-4o-mini`，`getServerEnv()` 读取

`MODEL_PRICES` 表需要在加新 model 时同步更新（否则 cost = 0）。

## 8. 文件清单

| 文件 | 作用 |
|---|---|
| `lib/providers/llm.ts` | LLMProvider 接口 + 8 个核心方法签名 + CostLogEntry + 4 个 draft 类型 |
| `lib/providers/mock/llm.ts` | mock 实现（确定性 hash 输出，13 方法全覆盖） |
| `lib/providers/real/llm.ts` | OpenAI 实现（8 核心方法 + 5 draft 抛 not-implemented） |
| `lib/providers/real/fallback.ts` | FallbackLLMProvider 包装（real → mock on error） |
| `lib/providers/index.ts` | getLLMProvider 工厂 + env 派发 |
| `lib/env.ts` | `isOpenAIConfigured()` helper（与 supabase 同模式） |
| `lib/services/{prd,lesson,codexTaskGenerator,promptVersion,loopVersion}Service.ts` | 调用方，已改为新方法名 |

## 9. 接入真实 OpenAI

```bash
# .env.local / Vercel
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_MODE=staging   # 或 production
```

`isOpenAIConfigured()` 返 true，工厂自动用 `FallbackLLMProvider(OpenAILLMProvider, MockLLMProvider)`。不需要改任何 service / page 代码。

## 10. 已知限制

- **5 个 draft 方法 real 没实现**：故意为之（用户明确要求 8 核心方法）。后续如果需要，把对应的 mock 行为搬到 real/llm.ts 即可，interface 不动
- **没有重试**：单次失败立即 fallback。OpenAI 偶发 5xx 会被吞，UX 上仍是 mock 输出。后续加指数退避
- **cost log 不持久化**：重启清空。后续接 `costLogService` 写 DB
- **没有模型路由**：所有方法都用同一个 model。后续可以按方法路由（小任务 mini / 复杂任务 4o）
- **超时固定 30s**：不能按方法调。后续把 `timeoutMs` 提到 `getServerEnv()` 配
- **没用 streaming**：UI 拿不到 partial output。如果未来 UI 要"打字机效果"，需要重构成 async iterable
- **没在真实 OpenAI 上跑过**：本机没 OPENAI_API_KEY，所有 8 方法编译过 + 类型对，**第一次部署必须做集成测试**
- **mock fallback 静默**：失败时只 `console.warn`，UI 不会感知"我刚拿到的是 mock 输出"。如果要给用户显式信号，可以让 `getCostLog()` 在 dashboard 高亮 fallback 频率
