import 'dotenv/config';

const required = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const list = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// Accepts the service account JSON as-is or base64-encoded (easier to paste into hosting dashboards).
function parseServiceAccount(raw) {
  if (!raw) return null;
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  try {
    const account = JSON.parse(text);
    if (account.private_key) account.private_key = account.private_key.replace(/\\n/g, '\n');
    return account;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT must be the service account JSON or its base64 encoding');
  }
}

const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id || '';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  timezone: process.env.TIMEZONE || 'Asia/Phnom_Penh',
  corsOrigins: list(process.env.CORS_ORIGIN || '*'),

  firebase: {
    projectId: firebaseProjectId,
    serviceAccount,
  },

  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',

  // Firebase project used for respondent Google sign-in (Firestore and sign-in share one project).
  // Only the project ID is needed to verify ID tokens; empty disables surveys that require sign-in.
  firebaseProjectId,

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
};

export const isProduction = env.nodeEnv === 'production';
