import { CHOICE_TYPES } from '../validators/questionTypes.js';

// A question counts toward the score when it is a choice question with an answer key and points.
export const isGraded = (question) =>
  CHOICE_TYPES.includes(question.type) && question.settings?.points > 0 && question.settings.correct?.length > 0;

// Checkboxes must match the answer key exactly (every correct option, no wrong ones).
export function isCorrect(question, value) {
  if (value === undefined || value === null) return false;
  const correct = question.settings.correct;
  if (question.type === 'checkbox') {
    const chosen = new Set(Array.isArray(value) ? value : [value]);
    return chosen.size === correct.length && correct.every((id) => chosen.has(id));
  }
  return correct.includes(String(value));
}

export const maxScoreOf = (questions) =>
  round(questions.filter(isGraded).reduce((sum, q) => sum + q.settings.points, 0));

// Returns null for surveys without graded questions, otherwise { score, maxScore, results }.
export function scoreAnswers(questions, answers = {}) {
  const graded = questions.filter(isGraded);
  if (!graded.length) return null;

  const results = {};
  let score = 0;
  for (const question of graded) {
    const correct = isCorrect(question, answers[question.id]);
    results[question.id] = correct;
    if (correct) score += question.settings.points;
  }
  return { score: round(score), maxScore: maxScoreOf(questions), results };
}

// Respondents must never receive the answer key; points stay visible.
export function withoutAnswerKey(question) {
  if (!question.settings?.correct) return question;
  const { correct: _hidden, ...settings } = question.settings;
  return { ...question, settings };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
