import { Question } from '../models/Question.js';
import { Survey } from '../models/Survey.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseId } from '../utils/parseId.js';
import { normalizeQuestion, validateQuestion } from '../validators/surveyValidator.js';

async function assertSurveyExists(surveyId) {
  if (!(await Survey.findById(surveyId))) throw new ApiError(404, 'Survey not found');
}

export const listQuestions = asyncHandler(async (req, res) => {
  const surveyId = parseId(req.query.surveyId, 'surveyId');
  res.json({ data: await Question.findBySurvey(surveyId) });
});

export const createQuestion = asyncHandler(async (req, res) => {
  const surveyId = parseId(req.body?.surveyId, 'surveyId');
  const data = validateQuestion(req.body);
  await assertSurveyExists(surveyId);

  Object.assign(data, normalizeQuestion(data.type, data));
  const question = await Question.create({ ...data, surveyId });
  res.status(201).json({ data: question });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await Question.findById(id);
  if (!existing) throw new ApiError(404, 'Question not found');

  const data = validateQuestion(req.body, { partial: true });
  Object.assign(
    data,
    normalizeQuestion(data.type ?? existing.type, {
      options: data.options ?? existing.options,
      settings: data.settings ?? existing.settings,
    }),
  );
  res.json({ data: await Question.update(id, data) });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const deleted = await Question.remove(parseId(req.params.id));
  if (!deleted) throw new ApiError(404, 'Question not found');
  res.status(204).end();
});

export const reorderQuestions = asyncHandler(async (req, res) => {
  const surveyId = parseId(req.body?.surveyId, 'surveyId');
  const ids = req.body?.ids;
  if (!Array.isArray(ids)) throw new ApiError(400, 'ids must be an array of question IDs');

  const questions = await Question.reorder(
    surveyId,
    ids.map((id) => parseId(id, 'question id')),
  );
  res.json({ data: questions });
});
