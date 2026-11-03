import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const list = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  timezone: process.env.TIMEZONE || 'Asia/Phnom_Penh',
  corsOrigins: list(process.env.CORS_ORIGIN || '*'),

  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',

  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',

  // Firebase project used for respondent Google sign-in. Only the project ID is needed to
  // verify ID tokens; leave empty to disable surveys that require sign-in.
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
};

export const isProduction = env.nodeEnv === 'production';
