import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const isRespondentAuthEnabled = () => Boolean(env.firebaseProjectId);

// Verifying ID tokens only needs the project ID (Google's public keys are fetched
// automatically), so no service account key is required for sign-in.
function auth() {
  const app = getApps()[0] || initializeApp({ projectId: env.firebaseProjectId });
  return getAuth(app);
}

// Returns { uid, email, name } for a valid Firebase ID token issued by Google sign-in.
export async function verifyRespondentToken(idToken) {
  if (!isRespondentAuthEnabled()) {
    throw new ApiError(503, 'Google sign-in is not configured on the server');
  }
  if (typeof idToken !== 'string' || !idToken) {
    throw new ApiError(401, 'Please sign in with Google to answer this survey', { auth: 'required' });
  }

  let decoded;
  try {
    decoded = await auth().verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, 'Your sign-in has expired. Please sign in again.', { auth: 'invalid' });
  }

  if (decoded.firebase?.sign_in_provider !== 'google.com' || !decoded.email || !decoded.email_verified) {
    throw new ApiError(401, 'Please sign in with a Google account', { auth: 'invalid' });
  }
  return { uid: decoded.uid, email: decoded.email.toLowerCase(), name: decoded.name || '' };
}

// The respondent's token travels in its own header so it never collides with the admin JWT.
export const respondentTokenFrom = (req) => req.get('X-Respondent-Token') || '';
