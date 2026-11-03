import { Question } from '../models/Question.js';
import { Response } from '../models/Response.js';
import { Survey } from '../models/Survey.js';
import { ApiError } from '../utils/ApiError.js';
import { CHOICE_TYPES, RANGE_TYPES, rangeOf } from '../validators/questionTypes.js';
import { cleanRespondentName, validateAnswers } from '../validators/responseValidator.js';
import { formatAnswer, notifyNewResponse } from './notificationService.js';
import { verifyRespondentToken } from './respondentAuthService.js';

const round = (n) => Math.round(n * 100) / 100;

export async function getSurveyWithQuestions(id, { activeOnly = false } = {}) {
  const survey = await Survey.findById(id);
  if (!survey || (activeOnly && !survey.isActive)) {
    throw new ApiError(404, 'Survey not found');
  }
  const questions = await Question.findBySurvey(id);
  return { ...survey, questions };
}

const alreadySubmitted = () =>
  new ApiError(409, 'You have already submitted this survey', { auth: 'already_submitted' });

// For surveys that require sign-in: has this Google account already answered?
export async function getSubmissionStatus(surveyId, idToken) {
  const survey = await Survey.findById(surveyId);
  if (!survey || !survey.isActive) throw new ApiError(404, 'Survey not found');
  if (!survey.requireLogin) return { requireLogin: false, submitted: false };

  const respondent = await verifyRespondentToken(idToken);
  const blocking = await Response.findBlocking(surveyId, respondent.uid);
  return { requireLogin: true, submitted: Boolean(blocking), email: respondent.email };
}

export async function submitResponse(surveyId, { answers, respondentName }, idToken) {
  const survey = await getSurveyWithQuestions(surveyId, { activeOnly: true });
  if (!survey.questions.length) {
    throw new ApiError(400, 'This survey has no questions yet');
  }

  // Sign-in surveys: one counting response per Google account until an admin allows another.
  let respondent = null;
  if (survey.requireLogin) {
    respondent = await verifyRespondentToken(idToken);
    if (await Response.findBlocking(surveyId, respondent.uid)) throw alreadySubmitted();
  }

  const name = cleanRespondentName(respondentName) || cleanRespondentName(respondent?.name);
  if (!name) {
    throw new ApiError(400, 'Please enter your name', { respondentName: 'This field is required' });
  }

  let response;
  try {
    response = await Response.create({
      surveyId,
      respondentName: name,
      respondentUid: respondent?.uid ?? null,
      respondentEmail: respondent?.email ?? null,
      answers: validateAnswers(survey.questions, answers),
    });
  } catch (err) {
    // Two tabs submitting at once: the unique index lets only the first one through.
    if (err.alreadySubmitted) throw alreadySubmitted();
    throw err;
  }

  // Fire-and-forget: a Telegram outage must never fail the respondent's submission.
  notifyNewResponse(survey, response).catch((err) => {
    console.error('[telegram] Notification failed:', err.message);
  });

  return response;
}

export async function buildReport(surveyId) {
  const survey = await getSurveyWithQuestions(surveyId);
  const responses = await Response.findAllBySurvey(surveyId);

  const questions = survey.questions.map((question) => {
    const values = responses
      .map((response) => ({ value: response.answers[question.id], createdAt: response.createdAt }))
      .filter(({ value }) => value !== undefined && value !== null && value !== '');

    const base = { ...question, answeredCount: values.length };

    if (CHOICE_TYPES.includes(question.type)) {
      const counts = Object.fromEntries(question.options.map((option) => [option.id, 0]));
      for (const { value } of values) {
        for (const id of Array.isArray(value) ? value : [value]) {
          if (id in counts) counts[id] += 1;
        }
      }
      return { ...base, options: question.options.map((option) => ({ ...option, count: counts[option.id] })) };
    }

    const numbers = values.map(({ value }) => Number(value)).filter(Number.isFinite);
    const average = numbers.length ? round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length) : null;

    if (RANGE_TYPES.includes(question.type)) {
      const { min, max } = rangeOf(question);
      const distribution = [];
      for (let point = max; point >= min; point -= 1) {
        distribution.push({ value: point, count: numbers.filter((n) => n === point).length });
      }
      return { ...base, average, distribution };
    }

    if (question.type === 'number') {
      const stats = numbers.length ? { average, min: Math.min(...numbers), max: Math.max(...numbers) } : null;
      return { ...base, stats, textAnswers: values.slice(0, 50) };
    }

    // text, paragraph, email, phone, date
    return { ...base, textAnswers: values.slice(0, 50) };
  });

  const { questions: _omit, ...surveyInfo } = survey;
  return { survey: surveyInfo, totalResponses: responses.length, questions };
}

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export async function buildCsv(surveyId, lang = 'en') {
  const survey = await getSurveyWithQuestions(surveyId);
  const responses = await Response.findAllBySurvey(surveyId);
  const pick = (localized) => localized?.[lang] || localized?.en || localized?.km || '';

  const header = ['ID', 'Submitted At', 'Name', 'Email', ...survey.questions.map((q) => pick(q.text))];
  const rows = responses.map((response) => [
    response.id,
    new Date(response.createdAt).toISOString(),
    response.respondentName || '',
    response.respondentEmail || '',
    ...survey.questions.map((q) => formatAnswer(q, response.answers[q.id], lang).replace(/, /g, '; ')),
  ]);

  // The BOM lets Excel detect UTF-8 so Khmer text displays correctly.
  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export async function getDashboardStats() {
  const [surveys, totalResponses, responsesLast7Days, recentResponses] = await Promise.all([
    Survey.findAll(),
    Response.countAll(),
    Response.countSince(7),
    Response.findRecent(8),
  ]);

  return {
    totalSurveys: surveys.length,
    activeSurveys: surveys.filter((s) => s.isActive).length,
    totalResponses,
    responsesLast7Days,
    topSurveys: [...surveys]
      .sort((a, b) => b.responseCount - a.responseCount)
      .slice(0, 5)
      .map(({ id, title, responseCount }) => ({ id, title, responseCount })),
    recentResponses,
  };
}
