/**
 * Research 域：研究主题、资料源、研究卡片。
 *
 * 流转关系：ResearchTopic 引用 SourceItem → 浓缩为 ResearchCard。
 * ResearchCard 是下游 Signal / Opportunity 的事实基础。
 */

/** ResearchTopic 的生命周期。 */
export type ResearchTopicStatus = 'active' | 'completed' | 'archived';

/** 主题分类。 */
export type ResearchCategory =
  | 'ai'
  | 'ip'
  | 'geo'
  | 'short_video'
  | 'saas'
  | 'investment'
  | 'other';

/** 主题优先级。 */
export type ResearchPriority = 'low' | 'medium' | 'high';

/**
 * ResearchTopic — 一个研究主题。
 *
 * 表示 agent 或人对一个具体问题的持续研究单元。ResearchTopic 是 ResearchCard、
 * SourceItem、Signal 在业务语义上的根节点，但物理上不强制级联删除。
 *
 * 字段分层：
 * - 必填：id / title / status / createdAt / updatedAt / sourceIds / cardIds / signalIds
 * - 业务描述（新增）：description? / category? / priority? / tags?
 * - 深度链接（保留，optional）：question? / scope? / ownerId? / parentTopicId?
 *
 * 注：question / scope 改为 optional 以兼容新轻量 topic；已有 mock 数据保留旧值。
 */
export interface ResearchTopic {
  /** UUID。 */
  id: string;
  /** 一句话主题名（dashboard / 列表显示用）。 */
  title: string;
  /** 业务侧描述（新增）。UI 在详情页直接显示。 */
  description?: string;
  /** 分类（新增）。 */
  category?: ResearchCategory;
  /** 优先级（新增）。默认 'medium'。 */
  priority?: ResearchPriority;
  /** 自由标签（新增）。如 ['tam', 'q3-2026']。 */
  tags?: string[];
  /** 核心研究问题（自然语言，问号结尾）。optional：轻量 topic 可省略。 */
  question?: string;
  /** 范围说明：要包含什么、不包含什么。optional。 */
  scope?: string;
  /** 当前状态。 */
  status: ResearchTopicStatus;
  /** 负责人/agent 的 id（业务上指向 Agent.id 或外部人员标识）。 */
  ownerId?: string;
  /** 父主题 id，支持主题树。 */
  parentTopicId?: string;
  /** 关联的 SourceItem id 列表。 */
  sourceIds: string[];
  /** 关联的 ResearchCard id 列表。 */
  cardIds: string[];
  /** 由此主题产出的 Signal id 列表。 */
  signalIds: string[];
  /** ISO 8601。 */
  createdAt: string;
  /** ISO 8601。 */
  updatedAt: string;
}

/** SourceItem 的来源形态。 */
export type SourceType =
  | 'article'
  | 'paper'
  | 'video'
  | 'website'
  | 'note'
  | 'report'
  | 'book'
  | 'podcast';

/** 可信度分值范围。 */
export const CREDIBILITY_MIN = 0;
export const CREDIBILITY_MAX = 100;

/**
 * SourceItem — 一条研究资料。
 *
 * 外部世界的原子化信源（URL / 论文 / 文章 / 报告 / 笔记 / 书）。MVP 阶段一个
 * SourceItem 绑定到 0 或 1 个 ResearchTopic（topicId）。多 topic 共享用"创建多条
 * 同 URL 源"或后续加 additionalTopicIds 字段。
 */
export interface SourceItem {
  id: string;
  /** 主要绑定的 ResearchTopic.id。可选：source 可不挂在任何 topic 下。 */
  topicId?: string;
  title: string;
  /** 资料链接（内部笔记 / 上传文件可为空）。 */
  url?: string;
  /** 来源类型。 */
  type: SourceType;
  /** 一段摘要。 */
  summary?: string;
  /** 可信度评分，0..100。 */
  credibilityScore?: number;
  /** 自由标签。 */
  tags?: string[];
  /** 私人笔记 / 评论。 */
  notes?: string;
  /** 作者或发布方（optional metadata）。 */
  author?: string;
  /** ISO 8601，原始发布日期（optional metadata）。 */
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ResearchCard — 一张结构化研究卡片。
 *
 * 把一条或多条 SourceItem 浓缩成可独立消费、可在 dashboard 滚动的洞察卡片。
 * 字段分层：
 *   - 核心：title + summary（一段话讲清楚）
 *   - 结构化：keyInsights / evidence / risks（列表化）
 *   - 标注：tags / score（0..100，替代原 confidence 0..1）
 *   - 关联：topicId / sourceIds（必填或可选的反向链接）
 *   - 元：graphEntityIds / signalId（optional 深度链接）
 *
 * 通常一卡一观点。导出 Markdown 时按此结构渲染。
 */
export interface ResearchCard {
  id: string;
  /** 所属 ResearchTopic.id。 */
  topicId: string;
  /** 引用的 SourceItem.id 列表。 */
  sourceIds: string[];
  /** 卡片标题。 */
  title: string;
  /** 核心摘要：一段话说清楚这张卡片的结论。 */
  summary: string;
  /** 关键洞察：3-5 条可独立消费的 insight。 */
  keyInsights?: string[];
  /** 证据列表：支撑该卡片的数据 / 引用 / 链接。 */
  evidence?: string[];
  /** 风险提醒：可证伪点 / 反例 / 局限。 */
  risks?: string[];
  /** 自由标签（如 ['market', 'tam', '2026']）。 */
  tags?: string[];
  /** 重要性评分，0..100。 */
  score?: number;
  /** 涉及到的知识图谱实体 id。 */
  graphEntityIds?: string[];
  /** 若由某条 Signal 触发，记录之。 */
  signalId?: string;
  createdAt: string;
  updatedAt: string;
}
