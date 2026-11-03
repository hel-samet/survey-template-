import { Router } from 'express';
import {
  deleteResponse,
  exportCsv,
  getReport,
  listResponses,
  submitResponse,
} from '../controllers/responseController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { submitLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public
router.post('/', submitLimiter, submitResponse);

// Admin
router.get('/', requireAuth, listResponses);
router.get('/report/:surveyId', requireAuth, getReport);
router.get('/export/:surveyId', requireAuth, exportCsv);
router.delete('/:id', requireAuth, deleteResponse);

export default router;
