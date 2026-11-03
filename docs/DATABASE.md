# Database (Firebase Cloud Firestore)

The backend stores everything in **Cloud Firestore** through the Firebase Admin SDK. Browsers never talk to Firestore directly; they call the Express API, which validates input and enforces admin auth.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project**.
2. **Build → Firestore Database → Create database**. Pick a location close to your users (e.g. `asia-southeast1` for Cambodia) and start in **production mode**.
3. **Rules** tab → paste [`database/firestore.rules`](../database/firestore.rules) → **Publish**. It denies all client access; the Admin SDK used by the backend is not affected by rules.
4. **Project settings (⚙) → Service accounts → Generate new private key**. This downloads a JSON file. Treat it like a password: never commit it (it is already in `.gitignore`).

## 2. Give the backend the credentials

Pick one:

| Option | Where | Value |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` (recommended) | `.env`, Render, VPS | The JSON on one line, or base64 of the file |
| `GOOGLE_APPLICATION_CREDENTIALS` | local / VPS | Path to the JSON file, e.g. `./serviceAccount.json` |
| `FIRESTORE_EMULATOR_HOST` | local only | `127.0.0.1:8080`, no credentials needed |

Base64-encode the key in PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccount.json")) | Set-Clipboard
```

## 3. Seed sample data

```bash
cd backend
npm run db:seed   # adds the sample bilingual survey from database/seed.json if no surveys exist
```

Firestore creates collections on first write, so there is no schema to apply.

## Collections

### `surveys/{surveyId}`

| Field | Type | Notes |
| --- | --- | --- |
| `title` | map | `{ en, km }` |
| `description` | map | `{ en, km }`, may be empty |
| `isActive` | boolean | inactive surveys are hidden from the public API |
| `questionCount` | number | counter maintained by the backend |
| `responseCount` | number | counter maintained by the backend |
| `createdAt`, `updatedAt` | timestamp | server timestamps |

### `questions/{questionId}`

| Field | Type | Notes |
| --- | --- | --- |
| `surveyId` | string | parent survey |
| `text` | map | localized question text |
| `type` | string | `checkbox`, `radio` or `text` |
| `options` | array | `[{ id, label: { en, km } }]`, empty for text |
| `isRequired` | boolean | |
| `position` | number | display order within the survey |

### `responses/{responseId}`

| Field | Type | Notes |
| --- | --- | --- |
| `surveyId` | string | |
| `respondentName` | string \| null | optional |
| `answers` | map | `{ "<questionId>": "optId" \| ["optId", ...] \| "text" }` |
| `createdAt` | timestamp | |

Responses from surveys with **Require Google sign-in** also store `respondentUid`, `respondentEmail` and `resubmitAllowed`.

### `submissionLocks/{surveyId}_{googleUid}`

One document per person per sign-in survey (`surveyId`, `responseId`). It is created in the same batch as the response with `create()`, which fails if it already exists, so a second answer from the same Google account is rejected atomically. **Allow again** (and deleting the response) removes the lock.

### `settings/telegram`

`botToken`, `chatId`, `enabled`. If the document does not exist, the backend falls back to `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` from the environment.

## Design notes

- **No composite indexes required.** Queries use a single equality filter (`surveyId == x`) or a single-field order (`createdAt`), which Firestore indexes automatically. Sorting by date within a survey happens in Node.
- **Counters** (`questionCount`, `responseCount`) are updated in the same batch as the write, so the survey list is one read per survey instead of a scan.
- **Deleting a survey** also deletes its questions and responses (in batches of 400).
- **Scale:** loading a survey's responses into memory for reports, CSV and pagination is fine up to tens of thousands of responses per survey. Beyond that, add a composite index on `responses (surveyId ASC, createdAt DESC)` and switch `Response.findBySurvey` to `orderBy` + cursor pagination.
- **Free tier (Spark plan):** 50k reads / 20k writes / 20k deletes per day and 1 GiB storage, plenty for most surveys.

## Backups

Firestore managed exports need the Blaze (pay-as-you-go) plan:

```bash
gcloud firestore export gs://<your-bucket>/backups/$(date +%F)
```

On the free plan, use **Admin → Reports → Export CSV** per survey.

## Local emulator (optional)

Requires Java 11+ and the Firebase CLI (`npm i -g firebase-tools`):

```bash
firebase emulators:start --only firestore --project demo-survey
# in backend/.env: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```
