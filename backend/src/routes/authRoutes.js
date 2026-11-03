import { Router } from 'express';
import { login, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireCaptcha } from '../middleware/captchaMiddleware.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login', loginLimiter, requireCaptcha, login);
router.get('/me', requireAuth, me);

export default router;
