// "Live" view of a survey: who has it open right now and how far they got, plus the latest submissions.
// Presence is kept in memory only. It is short-lived by nature, a restart just clears it (open pages
// re-announce themselves within one heartbeat), and it assumes a single server instance (as on Render).
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Question } from '../models/Question.js';
import { Response } from '../models/Response.js';
import { ApiError } from '../utils/ApiError.js';
import { maxScoreOf, scoreAnswers } from './scoringService.js';
import { withScores } from './surveyService.js';

const HEARTBEAT_MS = 15_000; // how often an open survey page reports in (see frontend usePresence)
const IDLE_MS = HEARTBEAT_MS + 10_000; // missed a heartbeat: tab in background or connection lost
const EXPIRE_MS = HEARTBEAT_MS * 3; // gone
const SUBMITTED_KEEP_MS = 2 * 60_000; // keep "just submitted" rows visible for a while
const MAX_SESSIONS_PER_SURVEY = 500;

export const PRESENCE_STATES = ['viewing', 'answering', 'submitted', 'left'];
const SESSION_ID = /^[A-Za-z0-9-]{8,64}$/;

/** @type {Map<number, Map<string, object>>} surveyId -> sessionId -> session */
const surveys = new Map();

const LEADERBOARD_SIZE = 20;
const LEADERBOARD_TTL_MS = 30_000; // also picks up answer-key edits without a new submission
/** @type {Map<number, { version: string, at: number, value: object | null }>} */
const leaderboards = new Map();

function prune(sessions, now) {
  for (const [id, session] of sessions) {
    const ttl = session.state === 'submitted' ? SUBMITTED_KEEP_MS : EXPIRE_MS;
    if (now - session.lastSeen > ttl) sessions.delete(id);
  }
}

// Drop stale sessions and empty surveys even when no admin is watching.
setInterval(() => {
  const now = Date.now();
  for (const [surveyId, sessions] of surveys) {
    prune(sessions, now);
    if (!sessions.size) surveys.delete(surveyId);
  }
  for (const [surveyId, cached] of leaderboards) {
    if (now - cached.at > 10 * 60_000) leaderboards.delete(surveyId);
  }
}, 60_000).unref();

const round = (n) => Math.round(n * 100) / 100;

// Top scores of a graded survey (null when nothing is graded). Scoring every response is the
// expensive part, so it is redone only when `version` (a new submission) changes or the cache ages out.
async function getLeaderboard(surveyId, version) {
  const cached = leaderboards.get(surveyId);
  if (cached && cached.version === version && Date.now() - cached.at < LEADERBOARD_TTL_MS) return cached.value;

  const questions = await Question.findBySurvey(surveyId);
  const maxScore = maxScoreOf(questions);
  let value = null;
  if (maxScore) {
    // Highest score first; on a tie, whoever submitted first.
    const scored = (await Response.findAllBySurvey(surveyId))
      .map((r) => ({ id: r.id, name: r.respondentName, createdAt: r.createdAt, score: scoreAnswers(questions, r.answers).score }))
      .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt));
    // Equal scores share a rank (1, 2, 2, 4).
    let rank = 0;
    const entries = scored.slice(0, LEADERBOARD_SIZE).map((entry, i) => {
      if (i === 0 || entry.score !== scored[i - 1].score) rank = i + 1;
      return { ...entry, rank };
    });
    const average = scored.length ? round(scored.reduce((sum, e) => sum + e.score, 0) / scored.length) : null;
    value = { maxScore, average, count: scored.length, entries };
  }
  leaderboards.set(surveyId, { version, at: Date.now(), value });
  return value;
}

const intIn = (value, max) => Math.min(max, Math.max(0, Number.parseInt(value, 10) || 0));

function deviceOf(userAgent = '') {
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

export function parsePresence(body) {
  let data = body;
  if (typeof body === 'string') {
    try {
      data = JSON.parse(body);
    } catch {
      throw new ApiError(400, 'Presence body must be JSON');
    }
  }
  if (!data || typeof data !== 'object' || !SESSION_ID.test(String(data.sessionId))) {
    throw new ApiError(400, 'Invalid presence session');
  }
  if (!PRESENCE_STATES.includes(data.state)) throw new ApiError(400, 'Invalid presence state');
  return {
    sessionId: data.sessionId,
    state: data.state,
    name: typeof data.name === 'string' ? data.name.trim().slice(0, 120) : '',
    answered: intIn(data.answered, 1000),
    total: intIn(data.total, 1000),
  };
}

export function recordPresence(surveyId, presence, userAgent) {
  const now = Date.now();
  let sessions = surveys.get(surveyId);
  if (!sessions) {
    sessions = new Map();
    surveys.set(surveyId, sessions);
  }
  prune(sessions, now);

  const existing = sessions.get(presence.sessionId);
  // "submitted" is final for a page; the unload ping that follows must not erase it.
  if (existing?.state === 'submitted') return;
  if (presence.state === 'left') {
    sessions.delete(presence.sessionId);
    return;
  }
  if (!existing && sessions.size >= MAX_SESSIONS_PER_SURVEY) return;

  sessions.set(presence.sessionId, {
    // Public row ID, so the admin page never sees the respondent's session ID.
    key: existing?.key ?? crypto.randomBytes(6).toString('hex'),
    name: presence.name,
    answered: Math.min(presence.answered, presence.total || presence.answered),
    total: presence.total,
    state: presence.state,
    device: existing?.device ?? deviceOf(userAgent),
    startedAt: existing?.startedAt ?? now,
    lastSeen: now,
    submittedAt: presence.state === 'submitted' ? now : null,
  });
}

const ORDER = { answering: 0, viewing: 1, submitted: 2 };

export async function getLive(surveyId) {
  const now = Date.now();
  const sessions = surveys.get(surveyId) ?? new Map();
  prune(sessions, now);

  const visitors = [...sessions.values()]
    .map((s) => ({
      key: s.key,
      name: s.name,
      answered: s.answered,
      total: s.total,
      state: s.state,
      idle: s.state !== 'submitted' && now - s.lastSeen > IDLE_MS,
      device: s.device,
      startedAt: new Date(s.startedAt).toISOString(),
      lastSeen: new Date(s.lastSeen).toISOString(),
      submittedAt: s.submittedAt && new Date(s.submittedAt).toISOString(),
    }))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.idle - b.idle || b.startedAt.localeCompare(a.startedAt));

  const [recentRows, counts] = await Promise.all([
    Response.recentBySurvey(surveyId, 20),
    Response.countsSince(surveyId, env.timezone),
  ]);
  const recent = (await withScores(surveyId, recentRows)).map(({ answers: _answers, ...row }) => row);
  const leaderboard = await getLeaderboard(surveyId, `${counts.total}:${recentRows[0]?.id ?? 0}`);

  const open = visitors.filter((v) => v.state !== 'submitted');
  return {
    now: new Date(now).toISOString(),
    refreshMs: 3000,
    counts: {
      online: open.filter((v) => !v.idle).length,
      answering: open.filter((v) => v.state === 'answering' && !v.idle).length,
      lastHour: counts.lastHour,
      today: counts.today,
      total: counts.total,
    },
    visitors,
    recent,
    leaderboard,
  };
}
