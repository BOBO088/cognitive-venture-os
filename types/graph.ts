/**
 * Graph 域：知识图谱的节点和边。
 *
 * GraphEntity = 节点；
 * GraphRelation = 边（有向，sourceEntityId → targetEntityId）。
 *
 * 与 Research 域通过 graphEntityIds (card → entity) /
 * entity.linkedResearchCardIds (entity → card, derived) /
 * relation.linkedResearchCardIds (relation → card, manual) 关联。
 */

/** 节点类型。12 个枚举值，覆盖常见知识图谱节点。 */
export type GraphEntityKind =
  | 'company'
  | 'product'
  | 'person'
  | 'technology'
  | 'market'
  | 'trend'
  | 'investor'
  | 'ip'
  | 'character'
  | 'content_asset'
  | 'platform'
  | 'tool';

/**
 * GraphEntity — 知识图谱中的一个节点。
 *
 * 代表一个可被识别的实体。aliases 用于实体消歧（合并同名异指）。
 * metadata 允许挂载任意领域属性（国家、行业、融资阶段等），值为基本类型。
 * tags 是结构化的自由标签（service 层规范化）。
 * linkedResearchCardIds 是 ResearchCard.graphEntityIds 的反查视图（service 层派生）。
 */
export interface GraphEntity {
  id: string;
  name: string;
  kind: GraphEntityKind;
  /** 别名 / 拼写变体（用于实体合并时的查找键）。 */
  aliases: string[];
  /** 简要描述。 */
  description?: string;
  /** 自由属性，值限定为 string/number/boolean 以保证序列化。 */
  metadata: Record<string, string | number | boolean>;
  /** 自由标签，service 层规范化（lowercase / 空格→'-' / 截断 32 / 去重 / ≤ 20）。 */
  tags: string[];
  /** 反向引用：哪些 ResearchCard.graphEntityIds 包含本 entity.id。由 service 派生。 */
  linkedResearchCardIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 关系类型。语义为 sourceEntityId 对 targetEntityId 的有向动作。 */
export type GraphRelationKind =
  | 'competes_with'
  | 'invested_by'
  | 'built_by'
  | 'uses'
  | 'belongs_to'
  | 'growing_in'
  | 'mentioned_in'
  | 'supports'
  | 'contradicts'
  | 'influences'
  | 'similar_to'
  | 'alternative_to';

/** 关系强度上下界（整数 0..100）。 */
export const RELATION_STRENGTH_MIN = 0;
export const RELATION_STRENGTH_MAX = 100;

/**
 * GraphRelation — 知识图谱中的一条有向边。
 *
 * 描述两个 GraphEntity 之间的关系。sourceEntityId / targetEntityId 均为
 * GraphEntity.id。禁止 self-loop（在数据层校验）。
 *
 * linkedResearchCardIds 与 entity 上的同名字段**语义不同**：
 *   - entity.linkedResearchCardIds：派生视图，service 从 cards.graphEntityIds 计算
 *   - relation.linkedResearchCardIds：手动管理，UI 提供 bind/unbind 操作
 *   详见 KNOWLEDGE_GRAPH.md §7。
 */
export interface GraphRelation {
  id: string;
  /** 源 GraphEntity.id。 */
  sourceEntityId: string;
  /** 目标 GraphEntity.id。 */
  targetEntityId: string;
  /** 关系类型。 */
  relationType: GraphRelationKind;
  /** 关系强度，0..100 整数。 */
  strength: number;
  /** 支撑该关系的证据（自然语言描述或 URL）。 */
  evidence?: string;
  /** 手动管理的反向引用：哪些 ResearchCard 显式绑定了本 relation。 */
  linkedResearchCardIds: string[];
  createdAt: string;
  updatedAt: string;
}
