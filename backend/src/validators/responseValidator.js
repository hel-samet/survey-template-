import { ApiError } from '../utils/ApiError.js';
import { CHOICE_TYPES, OTHER_ID, RANGE_TYPES, TEXT_LIMITS, otherKey, rangeOf } from './questionTypes.js';

const MAX_NAME_LENGTH = 120;

class InvalidAnswer extends Error {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9\s\-().]{5,28}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isEmpty = (raw) => raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && !raw.length);

function isRealDate(text) {
  if (!DATE.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

// Returns the cleaned answer, or throws InvalidAnswer describing why it is rejected.
function cleanAnswer(question, raw) {
  const optionIds = new Set(question.options.map((option) => option.id));

  if (question.type === 'checkbox') {
    const ids = [...new Set((Array.isArray(raw) ? raw : [raw]).map(String))];
    if (ids.some((id) => !optionIds.has(id))) throw new InvalidAnswer('Invalid option selected');
    return ids;
  }

  if (CHOICE_TYPES.includes(question.type)) {
    const id = String(raw);
    if (!optionIds.has(id)) throw new InvalidAnswer('Invalid option selected');
    return id;
  }

  if (RANGE_TYPES.includes(question.type)) {
    const { min, max } = rangeOf(question);
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) throw new InvalidAnswer(`Choose a value from ${min} to ${max}`);
    return n;
  }

  if (question.type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || Math.abs(n) > 1e15) throw new InvalidAnswer('Enter a valid number');
    return n;
  }

  const text = typeof raw === 'string' ? raw.trim() : String(raw).trim();

  if (question.type === 'email') {
    if (text.length > TEXT_LIMITS.email || !EMAIL.test(text)) throw new InvalidAnswer('Enter a valid email address');
    return text.toLowerCase();
  }
  if (question.type === 'phone') {
    if (!PHONE.test(text)) throw new InvalidAnswer('Enter a valid phone number');
    return text;
  }
  if (question.type === 'date') {
    if (!isRealDate(text)) throw new InvalidAnswer('Enter a valid date');
    return text;
  }

  // text / paragraph
  return text.slice(0, TEXT_LIMITS[question.type] ?? TEXT_LIMITS.paragraph);
}

// Answers arrive as { [questionId]: value }; see questionTypes.js for each type's value shape.
// Returns a cleaned copy or throws 400 with per-question error messages.
export function validateAnswers(questions, rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
    throw new ApiError(400, 'answers must be an object');
  }

  const answers = {};
  const errors = {};

  for (const question of questions) {
    const raw = rawAnswers[question.id];
    const blank = isEmpty(raw) || (typeof raw === 'string' && !raw.trim());

    if (blank) {
      if (question.isRequired) errors[question.id] = 'This question is required';
      continue;
    }

    try {
      const answer = cleanAnswer(question, raw);
      answers[question.id] = answer;
      if ([answer].flat().includes(OTHER_ID)) {
        const rawOther = rawAnswers[otherKey(question.id)];
        const other = typeof rawOther === 'string' ? rawOther.trim().slice(0, TEXT_LIMITS.other) : '';
        if (!other) throw new InvalidAnswer('Please type your "Other" answer');
        answers[otherKey(question.id)] = other;
      }
    } catch (err) {
      if (!(err instanceof InvalidAnswer)) throw err;
      errors[question.id] = err.message;
    }
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
