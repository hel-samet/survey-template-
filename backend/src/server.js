import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { pool } from './config/database.js';
import { env, isProduction } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import responseRoutes from './routes/responseRoutes.js';
import surveyRoutes from './routes/surveyRoutes.js';
import telegramRoutes from './routes/telegramRoutes.js';

const app = express();

// Render and most VPS setups sit behind a reverse proxy; needed for correct client IPs in rate limiting.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.corsOrigins.includes('*') ? '*' : env.corsOrigins }));
app.use(express.json({ limit: '1mb' }));
// Live-status heartbeats and polling arrive every few seconds; log them only when they fail.
const isLiveTraffic = (req, res) => res.statusCode < 400 && /^\/api\/surveys\/\d+\/(presence|live)\b/.test(req.originalUrl);
app.use(morgan(isProduction ? 'combined' : 'dev', { skip: isLiveTraffic }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/telegram', telegramRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`[server] API listening on http://localhost:${env.port}/api`);
});

const shutdown = (signal) => {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => pool.end().finally(() => process.exit(0)));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
