import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { env } from './env.js';

// Credential lookup order:
//   1. FIREBASE_SERVICE_ACCOUNT (JSON or base64) — recommended for Render / VPS
//   2. FIRESTORE_EMULATOR_HOST set — local emulator, no credentials needed
//   3. GOOGLE_APPLICATION_CREDENTIALS file / Google Cloud default credentials
function appOptions() {
  const { serviceAccount, projectId } = env.firebase;
  if (serviceAccount) {
    return { credential: cert(serviceAccount), projectId: projectId || serviceAccount.project_id };
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return { projectId: projectId || 'demo-survey' };
  }
  return { credential: applicationDefault(), projectId: projectId || undefined };
}

const app = getApps()[0] || initializeApp(appOptions());

export const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

export { FieldValue, Timestamp };

export const collections = {
  surveys: () => db.collection('surveys'),
  questions: () => db.collection('questions'),
  responses: () => db.collection('responses'),
  settings: () => db.collection('settings'),
  // `{surveyId}_{googleUid}` documents enforcing one answer per signed-in respondent
  submissionLocks: () => db.collection('submissionLocks'),
};

export const toIso = (value) => (value?.toDate ? value.toDate().toISOString() : (value ?? null));

// Firestore batches are capped at 500 writes; deletes in chunks to stay under it.
export async function deleteQuery(query) {
  const snapshot = await query.get();
  for (let i = 0; i < snapshot.docs.length; i += 400) {
    const batch = db.batch();
    snapshot.docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  return snapshot.size;
}
