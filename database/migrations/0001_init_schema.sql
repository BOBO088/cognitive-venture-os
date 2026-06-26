-- =============================================================================
-- Cognitive Venture OS — 0001 init schema
-- =============================================================================
-- 18 张核心表，覆盖 types/ 下所有领域类型。
-- ID 用 text（保留 mock 数据的字符串 ID 风格），时间戳用 timestamptz，
-- 数组用 text[]，JSON 对象用 jsonb，状态字段用 text + CHECK。
-- 所有表带 created_at / updated_at，RLS 启用但策略保持 open（MVP 阶段不锁）。
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. research_topics
-- =============================================================================
create table research_topics (
  id              text primary key,
  title           text not null,
  description     text,
  category        text,
  priority        text not null default 'medium'
                    check (priority in ('low', 'medium', 'high')),
  tags            text[] not null default '{}',
  question        text,
  scope           text,
  status          text not null default 'active'
                    check (status in ('active', 'completed', 'archived')),
  owner_id        text,
  parent_topic_id text references research_topics(id) on delete set null,
  source_ids      text[] not null default '{}',
  card_ids        text[] not null default '{}',
  signal_ids      text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index research_topics_status_idx on research_topics(status);
create index research_topics_category_idx on research_topics(category);
create index research_topics_tags_idx on research_topics using gin(tags);

-- =============================================================================
-- 2. sources
-- =============================================================================
create table sources (
  id                text primary key,
  topic_id          text references research_topics(id) on delete set null,
  title             text not null,
  url               text,
  type              text not null
                      check (type in ('article', 'paper', 'video', 'website', 'note', 'report', 'book', 'podcast')),
  summary           text,
  credibility_score integer check (credibility_score between 0 and 100),
  tags              text[] not null default '{}',
  notes             text,
  author            text,
  published_at      text,  -- ISO 8601, optional metadata
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index sources_topic_id_idx on sources(topic_id);
create index sources_type_idx on sources(type);
create index sources_tags_idx on sources using gin(tags);

-- =============================================================================
-- 3. research_cards
-- =============================================================================
create table research_cards (
  id                  text primary key,
  topic_id            text not null references research_topics(id) on delete cascade,
  source_ids          text[] not null default '{}',
  title               text not null,
  summary             text not null,
  key_insights        jsonb not null default '[]'::jsonb,  -- string[]
  evidence            jsonb not null default '[]'::jsonb,  -- string[]
  risks               jsonb not null default '[]'::jsonb,  -- string[]
  tags                text[] not null default '{}',
  score               integer check (score between 0 and 100),
  graph_entity_ids    text[] not null default '{}',
  signal_id           text,  -- 不强 FK，signal 可能在 cards 之后删除
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index research_cards_topic_id_idx on research_cards(topic_id);
create index research_cards_score_idx on research_cards(score desc);
create index research_cards_tags_idx on research_cards using gin(tags);

-- =============================================================================
-- 4. graph_entities
-- =============================================================================
create table graph_entities (
  id                       text primary key,
  name                     text not null,
  kind                     text not null
                             check (kind in ('Company', 'Product', 'Person', 'Technology', 'Market',
                                             'Trend', 'Investor', 'IP', 'Character', 'ContentAsset',
                                             'Platform', 'Tool')),
  aliases                  text[] not null default '{}',
  description              text,
  metadata                 jsonb not null default '{}'::jsonb,
  tags                     text[] not null default '{}',
  linked_research_card_ids text[] not null default '{}',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index graph_entities_kind_idx on graph_entities(kind);
create index graph_entities_tags_idx on graph_entities using gin(tags);

-- =============================================================================
-- 5. graph_relations
-- =============================================================================
create table graph_relations (
  id                       text primary key,
  source_entity_id         text not null references graph_entities(id) on delete cascade,
  target_entity_id         text not null references graph_entities(id) on delete cascade,
  relation_type            text not null
                             check (relation_type in ('competes_with', 'invested_by', 'built_by', 'uses',
                                                     'belongs_to', 'growing_in', 'mentioned_in', 'supports',
                                                     'contradicts', 'influences', 'similar_to', 'alternative_to')),
  strength                 integer not null check (strength between 0 and 100),
  evidence                 text,
  linked_research_card_ids text[] not null default '{}',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint graph_relations_no_self check (source_entity_id <> target_entity_id)
);
create index graph_relations_source_idx on graph_relations(source_entity_id);
create index graph_relations_target_idx on graph_relations(target_entity_id);
create index graph_relations_type_idx on graph_relations(relation_type);

-- =============================================================================
-- 6. signals
-- =============================================================================
create table signals (
  id                        text primary key,
  title                     text not null check (char_length(title) between 1 and 200),
  source                    text not null check (char_length(source) between 1 and 500),
  category                  text not null
                              check (category in ('funding', 'product_launch', 'github_trend', 'hiring_signal',
                                                  'customer_pain', 'regulation', 'technology_breakthrough',
                                                  'content_trend', 'geo_trend', 'ip_trend', 'short_video_trend')),
  description               text not null,
  evidence                  text not null,
  confidence                integer not null check (confidence between 0 and 100),
  linked_entity_ids         text[] not null default '{}',
  linked_research_card_ids  text[] not null default '{}',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index signals_category_idx on signals(category);
create index signals_confidence_idx on signals(confidence desc);
create index signals_created_at_idx on signals(created_at desc);

-- =============================================================================
-- 7. opportunities
-- =============================================================================
create table opportunities (
  id                        text primary key,
  title                     text not null,
  description               text not null,
  target_user               text not null,
  pain_point                text not null,
  solution_idea             text not null,
  status                    text not null default 'draft'
                              check (status in ('draft', 'evaluating', 'validated', 'mvp', 'archived', 'killed')),
  related_signal_ids        text[] not null default '{}',
  related_research_card_ids text[] not null default '{}',
  related_entity_ids        text[] not null default '{}',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index opportunities_status_idx on opportunities(status);

-- =============================================================================
-- 8. opportunity_evaluations
-- =============================================================================
create table opportunity_evaluations (
  id                     text primary key,
  opportunity_id         text not null references opportunities(id) on delete cascade,
  market_size            integer not null check (market_size between 0 and 100),
  pain_intensity         integer not null check (pain_intensity between 0 and 100),
  competition            integer not null check (competition between 0 and 100),  -- 越高 = 竞争越少（极性反转）
  technical_feasibility  integer not null check (technical_feasibility between 0 and 100),
  monetization           integer not null check (monetization between 0 and 100),
  speed_to_market        integer not null check (speed_to_market between 0 and 100),
  founder_fit            integer not null check (founder_fit between 0 and 100),
  geo_potential          integer not null check (geo_potential between 0 and 100),
  ip_potential           integer not null check (ip_potential between 0 and 100),
  total_score            integer not null check (total_score between 0 and 100),  -- service 层重算
  explanation            text not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index opportunity_evaluations_opportunity_id_idx on opportunity_evaluations(opportunity_id);
create index opportunity_evaluations_total_score_idx on opportunity_evaluations(total_score desc);

-- =============================================================================
-- 9. mvp_projects
-- =============================================================================
create table mvp_projects (
  id              text primary key,
  opportunity_id  text not null references opportunities(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 200),
  description     text not null check (char_length(description) between 1 and 4000),
  stage           text not null default 'idea'
                    check (stage in ('idea', 'research', 'validation', 'mvp', 'launched', 'revenue', 'killed')),
  owner           text not null check (char_length(owner) between 1 and 100),
  start_date      date not null,
  launch_date     date,
  revenue         numeric not null default 0 check (revenue >= 0),
  cost            numeric not null default 0 check (cost >= 0),
  lessons         text not null default '' check (char_length(lessons) <= 4000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index mvp_projects_opportunity_id_idx on mvp_projects(opportunity_id);
create index mvp_projects_stage_idx on mvp_projects(stage);

-- =============================================================================
-- 10. launch_results
-- =============================================================================
create table launch_results (
  id               text primary key,
  mvp_project_id   text not null references mvp_projects(id) on delete cascade,
  launch_date      date not null,
  users            integer not null default 0 check (users >= 0),
  signups          integer not null default 0 check (signups >= 0),
  revenue          numeric not null default 0 check (revenue >= 0),
  traffic          integer not null default 0 check (traffic >= 0),
  conversion_rate  numeric not null default 0 check (conversion_rate between 0 and 100),
  retention_rate   numeric not null default 0 check (retention_rate between 0 and 100),
  feedback_summary text check (char_length(feedback_summary) <= 4000),
  result_status    text not null default 'unknown'
                     check (result_status in ('success', 'neutral', 'failed', 'unknown')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index launch_results_mvp_project_id_idx on launch_results(mvp_project_id);
create index launch_results_result_status_idx on launch_results(result_status);

-- =============================================================================
-- 11. lessons_learned
-- =============================================================================
create table lessons_learned (
  id                    text primary key,
  project_id            text not null references mvp_projects(id) on delete cascade,
  launch_result_id      text references launch_results(id) on delete set null,
  what_worked           text not null check (char_length(what_worked) between 1 and 4000),
  what_failed           text not null check (char_length(what_failed) between 1 and 4000),
  why                   text not null check (char_length(why) between 1 and 4000),
  customer_insight      text not null check (char_length(customer_insight) between 1 and 4000),
  market_insight        text not null check (char_length(market_insight) between 1 and 4000),
  product_insight       text not null check (char_length(product_insight) between 1 and 4000),
  geo_insight           text not null check (char_length(geo_insight) between 1 and 4000),
  next_action           text not null check (char_length(next_action) between 1 and 4000),
  score_model_suggestion text not null check (char_length(score_model_suggestion) between 1 and 4000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index lessons_learned_project_id_idx on lessons_learned(project_id);
create index lessons_learned_launch_result_id_idx on lessons_learned(launch_result_id);

-- =============================================================================
-- 12. geo_brand_entities
-- =============================================================================
create table geo_brand_entities (
  id            text primary key,
  brand_name    text not null,
  canonical_name text not null,
  description   text not null,
  pillars       text[] not null default '{}'
                  check (pillars <@ array['core', 'product', 'founder', 'category', 'use_case']),
  aliases       text[] not null default '{}',
  homepage_url  text,
  asset_ids     text[] not null default '{}',
  query_ids     text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- 13. geo_content_assets
-- =============================================================================
create table geo_content_assets (
  id               text primary key,
  brand_id         text not null references geo_brand_entities(id) on delete cascade,
  title            text not null,
  url              text not null,
  format           text not null
                     check (format in ('landing_page', 'blog_post', 'research_report', 'case_study',
                                       'faq', 'comparison_page', 'documentation', 'video_script', 'social_post')),
  status           text not null default 'draft'
                     check (status in ('draft', 'published', 'updated', 'retired')),
  target_queries   text[] not null default '{}',
  published_at     timestamptz,
  last_refreshed_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index geo_content_assets_brand_id_idx on geo_content_assets(brand_id);
create index geo_content_assets_format_idx on geo_content_assets(format);

-- =============================================================================
-- 14. ai_queries
-- =============================================================================
create table ai_queries (
  id                 text primary key,
  text               text not null,
  provider           text not null
                       check (provider in ('ChatGPT', 'Perplexity', 'Gemini', 'Google AI Overview', 'Claude')),
  brand_id           text not null references geo_brand_entities(id) on delete cascade,
  pillar             text not null
                       check (pillar in ('core', 'product', 'founder', 'category', 'use_case')),
  intent             text not null
                       check (intent in ('informational', 'comparison', 'recommendation', 'how_to',
                                         'review', 'pricing', 'alternative', 'trend', 'problem_solution')),
  schedule           text not null default 'on_demand'
                       check (schedule in ('daily', 'weekly', 'monthly', 'on_demand')),
  citation_check_ids text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index ai_queries_brand_id_idx on ai_queries(brand_id);
create index ai_queries_provider_idx on ai_queries(provider);

-- =============================================================================
-- 15. citation_check_results
-- =============================================================================
create table citation_check_results (
  id                text primary key,
  query_id          text not null references ai_queries(id) on delete cascade,
  brand_id          text not null references geo_brand_entities(id) on delete cascade,
  checked_at        timestamptz not null,
  verdict           text not null
                      check (verdict in ('cited', 'mentioned', 'absent', 'competitor_only')),
  response_excerpt  text,
  cited_asset_ids   text[] not null default '{}',
  cited_entity_ids  text[] not null default '{}',
  position          integer check (position >= 1),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index citation_check_results_query_id_idx on citation_check_results(query_id);
create index citation_check_results_brand_id_idx on citation_check_results(brand_id);
create index citation_check_results_checked_at_idx on citation_check_results(checked_at desc);

-- =============================================================================
-- 16. codex_tasks
-- =============================================================================
create table codex_tasks (
  id                text primary key,
  title             text not null,
  description       text,
  phase             text check (phase in ('research', 'scout', 'build', 'launch', 'learn')),
  status            text not null default 'backlog'
                      check (status in ('backlog', 'doing', 'review', 'done', 'failed')),
  priority          text not null default 'medium'
                      check (priority in ('low', 'medium', 'high', 'urgent')),
  codex_command     text,
  changed_files     text[] not null default '{}',
  test_result       jsonb,  -- TestResult 对象
  failure_reason    text,
  review_notes      text,
  source_prd_id     text,
  generator_run_id  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index codex_tasks_status_idx on codex_tasks(status);
create index codex_tasks_priority_idx on codex_tasks(priority);
create index codex_tasks_generator_run_id_idx on codex_tasks(generator_run_id);

-- =============================================================================
-- 17. prompt_versions
-- =============================================================================
create table prompt_versions (
  id          text primary key,
  name        text not null,
  type        text not null,
  content     text not null check (char_length(content) between 1 and 50000),
  version     integer not null check (version >= 1),
  used_for    text not null check (char_length(used_for) between 1 and 1000),
  score       integer check (score between 0 and 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (type, name, version)
);
create index prompt_versions_type_name_idx on prompt_versions(type, name);

-- =============================================================================
-- 18. loop_versions
-- =============================================================================
create table loop_versions (
  id                   text primary key,
  name                 text not null,
  steps                text[] not null check (array_length(steps, 1) >= 1),
  stop_condition       text not null check (char_length(stop_condition) between 1 and 2000),
  evaluation_criteria  text not null check (char_length(evaluation_criteria) between 1 and 2000),
  version              integer not null check (version >= 1),
  score                integer check (score between 0 and 100),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (name, version)
);
create index loop_versions_name_idx on loop_versions(name);

-- =============================================================================
-- updated_at 自动更新触发器
-- =============================================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'research_topics', 'sources', 'research_cards', 'graph_entities', 'graph_relations',
      'signals', 'opportunities', 'opportunity_evaluations', 'mvp_projects', 'launch_results',
      'lessons_learned', 'geo_brand_entities', 'geo_content_assets', 'ai_queries',
      'citation_check_results', 'codex_tasks', 'prompt_versions', 'loop_versions'
    ])
  loop
    execute format('create trigger %I_set_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- =============================================================================
-- RLS（MVP 阶段开启但不锁，迁移到生产时再写策略）
-- =============================================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'research_topics', 'sources', 'research_cards', 'graph_entities', 'graph_relations',
      'signals', 'opportunities', 'opportunity_evaluations', 'mvp_projects', 'launch_results',
      'lessons_learned', 'geo_brand_entities', 'geo_content_assets', 'ai_queries',
      'citation_check_results', 'codex_tasks', 'prompt_versions', 'loop_versions'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    -- MVP 阶段不写策略，deny all by default（service role bypass RLS，所以 server-side 全通）
  end loop;
end $$;
