import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Hashing first gives equal-length buffers, so the comparison is constant-time.
const safeEqual = (a, b) => {
  const hash = (value) => crypto.createHash('sha256').update(String(value)).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
};

export const login = asyncHandler(async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const usernameOk = safeEqual(username, env.adminUsername);
  const passwordOk = safeEqual(password, env.adminPassword);

  if (!usernameOk || !passwordOk) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const token = jwt.sign({ sub: env.adminUsername, role: 'admin' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  res.json({ data: { token, user: { username: env.adminUsername } } });
});

export const me = (req, res) => {
  res.json({ data: { username: req.user.sub } });
};
