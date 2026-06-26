/**
 * DashboardService — 跨域聚合根 / Dashboard 所需数据。
 *
 * 7 大域的统计 + 12 个 Provider/Connector health + 最近 8 条更新。
 * UI (app/page.tsx) 通过本服务获取 DashboardSnapshot，不再直接读 mock-data。
 *
 * 未来切真实数据库时：本服务改为调 SQL view（`dashboard_snapshot`），
 * 调用方零改动。
 */

import {
  listTopics,
} from './researchTopicService';
import { listSources } from './sourceService';
import { listCards } from './researchCardService';
import { listEntities } from './graphEntityService';
import { listRelations } from './graphRelationService';
import { listSignals } from './signalService';
import { listOpportunities } from './opportunityService';
import { listMVPProjects } from './mvpProjectService';
import { listLaunchResults } from './launchResultService';
import { listLessons } from './lessonService';
import { listBrandEntityProfiles } from './geoBrandService';
import { listAIQueryBankItems } from './aiQueryService';
import { listContentAssets } from './contentAssetService';
import { getAllProvidersHealth, type ProviderHealth } from '@/lib/providers';
import { mockTasks } from '@/mock-data/tasks';

/** Dashboard 7 大域单项统计。 */
export interface DomainStat {
  /** 域 id（小写，短），用于 className / key。 */
  key: string;
  /** 域中文 / 英文标签。 */
  label: string;
  /** 域主入口路径。 */
  href: string;
  /** 该域内核心实体的当前条数。 */
  count: number;
  /** 一句话 hint。 */
  hint: string;
}

/** 最近更新条目。 */
export interface RecentItem {
  id: string;
  /** 域 id，对应 DomainStat.key。 */
  domain: string;
  /** 实体名 / 标题。 */
  title: string;
  /** 详情页路径。 */
  href: string;
  /** ISO 8601。 */
  updatedAt: string;
}

/** Dashboard 完整快照。 */
export interface DashboardSnapshot {
  /** 7 大域单项统计。 */
  stats: DomainStat[];
  /** 12 个 Provider/Connector 健康状态。 */
  providers: ProviderHealth[];
  /** 最近 8 条更新（按 updatedAt desc 排序）。 */
  recent: RecentItem[];
  /** 时间戳：调用时刻。 */
  generatedAt: string;
}

/** 抓 8 条 updatedAt 最近的"代表项"。 */
async function pickRecent(): Promise<RecentItem[]> {
  const all: RecentItem[] = [];
  const topics = await listTopics();
  topics.forEach((t) => all.push({ id: t.id, domain: 'research', title: t.title, href: `/research/topics/${t.id}`, updatedAt: t.updatedAt }));
  const cards = await listCards();
  cards.forEach((c) => all.push({ id: c.id, domain: 'research', title: c.title, href: `/research/cards/${c.id}`, updatedAt: c.updatedAt }));
  const entities = await listEntities();
  entities.forEach((e) => all.push({ id: e.id, domain: 'graph', title: e.name, href: `/graph/entities/${e.id}`, updatedAt: e.updatedAt }));
  const relations = await listRelations();
  relations.forEach((r) => all.push({ id: r.id, domain: 'graph', title: `${r.sourceEntityId} ${r.relationType} ${r.targetEntityId}`, href: `/graph/relations/${r.id}`, updatedAt: r.updatedAt }));
  const signals = await listSignals();
  signals.forEach((s) => all.push({ id: s.id, domain: 'opportunities', title: s.title, href: `/opportunities/signals/${s.id}`, updatedAt: s.updatedAt }));
  const opps = await listOpportunities();
  opps.forEach((o) => all.push({ id: o.id, domain: 'opportunities', title: o.title, href: `/opportunities/${o.id}`, updatedAt: o.updatedAt }));
  const mvps = await listMVPProjects();
  mvps.forEach((m) => all.push({ id: m.id, domain: 'mvp', title: m.name, href: `/mvp/${m.id}`, updatedAt: m.updatedAt }));
  const brands = await listBrandEntityProfiles();
  brands.forEach((b) => all.push({ id: b.id, domain: 'geo', title: b.name, href: `/geo/brands/${b.id}`, updatedAt: b.updatedAt }));
  const launches = await listLaunchResults();
  launches.forEach((l) => all.push({ id: l.id, domain: 'learning', title: `Launch · ${l.mvpProjectId}`, href: `/learning/launch-results/${l.id}`, updatedAt: l.updatedAt }));
  const lessons = await listLessons();
  lessons.forEach((les) => all.push({ id: les.id, domain: 'learning', title: `Lesson · ${les.projectId}`, href: `/learning/lessons/${les.id}`, updatedAt: les.updatedAt }));
  mockTasks.forEach((t) => all.push({ id: t.id, domain: 'codex', title: t.title, href: `/codex-tasks/${t.id}`, updatedAt: t.updatedAt }));
  // 按 updatedAt desc，取前 8
  all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return all.slice(0, 8);
}

/** 抓 7 大域统计。 */
async function pickStats(): Promise<DomainStat[]> {
  const [topics, sources, cards, entities, relations, signals, opps, mvps, brands, queries, assets, launches, lessons] = await Promise.all([
    listTopics(),
    listSources(),
    listCards(),
    listEntities(),
    listRelations(),
    listSignals(),
    listOpportunities(),
    listMVPProjects(),
    listBrandEntityProfiles(),
    listAIQueryBankItems(),
    listContentAssets(),
    listLaunchResults(),
    listLessons(),
  ]);
  return [
    { key: 'research',     label: 'Research topics',  href: '/research/topics',     count: topics.length,                          hint: `${sources.length} sources · ${cards.length} cards` },
    { key: 'graph',        label: 'Graph entities',   href: '/graph/entities',      count: entities.length,                        hint: `${relations.length} relations` },
    { key: 'opportunities',label: 'Signals',          href: '/opportunities/signals', count: signals.length,                       hint: `${opps.length} opportunities` },
    { key: 'mvp',          label: 'MVP projects',     href: '/mvp',                 count: mvps.length,                            hint: 'from validation to revenue' },
    { key: 'geo',          label: 'GEO brands',       href: '/geo/brands',          count: brands.length,                          hint: `${queries.length} queries · ${assets.length} assets` },
    { key: 'learning',     label: 'Launches',         href: '/learning/launch-results', count: launches.length,                    hint: `${lessons.length} lessons logged` },
    { key: 'codex',        label: 'Codex tasks',      href: '/codex-tasks',         count: mockTasks.length,                      hint: 'dev pipeline load' },
  ];
}

/** 抓 Dashboard 完整快照。 */
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [stats, providers, recent] = await Promise.all([
    pickStats(),
    getAllProvidersHealth(),
    pickRecent(),
  ]);
  return {
    stats,
    providers,
    recent,
    generatedAt: new Date().toISOString(),
  };
}
