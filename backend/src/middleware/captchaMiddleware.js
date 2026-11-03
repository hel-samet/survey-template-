import { verifyCaptcha } from '../services/captchaService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Expects the Turnstile token in the JSON body as `captchaToken`.
export const requireCaptcha = asyncHandler(async (req, res, next) => {
  await verifyCaptcha(req.body?.captchaToken, req.ip);
  next();
});
