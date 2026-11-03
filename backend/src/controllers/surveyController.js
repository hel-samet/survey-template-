import { Survey } from '../models/Survey.js';
import { getDashboardStats, getPublicSurvey as loadPublicSurvey, getSurveyWithQuestions } from '../services/surveyService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseId } from '../utils/parseId.js';
import { validateSurvey } from '../validators/surveyValidator.js';

export const listPublicSurveys = asyncHandler(async (req, res) => {
  res.json({ data: await Survey.findAll({ activeOnly: true }) });
});

export const listAllSurveys = asyncHandler(async (req, res) => {
  res.json({ data: await Survey.findAll() });
});

export const getPublicSurvey = asyncHandler(async (req, res) => {
  res.json({ data: await loadPublicSurvey(parseId(req.params.id)) });
});

export const getSurvey = asyncHandler(async (req, res) => {
  res.json({ data: await getSurveyWithQuestions(parseId(req.params.id)) });
});

export const createSurvey = asyncHandler(async (req, res) => {
  const survey = await Survey.create(validateSurvey(req.body));
  res.status(201).json({ data: survey });
});

export const updateSurvey = asyncHandler(async (req, res) => {
  const survey = await Survey.update(parseId(req.params.id), validateSurvey(req.body, { partial: true }));
  if (!survey) throw new ApiError(404, 'Survey not found');
  res.json({ data: survey });
});

export const deleteSurvey = asyncHandler(async (req, res) => {
  const deleted = await Survey.remove(parseId(req.params.id));
  if (!deleted) throw new ApiError(404, 'Survey not found');
  res.status(204).end();
});

export const getStats = asyncHandler(async (req, res) => {
  res.json({ data: await getDashboardStats() });
});
