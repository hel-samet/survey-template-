# Survey Checkbox System

A bilingual (English / ខ្មែរ) survey platform with checkbox, single-choice and free-text questions, an admin panel, reports, Excel / CSV export and Telegram notifications for every new response.

| Part | Tech | Hosting |
| --- | --- | --- |
| `frontend/` | React 18 + Vite + React Router | GitHub Pages |
| `backend/` | Node.js 18+ + Express + PostgreSQL | Render or any VPS |
| `database/` | PostgreSQL schema + seed data | Render Postgres, Neon, Supabase, self-hosted |

## Features

- Public survey list and survey form with progress bar and required-question validation
- English / Khmer UI switcher; every survey, question and option can be written in both languages
- Admin panel (single admin account, JWT auth): dashboard, survey builder, question editor with reordering, response table, per-question reports, styled Excel export (responses + summary sheets) and CSV export
- Telegram bot notification for each submission, configured from the admin panel
- Rate-limited submissions and login

## Quick start (local)

Requirements: Node.js 18+ and PostgreSQL 13+.

```bash
# 1. Database
createdb -E UTF8 -T template0 survey_db   # UTF8 is required for Khmer text

# 2. Backend
cd backend
cp .env.example .env          # edit DATABASE_URL, ADMIN_PASSWORD, JWT_SECRET
npm install
npm run db:seed               # creates tables + a sample bilingual survey
npm run dev                   # http://localhost:4000/api

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173 for the public site and http://localhost:5173/#/admin for the admin panel (log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `backend/.env`).

## Documentation

- [Project structure](docs/PROJECT_STRUCTURE.md)
- [API documentation](docs/API_DOCUMENTATION.md)
- [Database](docs/DATABASE.md)
- [Deployment](docs/DEPLOYMENT.md)

## License

[MIT](LICENSE)
