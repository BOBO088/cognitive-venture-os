/**
 * PRD 域：MVPProject → PRD。
 *
 * 一份 PRD 对应一个 MVPProject 的某一版本产品需求文档。
 * 同一 MVPProject 可有多个 version（v1, v2, v3...），由 service 自动递增。
 *
 * 9 个内容段全部用 text 存（service 只做长度校验，不解析结构）：
 *   - 段落型：productPositioning / targetUsers / corePainPoints
 *   - 列表型：mvpFeatureScope / pageStructure / apiDesign / acceptanceCriteria / devPlan
 *   - 结构型：dataModel
 *
 * 解析（用于 markdown 渲染 / LLM 回写）由 export 层和 LLMProvider 自行处理；
 * service 保持纯净。
 */

/**
 * PRD — Product Requirements Document。
 *
 * 字段约束（service 层强制）：
 *   - title 1-200 字符
 *   - 9 个 section 各 1-20000 字符（容纳 markdown / 多行列表）
 *   - version ≥ 1（service 按 mvpProjectId 自动递增）
 *   - mvpProjectId 必须存在（service 校验）
 *   - generatedByMock 仅作为提示字段，UI 渲染时显示「[mock]」标记
 *   - id 唯一性
 *   - createdAt / updatedAt 由调用方提供
 */
export interface PRD {
  id: string;
  /** 来源 MVPProject.id。手动选择；service 校验引用存在。 */
  mvpProjectId: string;
  /** 版本号，每个 MVPProject 内部从 1 自动递增。 */
  version: number;
  /** 标题。1-200 字符。默认 = "PRD for <MVPProject.name> v<version>"。 */
  title: string;
  /** 1. 产品定位。一段话。1-20000 字符。 */
  productPositioning: string;
  /** 2. 目标用户。一段话 + ICP 描述。1-20000 字符。 */
  targetUsers: string;
  /** 3. 核心痛点。1-20000 字符。 */
  corePainPoints: string;
  /** 4. MVP 功能范围。markdown bullet 列表 / 表格。1-20000 字符。 */
  mvpFeatureScope: string;
  /** 5. 页面结构。route + 用途。1-20000 字符。 */
  pageStructure: string;
  /** 6. 数据模型。markdown 列表 / 表格。1-20000 字符。 */
  dataModel: string;
  /** 7. API 设计。endpoint 列表。1-20000 字符。 */
  apiDesign: string;
  /** 8. 验收标准。Given/When/Then 或 bullet。1-20000 字符。 */
  acceptanceCriteria: string;
  /** 9. 7 天开发计划。Day 1..7 + tasks。1-20000 字符。 */
  devPlan: string;
  /** 标记是否由 mock LLMProvider 生成。UI 用 [mock] 提示。 */
  generatedByMock: boolean;
  createdAt: string;
  updatedAt: string;
}
