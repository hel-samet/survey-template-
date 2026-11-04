import { Response } from '../models/Response.js';
import { buildXlsx } from '../services/excelExportService.js';
import { respondentTokenFrom } from '../services/respondentAuthService.js';
import {
  buildCsv,
  buildReport,
  getSubmissionStatus,
  submitResponse as submit,
  withScores,
} from '../services/surveyService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseId } from '../utils/parseId.js';

const MAX_PAGE_SIZE = 100;

export const submitResponse = asyncHandler(async (req, res) => {
  const surveyId = parseId(req.body?.surveyId, 'surveyId');
  const response = await submit(surveyId, req.body, respondentTokenFrom(req));
  res.status(201).json({ data: { id: response.id, createdAt: response.createdAt, score: response.score } });
});

export const submissionStatus = asyncHandler(async (req, res) => {
  const surveyId = parseId(req.query.surveyId, 'surveyId');
  res.json({ data: await getSubmissionStatus(surveyId, respondentTokenFrom(req)) });
});

export const allowResubmit = asyncHandler(async (req, res) => {
  const allowed = await Response.allowResubmit(parseId(req.params.id));
  if (!allowed) throw new ApiError(404, 'Response not found or not from a signed-in respondent');
  res.json({ data: { resubmitAllowed: true } });
});

export const listResponses = asyncHandler(async (req, res) => {
  const surveyId = parseId(req.query.surveyId, 'surveyId');
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));

  const [rows, total] = await Promise.all([
    Response.findBySurvey(surveyId, { limit: pageSize, offset: (page - 1) * pageSize }),
    Response.countBySurvey(surveyId),
  ]);

  res.json({
    data: await withScores(surveyId, rows),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});

export const getReport = asyncHandler(async (req, res) => {
  res.json({ data: await buildReport(parseId(req.params.surveyId, 'surveyId')) });
});

export const exportCsv = asyncHandler(async (req, res) => {
  const surveyId = parseId(req.params.surveyId, 'surveyId');
  const lang = req.query.lang === 'km' ? 'km' : 'en';

  if (req.query.format === 'xlsx') {
    const buffer = await buildXlsx(surveyId, lang);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${surveyId}-responses.xlsx"`);
    res.send(Buffer.from(buffer));
    return;
  }

  const csv = await buildCsv(surveyId, lang);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="survey-${surveyId}-responses.csv"`);
  res.send(csv);
});

export const deleteResponse = asyncHandler(async (req, res) => {
  const deleted = await Response.remove(parseId(req.params.id));
  if (!deleted) throw new ApiError(404, 'Response not found');
  res.status(204).end();
});
