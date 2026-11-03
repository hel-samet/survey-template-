# Deployment

The frontend is a static site on **GitHub Pages**, the backend runs on **Render** (or any VPS), and data lives in **Firebase Cloud Firestore**. Deploy the backend first so you have its URL for the frontend build.

## 1. Database (Firestore)

Follow [DATABASE.md](DATABASE.md) steps 1–2: create the Firebase project and Firestore database, publish `database/firestore.rules`, and download a service account key. Then seed the sample survey from your machine (with `FIREBASE_SERVICE_ACCOUNT` in `backend/.env`):

```bash
cd backend
npm run db:seed
```

## 2. Backend on Render

**Quickest:** Render dashboard → **New → Blueprint** → pick this repo. `render.yaml` creates the `survey-api` service; fill in `ADMIN_PASSWORD` and `FIREBASE_SERVICE_ACCOUNT` (base64 of the key file) when asked.

**Manual:**

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
| `FIREBASE_SERVICE_ACCOUNT` | base64 of the service account JSON |
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
npm run db:seed   # optional sample survey
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

## 4. Google sign-in (one answer per person)

Surveys with **Require Google sign-in** turned on (Admin → Survey → Details) ask respondents to sign in with Google and accept one answer per account. Admins can let a person answer again from **Responses → Allow again**. Sign-in uses Firebase Authentication (free).

1. https://console.firebase.google.com → **Add project** (or reuse your existing one).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**, pick a support email, **Save**.
3. **Authentication → Settings → Authorized domains → Add domain** → `hel-samet.github.io`.
4. **Project settings (⚙) → General → Your apps → Web (`</>`)** → register an app (no Hosting needed) and copy `apiKey`, `authDomain` and `projectId` from the config shown.
5. GitHub repo → **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

   then rerun the **Deploy frontend to GitHub Pages** workflow. These web config values are public by design; access is controlled by the authorized domains.
6. Render → **survey-api → Environment** → add `FIREBASE_PROJECT_ID` (same project ID) → save and deploy. The backend only needs the project ID to verify sign-ins; no key file is required.

For local testing, put the same three `VITE_FIREBASE_*` values in `frontend/.env`, `FIREBASE_PROJECT_ID` in `backend/.env`, and keep `localhost` in the authorized domains (it is there by default).

## 5. Telegram notifications

1. Talk to **@BotFather** in Telegram → `/newbot` → copy the token.
2. Add the bot to a group (or message it directly).
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `message.chat.id` (group IDs start with `-100`).
4. In the admin panel → **Telegram**, paste the token and chat ID, enable notifications, save, and press **Send test message**.

## Checklist

- [ ] `ADMIN_PASSWORD` and `JWT_SECRET` are strong and not committed
- [ ] `CORS_ORIGIN` is your Pages origin, not `*`
- [ ] `/api/health` returns `{"status":"ok","database":"ok"}`
- [ ] Submitting the sample survey shows up in Admin → Responses and in Telegram
