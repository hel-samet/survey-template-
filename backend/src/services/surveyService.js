import { Question } from '../models/Question.js';
import { Response } from '../models/Response.js';
import { Survey } from '../models/Survey.js';
import { ApiError } from '../utils/ApiError.js';
import { cleanRespondentName, validateAnswers } from '../validators/responseValidator.js';
import { formatAnswer, notifyNewResponse } from './notificationService.js';

export async function getSurveyWithQuestions(id, { activeOnly = false } = {}) {
  const survey = await Survey.findById(id);
  if (!survey || (activeOnly && !survey.isActive)) {
    throw new ApiError(404, 'Survey not found');
  }
  const questions = await Question.findBySurvey(id);
  return { ...survey, questions };
}

export async function submitResponse(surveyId, { answers, respondentName }) {
  const survey = await getSurveyWithQuestions(surveyId, { activeOnly: true });
  if (!survey.questions.length) {
    throw new ApiError(400, 'This survey has no questions yet');
  }

  const response = await Response.create({
    surveyId,
    respondentName: cleanRespondentName(respondentName),
    answers: validateAnswers(survey.questions, answers),
  });

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

    if (question.type === 'text') {
      return { ...question, answeredCount: values.length, textAnswers: values.slice(0, 50) };
    }

    const counts = Object.fromEntries(question.options.map((option) => [option.id, 0]));
    for (const { value } of values) {
      for (const id of Array.isArray(value) ? value : [value]) {
        if (id in counts) counts[id] += 1;
      }
    }

    return {
      ...question,
      answeredCount: values.length,
      options: question.options.map((option) => ({ ...option, count: counts[option.id] })),
    };
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

  const header = ['ID', 'Submitted At', 'Name', ...survey.questions.map((q) => pick(q.text))];
  const rows = responses.map((response) => [
    response.id,
    new Date(response.createdAt).toISOString(),
    response.respondentName || '',
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
