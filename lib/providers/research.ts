/**
 * ResearchProvider — 研究阶段的 AI 辅助。
 *
 * 与 LLMProvider 的区别：LLMProvider 是通用文本生成；
 * ResearchProvider 专注于研究语义（找相关、抽洞察、合并卡片）。
 */

import type {
  ResearchTopic,
  ResearchCard,
  SourceItem,
  GraphEntity,
  GraphRelation,
} from '@/types';

export interface ResearchProvider {
  health(): Promise<{ ok: boolean; detail?: string }>;

  /** 从一段种子描述生成一批研究主题候选。 */
  suggestTopics(seed: string, count?: number): Promise<ResearchTopic[]>;

  /** 从一条资料里抽取若干 ResearchCard。 */
  extractInsights(source: SourceItem, count?: number): Promise<ResearchCard[]>;

  /** 在卡片库里找与给定卡片相关的其他卡片。 */
  findRelatedCards(
    card: ResearchCard,
    allCards: ResearchCard[],
    limit?: number,
  ): Promise<ResearchCard[]>;

  /** 推测某实体可能存在的关系（用于图谱补全）。 */
  expandGraph(entity: GraphEntity): Promise<GraphRelation[]>;
}
