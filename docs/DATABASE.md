# Database

PostgreSQL 13+. **The database must use UTF8 encoding** to store Khmer text. On Windows, PostgreSQL often defaults to WIN1252, so create it explicitly:

```sql
CREATE DATABASE survey_db ENCODING 'UTF8' TEMPLATE template0;
```

The full schema is in [`database/schema.sql`](../database/schema.sql) and is safe to re-run.

```bash
cd backend
npm run db:setup   # schema only
npm run db:seed    # schema + sample survey (skipped if any survey exists)
```

Or with `psql`:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```

## Tables

### `surveys`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | SERIAL PK | |
| `title` | JSONB | `{ "en": "...", "km": "..." }` |
| `description` | JSONB | same shape, may be `{}` |
| `is_active` | BOOLEAN | inactive surveys are hidden from the public API |
| `created_at`, `updated_at` | TIMESTAMPTZ | `updated_at` maintained by trigger |

### `questions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | SERIAL PK | |
| `survey_id` | INTEGER FK → surveys | `ON DELETE CASCADE` |
| `text` | JSONB | localized question text |
| `type` | VARCHAR(20) | `checkbox`, `radio` or `text` |
| `options` | JSONB | `[{ "id": "opt_x", "label": { "en": "...", "km": "..." } }]`, `[]` for text |
| `is_required` | BOOLEAN | |
| `position` | INTEGER | display order within the survey |

### `responses`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | SERIAL PK | |
| `survey_id` | INTEGER FK → surveys | `ON DELETE CASCADE` |
| `respondent_name` | VARCHAR(120) | optional |
| `answers` | JSONB | `{ "<questionId>": "optId" \| ["optId", ...] \| "text" }` |
| `created_at` | TIMESTAMPTZ | |

### `telegram_settings`

Single row (`id = 1`) with `bot_token`, `chat_id`, `enabled`. If the row does not exist, the backend falls back to `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` from the environment.

## Design notes

- **Why JSONB for translations?** Each piece of content needs a value per language. A JSONB object keeps one row per survey/question and makes adding a language a code change rather than a migration.
- **Why store option ids in answers?** Labels can be edited or translated later without breaking historical responses. Deleting an option leaves old answers pointing at an unknown id; reports ignore it and the response table shows the raw id.
- **Reports** are computed in Node from the survey's responses. That is fine up to tens of thousands of responses per survey; beyond that, move the counting into SQL with `jsonb_array_elements_text`.

## Backups

```bash
pg_dump "$DATABASE_URL" --format=custom --file=survey-$(date +%F).dump
pg_restore --clean --dbname "$DATABASE_URL" survey-2026-11-03.dump
```
