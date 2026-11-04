# API Documentation

Base URL: `http://localhost:4000/api` (local) or `https://<your-service>.onrender.com/api`.

## Conventions

- Request and response bodies are JSON.
- Success: `{ "data": ... }` (lists with pagination also include `"meta"`).
- Error: `{ "error": { "message": "...", "details": { ... } } }` with a 4xx/5xx status.
- 🔒 = requires `Authorization: Bearer <token>` from `POST /auth/login`.
- Translatable fields are objects: `{ "en": "Hello", "km": "សួស្តី" }`. On input, a plain string is accepted and treated as English.

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | `{ status, database }`, 503 when the database is unreachable |

## Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/login` | Body `{ username, password }` → `{ token, user }`. Rate limited to 10 attempts / 15 min. |
| GET 🔒 | `/auth/me` | Current admin |

## Surveys

| Method | Path | Description |
| --- | --- | --- |
| GET | `/surveys` | Active surveys (public) |
| GET | `/surveys/:id` | Active survey with its questions (public). 404 if inactive. |
| GET 🔒 | `/surveys/all` | All surveys including inactive |
| GET 🔒 | `/surveys/stats` | Dashboard statistics |
| GET 🔒 | `/surveys/:id/admin` | Any survey with its questions |
| POST 🔒 | `/surveys` | Create |
| PUT 🔒 | `/surveys/:id` | Partial update |
| DELETE 🔒 | `/surveys/:id` | Delete survey, its questions and responses |

Survey object:

```json
{
  "id": 1,
  "title": { "en": "Customer Satisfaction Survey", "km": "ការស្ទង់មតិពេញចិត្តរបស់អតិថិជន" },
  "description": { "en": "Help us improve." },
  "isActive": true,
  "questionCount": 4,
  "responseCount": 12,
  "createdAt": "2026-11-03T08:00:00.000Z",
  "updatedAt": "2026-11-03T08:00:00.000Z",
  "questions": [ /* only on /surveys/:id and /surveys/:id/admin */ ]
}
```

Create / update body:

```json
{ "title": { "en": "...", "km": "..." }, "description": { "en": "..." }, "isActive": true }
```

## Questions 🔒

| Method | Path | Description |
| --- | --- | --- |
| GET | `/questions?surveyId=1` | Questions of a survey, ordered |
| POST | `/questions` | Create (appended to the end unless `position` is given) |
| PUT | `/questions/:id` | Partial update |
| PUT | `/questions/reorder` | Body `{ surveyId, ids: [3, 1, 2] }` |
| DELETE | `/questions/:id` | Delete |

Question body:

```json
{
  "surveyId": 1,
  "text": { "en": "Which services have you used?", "km": "..." },
  "type": "checkbox",
  "isRequired": true,
  "options": [
    { "id": "svc_delivery", "label": { "en": "Delivery", "km": "ការដឹកជញ្ជូន" } },
    { "label": { "en": "Pickup" } }
  ]
}
```

- `type`: `checkbox` (many answers), `radio` (one answer) or `text`.
- Choice questions need at least 2 options. Options without an `id` get one generated; keep existing ids when editing so past answers stay linked.

## Responses

| Method | Path | Description |
| --- | --- | --- |
| POST | `/responses` | Submit answers (public, 10 / minute per IP) |
| GET 🔒 | `/responses?surveyId=1&page=1&pageSize=20` | Paginated responses, newest first |
| GET 🔒 | `/responses/report/:surveyId` | Aggregated counts per option, latest text answers |
| GET 🔒 | `/responses/export/:surveyId?lang=en&format=xlsx` | Download responses. `format=xlsx`: styled Excel workbook (Responses + Summary sheets); omit for CSV. `lang` = `en` or `km` for labels |
| DELETE 🔒 | `/responses/:id` | Delete a response |

Submit body:

```json
{
  "surveyId": 1,
  "respondentName": "Dara",
  "answers": {
    "1": ["svc_delivery", "svc_online"],
    "2": "sat_4",
    "4": "Great service!"
  }
}
```

Validation errors return 400 with `details` keyed by question id:

```json
{ "error": { "message": "Some answers are missing or invalid", "details": { "2": "This question is required" } } }
```

Report shape:

```json
{
  "survey": { "id": 1, "title": { "en": "..." }, "isActive": true },
  "totalResponses": 12,
  "questions": [
    { "id": 1, "type": "checkbox", "answeredCount": 12,
      "options": [{ "id": "svc_delivery", "label": { "en": "Delivery" }, "count": 7 }] },
    { "id": 4, "type": "text", "answeredCount": 3,
      "textAnswers": [{ "value": "Great service!", "createdAt": "..." }] }
  ]
}
```

## Telegram 🔒

| Method | Path | Description |
| --- | --- | --- |
| GET | `/telegram/settings` | `{ hasToken, botTokenMasked, chatId, enabled }` (the raw token is never returned) |
| PUT | `/telegram/settings` | Body `{ botToken?, chatId, enabled }`. An empty `botToken` keeps the saved one. |
| POST | `/telegram/test` | Sends a test message using the body values or the saved settings |
