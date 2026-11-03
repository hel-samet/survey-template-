# Project Structure

```
survey-checkbox-system/
├── .github/workflows/deploy-frontend.yml   Builds frontend/ and publishes it to GitHub Pages
├── frontend/                               React SPA (GitHub Pages)
├── backend/                                Express REST API (Render / VPS)
├── database/                               schema.sql, seed.sql, migrations/
└── docs/                                   This documentation
```

## Frontend (`frontend/src`)

| Path | Purpose |
| --- | --- |
| `main.jsx` | Mounts the app inside `HashRouter`, `LanguageProvider` and `AuthProvider` |
| `App.jsx` | Route table (public routes, `/admin/login`, protected `/admin/*`) |
| `components/common/` | `Button`, `Input`, `Checkbox` (also renders radios), `LanguageSwitcher`, `Feedback` (loading / error / empty states) |
| `components/survey/` | Pieces of the public survey form: header with progress, question, checkbox/radio groups, submit bar |
| `components/dashboard/` | `StatCard`, `BarList` (horizontal bar chart used by dashboard and reports) |
| `components/layout/` | `PublicLayout`, `AdminLayout` (also the auth guard), `PageHeader`, `SurveyTabs` |
| `pages/` | Public pages: `Home`, `SurveyPage`, `SuccessPage`, `NotFound` |
| `pages/admin/` | `Login`, `Dashboard`, `SurveyList`, `SurveyBuilder` (survey details), `Questions`, `Responses`, `Reports`, `TelegramSettings` |
| `services/api.js` | `fetch` wrapper: base URL, JWT header, error normalization, auto-logout on 401 |
| `services/surveyService.js` | Typed API calls grouped as `surveyApi`, `questionApi`, `responseApi`, `telegramApi` |
| `services/authService.js` | Login / logout and JWT expiry check |
| `context/` | `LanguageContext` (current language, `t()` and `tl()` helpers), `AuthContext` |
| `hooks/` | `useLanguage`, `useAuth`, `useAsync` (load data with loading/error state) |
| `i18n/` | `en.js`, `km.js` UI strings and `index.js` helpers (`translate`, `localize`, `formatDateTime`) |
| `styles/global.css` | Design tokens (light + dark), layout and component styles |

### Translations

- **UI text** lives in `i18n/en.js` and `i18n/km.js`. Use `t('section.key', { var })` inside components.
- **Content** (survey titles, questions, options) comes from the API as `{ "en": "...", "km": "..." }`. Use `tl(value)`, which falls back to English when a Khmer translation is missing.

To add a language, create `i18n/xx.js`, register it in `i18n/index.js` (`translations` and `LANGUAGES`), and add the code to `LANGUAGES` in `backend/src/validators/surveyValidator.js`.

## Backend (`backend/src`)

Requests flow `routes → middleware → controllers → services / models → Firestore`.

| Path | Purpose |
| --- | --- |
| `server.js` | Express app, security middleware, route mounting, graceful shutdown |
| `config/env.js` | Reads and validates environment variables |
| `config/database.js` | Firebase Admin init, `db`, `collections`, `deleteQuery`, `toIso` |
| `routes/` | URL → controller mapping and per-route auth / rate limiting |
| `controllers/` | Parse the request, call services/models, shape the JSON response |
| `models/` | Firestore access for `surveys`, `questions`, `responses` |
| `services/surveyService.js` | Survey + questions loading, response submission, report and CSV building, dashboard stats |
| `services/telegramService.js` | Telegram settings storage and `sendMessage` |
| `services/notificationService.js` | Formats the "new response" Telegram message |
| `middleware/` | `requireAuth` (JWT), `errorHandler`, rate limiters |
| `validators/` | Input validation for surveys, questions and answers |
| `utils/` | `ApiError`, `asyncHandler`, `parseId`, `seed` (inserts `database/seed.json`) |

> `routes/authRoutes.js`, `controllers/authController.js`, `middleware/rateLimiter.js`, `pages/admin/Login.jsx` and the extra layout/feedback components were added on top of the original outline because the admin panel needs them.
