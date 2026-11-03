import { ApiError } from '../utils/ApiError.js';

const MAX_TEXT_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;

// Answers arrive as { [questionId]: optionId | optionId[] | text }.
// Returns a cleaned copy or throws 400 with per-question error messages.
export function validateAnswers(questions, rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
    throw new ApiError(400, 'answers must be an object');
  }

  const answers = {};
  const errors = {};

  for (const question of questions) {
    const raw = rawAnswers[question.id];
    const optionIds = new Set(question.options.map((option) => option.id));
    let value;

    if (question.type === 'checkbox') {
      const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
      const unique = [...new Set(list.map(String))];
      if (unique.some((id) => !optionIds.has(id))) errors[question.id] = 'Invalid option selected';
      value = unique.length ? unique : undefined;
    } else if (question.type === 'radio') {
      value = raw == null || raw === '' ? undefined : String(raw);
      if (value !== undefined && !optionIds.has(value)) errors[question.id] = 'Invalid option selected';
    } else {
      value = typeof raw === 'string' ? raw.trim().slice(0, MAX_TEXT_LENGTH) : '';
      value = value || undefined;
    }

    if (value === undefined) {
      if (question.isRequired) errors[question.id] = 'This question is required';
      continue;
    }
    if (!errors[question.id]) answers[question.id] = value;
  }

  if (Object.keys(errors).length) {
    throw new ApiError(400, 'Some answers are missing or invalid', errors);
  }
  return answers;
}

export function cleanRespondentName(value) {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, MAX_NAME_LENGTH) || null;
}
