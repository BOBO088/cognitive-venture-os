/**
 * Learning 域：LessonLearned。
 *
 * 落地链路：Opportunity → MVPProject → LaunchResult → LessonLearned。
 *
 * LessonLearned（v2 字段口径，2026-06-26）：复盘文档结构。
 * 把原来"知识条目"型的 (title + category + summary + detail + applicableWhen)
 * 重塑为"复盘报告"型 (success/failure + 4 个 insight 轴 + 后续行动 + 评分模型建议)。
 * 这一变化对应复盘流程的成熟：单条 lesson 不再是抽象经验，而是一份针对某次
 * launch 的具体诊断，结构化输出可直接喂给 Opportunity 评估和 MVP 设计。
 *
 * 与上下游的引用关系（v2，2026-06-26）：
 *   - LessonLearned.projectId → MVPProject.id
 *   - LessonLearned.launchResultId? → LaunchResult.id（可选：可从 launch 派生
 *     也可从自由复盘 / opportunity evaluation / GEO 观察产生）
 *
 * 删字段（v1 → v2）：
 *   - title  → 不再需要；用 whatWorked / whatFailed / why 三段式代替
 *   - category (LessonCategory)  → 被 4 个 insight 轴（customer / market /
 *     product / geo）+ nextAction 拆分
 *   - summary + detail + applicableWhen  → 都被具体洞察字段代替
 *   - opportunityId  → 反向通过 MVPProject.opportunityId 查询即可
 *   - sourceIds  → 引用由 insight 字段内嵌的 markdown link 表达，避免外键
 *
 * 新字段（v1 → v2）：whatWorked, whatFailed, why, customerInsight, marketInsight,
 * productInsight, geoInsight, nextAction, scoreModelSuggestion。
 */

/**
 * LessonLearned — 一次复盘的结构化记录。
 *
 * 字段约束（service 层强制）：
 *   - projectId 必须存在（service 校验）
 *   - launchResultId 可选；若提供必须存在（service 校验）
 *   - whatWorked / whatFailed / why 1-4000 字符
 *   - 4 个 insight 字段（customer / market / product / geo）各 1-4000 字符
 *   - nextAction 1-4000 字符
 *   - scoreModelSuggestion 1-4000 字符
 *   - id 唯一性
 *   - createdAt / updatedAt 由调用方提供
 */
export interface LessonLearned {
  id: string;
  /** 关联的 MVPProject.id。Lesson 必须挂在一个项目下。 */
  projectId: string;
  /** 关联的 LaunchResult.id（可选）。可从 launch 派生，也可独立复盘。 */
  launchResultId?: string;
  /** 这次 launch 哪些做法有效。1-4000 字符。 */
  whatWorked: string;
  /** 这次 launch 哪些做法失败。1-4000 字符。 */
  whatFailed: string;
  /** 成功 / 失败背后的因果推断。1-4000 字符。 */
  why: string;
  /** 用户洞察：客户在用什么语言、卡在哪、怎么对比替代品。1-4000 字符。 */
  customerInsight: string;
  /** 市场洞察：竞品、监管、宏观趋势的影响。1-4000 字符。 */
  marketInsight: string;
  /** 产品洞察：功能、UX、技术债的影响。1-4000 字符。 */
  productInsight: string;
  /** GEO 洞察：AI 搜索 / 答案引擎的可见度、引用位次、内容形态。1-4000 字符。 */
  geoInsight: string;
  /** 下一步具体行动（人 / 时限 / 验证方式）。1-4000 字符。 */
  nextAction: string;
  /**
   * 评分模型改进建议。可指向 OpportunityEvaluation 的 9 维度权重、阈值、
   * 或新维度。1-4000 字符。service 不做结构化解析；UI 端以 markdown 渲染。
   */
  scoreModelSuggestion: string;
  createdAt: string;
  updatedAt: string;
}
