import express, { Router } from 'express';
import {
  createSurvey,
  deleteCover,
  deleteSurvey,
  getCover,
  getLiveStatus,
  getPublicSurvey,
  getStats,
  getSurvey,
  listAllSurveys,
  listPublicSurveys,
  postPresence,
  updateSurvey,
  uploadCover,
} from '../controllers/surveyController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { presenceLimiter } from '../middleware/rateLimiter.js';
import { MAX_COVER_BYTES } from '../validators/surveyValidator.js';

// Cover uploads are sent as the raw image body (Content-Type: image/jpeg|png|webp).
const rawImage = express.raw({ type: 'image/*', limit: MAX_COVER_BYTES });

const router = Router();

// Public
router.get('/', listPublicSurveys);

// Admin (declared before "/:id" so these paths are not captured as IDs)
router.get('/all', requireAuth, listAllSurveys);
router.get('/stats', requireAuth, getStats);

router.get('/:id', getPublicSurvey);
router.get('/:id/admin', requireAuth, getSurvey);
router.get('/:id/live', requireAuth, getLiveStatus);
router.post('/:id/presence', presenceLimiter, express.text({ type: 'text/plain', limit: '2kb' }), postPresence);
router.get('/:id/cover', getCover);
router.put('/:id/cover', requireAuth, rawImage, uploadCover);
router.delete('/:id/cover', requireAuth, deleteCover);
router.post('/', requireAuth, createSurvey);
router.put('/:id', requireAuth, updateSurvey);
router.delete('/:id', requireAuth, deleteSurvey);

export default router;
