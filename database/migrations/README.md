# Migrations

`schema.sql` describes the current full schema and is idempotent, so a fresh database only needs:

```bash
cd backend
npm run db:setup
```

When you change the schema after going live, add a numbered file here instead of editing data by hand, for example:

```
001_add_survey_slug.sql
002_add_response_ip.sql
```

Apply it with `psql "$DATABASE_URL" -f database/migrations/001_add_survey_slug.sql`, then fold the change into `schema.sql` so new installs stay in sync.
