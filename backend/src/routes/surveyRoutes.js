import { Router } from 'express';
import {
  createSurvey,
  deleteSurvey,
  getPublicSurvey,
  getStats,
  getSurvey,
  listAllSurveys,
  listPublicSurveys,
  updateSurvey,
} from '../controllers/surveyController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public
router.get('/', listPublicSurveys);

// Admin (declared before "/:id" so these paths are not captured as IDs)
router.get('/all', requireAuth, listAllSurveys);
router.get('/stats', requireAuth, getStats);

router.get('/:id', getPublicSurvey);
router.get('/:id/admin', requireAuth, getSurvey);
router.post('/', requireAuth, createSurvey);
router.put('/:id', requireAuth, updateSurvey);
router.delete('/:id', requireAuth, deleteSurvey);

export default router;
