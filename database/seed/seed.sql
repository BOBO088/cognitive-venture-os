-- =============================================================================
-- Cognitive Venture OS — seed data
-- =============================================================================
-- 最小可工作的 seed（每表 2-3 条），用于验证 schema。
-- 完整 seed 走 database/seed/seed.ts（从 mock-data/ 读取并批量插入），
-- 需要真实 Supabase 实例才能跑。SQL seed 用于本地 psql / Supabase SQL editor。
-- =============================================================================

-- ---------- research_topics ----------
insert into research_topics (id, title, description, category, priority, tags, question, status, source_ids, card_ids, signal_ids) values
('topic_ai_copilot', 'AI Copilot for SaaS', '研究 AI copilot 在 SaaS 行业的渗透率、定价、留存', 'AI', 'high', array['ai', 'saas', 'tam'], 'AI copilot 在中型 SaaS 的真实续约率是多少？', 'active', array['src_stripe_report_2026'], array['card_copilot_pricing'], array[]::text[]),
('topic_geo_search',   'GEO for AI Search',    '研究品牌如何在 ChatGPT / Perplexity / Gemini 答案里被引用',  'GEO', 'high', array['geo', 'llm-seo'], 'AI 答案里品牌被引用的位置受哪些内容因素影响？', 'active', array[]::text[], array[]::text[], array['sig_geo_chatgpt_2026']);

-- ---------- sources ----------
insert into sources (id, topic_id, title, url, type, summary, credibility_score, tags) values
('src_stripe_report_2026', 'topic_ai_copilot', 'Stripe SaaS Report 2026', 'https://stripe.com/reports/saas-2026', 'report', 'Stripe 出的 2026 SaaS 行业全景报告，含 AI 集成度数据', 92, array['saas', 'report', '2026']),
('src_perplexity_blog',    'topic_geo_search',   'Perplexity Citation Mechanics', 'https://perplexity.com/blog/citations', 'article', 'Perplexity 官方解释答案引用机制', 85, array['perplexity', 'geo']);

-- ---------- research_cards ----------
insert into research_cards (id, topic_id, source_ids, title, summary, key_insights, evidence, risks, tags, score) values
('card_copilot_pricing', 'topic_ai_copilot', array['src_stripe_report_2026'], 'AI Copilot 定价区间', 'Stripe 数据显示中型 SaaS 的 AI copilot 定价集中在 19-49 USD/seat/月', '["价位锚定: 19 / 29 / 49 USD", "Freemium → paid 转化率 4-7%"]'::jsonb, '["Stripe 报告 第 24 页"]'::jsonb, '["样本偏美国市场"]'::jsonb, array['pricing', 'tam'], 78);

-- ---------- graph_entities ----------
insert into graph_entities (id, name, kind, aliases, description, metadata, tags, linked_research_card_ids) values
('entity_openai', 'OpenAI', 'Company', array['openai', 'Open AI'], 'AI 研究公司', '{"founded": 2015, "hq": "San Francisco"}'::jsonb, array['ai', 'foundation-model'], array[]::text[]),
('entity_chatgpt', 'ChatGPT', 'Product', array['chatgpt'], 'OpenAI 旗舰对话产品', '{"launched": 2022, "monthly_users": 200000000}'::jsonb, array['ai', 'product'], array[]::text[]);

-- ---------- graph_relations ----------
insert into graph_relations (id, source_entity_id, target_entity_id, relation_type, strength, evidence, linked_research_card_ids) values
('rel_openai_chatgpt', 'entity_openai', 'entity_chatgpt', 'built_by', 95, 'ChatGPT 由 OpenAI 发布和维护', array[]::text[]);

-- ---------- signals ----------
insert into signals (id, title, source, category, description, evidence, confidence, linked_entity_ids, linked_research_card_ids) values
('sig_geo_chatgpt_2026', 'ChatGPT 答案开始引用 niche 博客', 'manual', 'geo_trend', '手工测试 50 条 AI 答案，niche 博客引用率 18% → 31%', '手工测试 2026-05 至 2026-06', 72, array['entity_chatgpt'], array[]::text[]);

-- ---------- opportunities ----------
insert into opportunities (id, title, description, target_user, pain_point, solution_idea, status, related_signal_ids, related_research_card_ids, related_entity_ids) values
('opp_geo_optimizer', 'GEO Optimizer for niche blogs', '帮 niche 博客作者优化文章以被 AI 答案引用', '月访问 10k-100k 的 niche 博客运营者', 'AI 搜索流量在涨，但不知道怎么写才能被引用', '扫描 top 10 AI 答案 + 给出文章改写建议 + GEO 评分', 'evaluating', array['sig_geo_chatgpt_2026'], array['card_copilot_pricing'], array['entity_chatgpt']);

-- ---------- opportunity_evaluations ----------
insert into opportunity_evaluations (id, opportunity_id, market_size, pain_intensity, competition, technical_feasibility, monetization, speed_to_market, founder_fit, geo_potential, ip_potential, total_score, explanation) values
('eval_opp_geo_optimizer', 'opp_geo_optimizer', 68, 74, 62, 78, 71, 80, 65, 95, 40, 71, 'GEO 红利窗口期，痛点真实，技术可行；变现偏订阅；IP 潜力低');

-- ---------- mvp_projects ----------
insert into mvp_projects (id, opportunity_id, name, description, stage, owner, start_date, launch_date, revenue, cost, lessons) values
('mvp_geo_optimizer', 'opp_geo_optimizer', 'GEO Optimizer', '帮 niche 博客作者优化文章以被 AI 答案引用', 'validation', 'founder-1', '2026-04-01', null, 0, 320, '已与 5 位 niche 博主访谈，痛点真实');

-- ---------- launch_results ----------
insert into launch_results (id, mvp_project_id, launch_date, users, signups, revenue, traffic, conversion_rate, retention_rate, feedback_summary, result_status) values
('launch_signal_radar_beta', 'mvp_signal_radar', '2026-05-15', 2300, 410, 1840, 12000, 17.8, 32.0, '用户喜欢信号推送但觉得噪音多', 'neutral');

-- ---------- lessons_learned ----------
insert into lessons_learned (id, project_id, launch_result_id, what_worked, what_failed, why, customerInsight, marketInsight, productInsight, geoInsight, nextAction, scoreModelSuggestion) values
('lesson_signal_radar', 'mvp_signal_radar', 'launch_signal_radar_beta',
 '信号频率 vs 噪音控制', '免费版推送太多', '订阅者愿意为低频高质信号付费', '客户喜欢 Slack 推送而非邮件', '信号噪音是行业普遍痛点', '推送要可定制化', 'ChatGPT 答案里被引用率有提升',
 '提高免费版推送门槛 / 推付费', '痛点强度权重从 15% 上调至 20%');

-- ---------- geo_brand_entities ----------
insert into geo_brand_entities (id, brand_name, canonical_name, description, pillars, aliases, homepage_url, asset_ids, query_ids) values
('brand_cvo', 'Cognitive Venture OS', 'Cognitive Venture OS', 'AI-native operating system for cognitive ventures', array['core', 'product'], array['CVO', 'cvo'], 'https://cvo.example.com', array[]::text[], array[]::text[]);

-- ---------- geo_content_assets ----------
insert into geo_content_assets (id, brand_id, title, url, format, status, target_queries) values
('asset_cvo_homepage', 'brand_cvo', 'Cognitive Venture OS Homepage', 'https://cvo.example.com', 'landing_page', 'published', array['what is cognitive venture os', 'ai for venture studios']);

-- ---------- ai_queries ----------
insert into ai_queries (id, text, provider, brand_id, pillar, intent, schedule, citation_check_ids) values
('q_cvo_what', 'What is Cognitive Venture OS?', 'ChatGPT', 'brand_cvo', 'core', 'informational', 'weekly', array[]::text[]);

-- ---------- citation_check_results ----------
insert into citation_check_results (id, query_id, brand_id, checked_at, verdict, response_excerpt, cited_asset_ids, cited_entity_ids, position) values
('check_cvo_what_001', 'q_cvo_what', 'brand_cvo', '2026-06-01T10:00:00Z', 'mentioned', 'Cognitive Venture OS is an AI-native...', array['asset_cvo_homepage'], array[]::text[], 2);

-- ---------- codex_tasks ----------
insert into codex_tasks (id, title, description, phase, status, priority, codex_command, changed_files, test_result, failure_reason, review_notes, source_prd_id, generator_run_id) values
('task-001', '搭建 Codex Task Board MVP', '创建任务板 + mock 数据', 'build', 'done', 'high', 'npm run build', array['app/codex-tasks/page.tsx'], '{"lint": "pass", "test": "pass", "build": "pass"}'::jsonb, null, '完成', null, null);

-- ---------- prompt_versions ----------
insert into prompt_versions (id, name, type, content, version, used_for, score) values
('prompt_prd_v1', 'PRD Generator', 'prd', 'Generate a PRD for the following MVP: {{mvpDescription}}', 1, 'mvp_project_generator', 72);

-- ---------- loop_versions ----------
insert into loop_versions (id, name, steps, stop_condition, evaluation_criteria, version, score) values
('loop_geo_monitor_v1', 'GEO Monitor Loop', array['fetch top 10 AI answers', 'extract brand mentions', 'compute GEO score'], 'all queries checked', 'GEO score delta > 5%', 1, 80);
