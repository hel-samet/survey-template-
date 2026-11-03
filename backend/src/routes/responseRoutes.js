import { Router } from 'express';
import {
  allowResubmit,
  deleteResponse,
  exportCsv,
  getReport,
  listResponses,
  submissionStatus,
  submitResponse,
} from '../controllers/responseController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { submitLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public (sign-in surveys read the respondent's Google token from X-Respondent-Token)
router.post('/', submitLimiter, submitResponse);
router.get('/status', submissionStatus);

// Admin
router.get('/', requireAuth, listResponses);
router.get('/report/:surveyId', requireAuth, getReport);
router.get('/export/:surveyId', requireAuth, exportCsv);
router.post('/:id/allow-resubmit', requireAuth, allowResubmit);
router.delete('/:id', requireAuth, deleteResponse);

export default router;
