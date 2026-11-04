import rateLimit from 'express-rate-limit';

const json = (message) => ({ error: { message } });

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many login attempts, please try again later'),
});

// Open survey pages ping every 15 s plus on progress changes; a whole classroom may share one IP.
export const presenceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many requests'),
});

export const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: json('Too many submissions, please slow down'),
});
