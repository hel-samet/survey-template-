import { Router } from 'express';
import {
  getTelegramSettings,
  sendTestMessage,
  updateTelegramSettings,
} from '../controllers/telegramController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/settings', getTelegramSettings);
router.put('/settings', updateTelegramSettings);
router.post('/test', sendTestMessage);

export default router;
