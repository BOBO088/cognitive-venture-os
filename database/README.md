# database/ — Schema, migrations, seeds

## Files

| File | Purpose |
|---|---|
| `migrations/0001_init_schema.sql` | 18 张表 + 索引 + 触发器 + RLS。一次性 apply。 |
| `seed/seed.sql` | 最小 seed（每表 2-3 条），验证 schema 正确。 |

## Quick start

```bash
# 1. 在 Supabase Dashboard → SQL Editor 粘贴 0001_init_schema.sql → Run
# 2. 同样的方式跑 seed/seed.sql
# 3. 在 .env.local / Vercel Dashboard 配 SUPABASE_URL / SERVICE_ROLE_KEY
# 4. NEXT_PUBLIC_APP_MODE=staging 重启

# CLI 方式（如果装了 supabase CLI + psql）
psql "$SUPABASE_DB_URL" -f migrations/0001_init_schema.sql
psql "$SUPABASE_DB_URL" -f seed/seed.sql
```

## Schema 版本

单一 migration 文件 0001_init_schema.sql。后续 schema 变更走 0002_xxx.sql、0003_xxx.sql 追加。

详细说明见 [DATABASE.md](../DATABASE.md)。
