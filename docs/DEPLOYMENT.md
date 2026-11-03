# Deployment

The frontend is a static site on **GitHub Pages**; the backend and database run on **Render** (or any VPS). Deploy the backend first so you have its URL for the frontend build.

## 1. Database

Create a PostgreSQL database (Render Postgres, Neon, Supabase or your own server) and copy its connection string. Apply the schema from your machine:

```bash
cd backend
DATABASE_URL="postgres://..." DATABASE_SSL=true JWT_SECRET=x ADMIN_USERNAME=x ADMIN_PASSWORD=x npm run db:seed
```

(`db:seed` also inserts the sample survey; use `db:setup` for an empty database.)

## 2. Backend on Render

1. **New → Web Service**, connect the repository.
2. Settings:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. Environment variables:

| Key | Example |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render's *Internal Database URL* |
| `DATABASE_SSL` | `true` for external URLs, `false` for Render internal URLs |
| `CORS_ORIGIN` | `https://<github-user>.github.io` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | a strong password |
| `JWT_SECRET` | output of `openssl rand -hex 32` |
| `TIMEZONE` | `Asia/Phnom_Penh` |

Render sets `PORT` automatically. Free instances sleep after inactivity, so the first request can take ~30 s.

## 2b. Backend on a VPS (alternative)

```bash
git clone <repo> && cd <repo>/backend
cp .env.example .env && nano .env
npm install --omit=dev
npm run db:setup
npm install -g pm2
pm2 start src/server.js --name survey-api
pm2 save && pm2 startup
```

Put Nginx (or Caddy) in front with HTTPS:

```nginx
server {
  server_name api.example.com;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then `sudo certbot --nginx -d api.example.com`.

## 3. Frontend on GitHub Pages

1. Push the repository to GitHub (default branch `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables** → add `VITE_API_URL` = `https://<your-service>.onrender.com/api`.
4. Push a change under `frontend/` or run the **Deploy frontend to GitHub Pages** workflow manually.

The workflow builds with `VITE_BASE=/<repo-name>/`, so the site is served at `https://<github-user>.github.io/<repo-name>/`. The app uses hash URLs (`/#/survey/1`, `/#/admin`), so refreshes and shared links work without a 404 fallback.

**Custom domain:** add a `frontend/public/CNAME` file containing your domain, configure DNS, and change `VITE_BASE` in the workflow to `/`.

## 4. Telegram notifications

1. Talk to **@BotFather** in Telegram → `/newbot` → copy the token.
2. Add the bot to a group (or message it directly).
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `message.chat.id` (group IDs start with `-100`).
4. In the admin panel → **Telegram**, paste the token and chat ID, enable notifications, save, and press **Send test message**.

## Checklist

- [ ] `ADMIN_PASSWORD` and `JWT_SECRET` are strong and not committed
- [ ] `CORS_ORIGIN` is your Pages origin, not `*`
- [ ] `/api/health` returns `{"status":"ok","database":"ok"}`
- [ ] Submitting the sample survey shows up in Admin → Responses and in Telegram
