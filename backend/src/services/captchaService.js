import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const isCaptchaEnabled = () => Boolean(env.turnstileSecretKey);

// Verifies a Cloudflare Turnstile token. Tokens are single-use and expire after 5 minutes.
// Fails closed: if Cloudflare cannot be reached the request is rejected, not let through.
export async function verifyCaptcha(token, remoteIp) {
  if (!isCaptchaEnabled()) return;

  if (typeof token !== 'string' || !token || token.length > 2048) {
    throw new ApiError(400, 'Please complete the CAPTCHA', { captcha: 'missing' });
  }

  let result;
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.turnstileSecretKey, response: token, remoteip: remoteIp || '' }),
      signal: AbortSignal.timeout(10_000),
    });
    result = await res.json();
  } catch (err) {
    throw new ApiError(503, `Could not verify CAPTCHA: ${err.message}`);
  }

  if (!result.success) {
    throw new ApiError(400, 'CAPTCHA check failed, please try again', {
      captcha: (result['error-codes'] || []).join(',') || 'failed',
    });
  }
}
