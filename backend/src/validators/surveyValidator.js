import crypto from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';
import { OPTION_TYPES, QUESTION_TYPES, YES_NO_OPTIONS } from './questionTypes.js';

export const LANGUAGES = ['en', 'km'];
export { QUESTION_TYPES };

// Accepts "text" or { en, km } and returns a cleaned { en?, km? } object.
function localized(value, { field, required = false, max = 500 }) {
  const source = typeof value === 'string' ? { en: value } : value;
  if (source != null && (typeof source !== 'object' || Array.isArray(source))) {
    throw new ApiError(400, `${field} must be a string or an { en, km } object`);
  }

  const result = {};
  for (const lang of LANGUAGES) {
    const text = typeof source?.[lang] === 'string' ? source[lang].trim().slice(0, max) : '';
    if (text) result[lang] = text;
  }

  if (required && !Object.keys(result).length) {
    throw new ApiError(400, `${field} is required`);
  }
  return result;
}

const randomOptionId = () => `opt_${crypto.randomBytes(4).toString('hex')}`;

function validateOptions(options) {
  if (!Array.isArray(options)) {
    throw new ApiError(400, 'options must be an array');
  }
  if (options.length > 50) {
    throw new ApiError(400, 'A question can have at most 50 options');
  }

  const seen = new Set();
  return options.map((option, index) => {
    const label = localized(option?.label, { field: `options[${index}].label`, required: true, max: 300 });
    let id = typeof option?.id === 'string' && /^[\w-]{1,40}$/.test(option.id) ? option.id : randomOptionId();
    while (seen.has(id)) id = randomOptionId();
    seen.add(id);
    return { id, label };
  });
}

export function validateSurvey(body = {}, { partial = false } = {}) {
  const data = {};
  if (!partial || body.title !== undefined) {
    data.title = localized(body.title, { field: 'title', required: true, max: 200 });
  }
  if (!partial || body.description !== undefined) {
    data.description = localized(body.description, { field: 'description', max: 2000 });
  }
  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }
  return data;
}

export function validateQuestion(body = {}, { partial = false } = {}) {
  const data = {};
  if (!partial || body.text !== undefined) {
    data.text = localized(body.text, { field: 'text', required: true, max: 1000 });
  }
  if (!partial || body.type !== undefined) {
    if (!QUESTION_TYPES.includes(body.type)) {
      throw new ApiError(400, `type must be one of: ${QUESTION_TYPES.join(', ')}`);
    }
    data.type = body.type;
  }
  if (body.options !== undefined) {
    data.options = validateOptions(body.options);
  }
  if (body.settings !== undefined) {
    if (body.settings === null || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
      throw new ApiError(400, 'settings must be an object');
    }
    data.settings = body.settings;
  }
  if (body.isRequired !== undefined) {
    data.isRequired = Boolean(body.isRequired);
  }
  if (body.position !== undefined) {
    data.position = Number.parseInt(body.position, 10) || 0;
  }
  return data;
}

const intIn = (value, min, max, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

function normalizeSettings(type, settings = {}) {
  if (type === 'rating') {
    return { max: intIn(settings.max, 3, 10, 5) };
  }
  if (type === 'scale') {
    const min = intIn(settings.min, 0, 1, 1);
    const max = intIn(settings.max, min + 1, 10, 5);
    return {
      min,
      max,
      minLabel: localized(settings.minLabel, { field: 'settings.minLabel', max: 60 }),
      maxLabel: localized(settings.maxLabel, { field: 'settings.maxLabel', max: 60 }),
    };
  }
  return {};
}

// Gives every type a consistent shape: custom options only where the admin writes them,
// fixed Yes/No options, and settings cleaned to what the type understands.
export function normalizeQuestion(type, { options = [], settings = {} } = {}) {
  if (OPTION_TYPES.includes(type) && options.length < 2) {
    throw new ApiError(400, 'Checkbox, multiple choice and dropdown questions need at least 2 options');
  }

  return {
    options: OPTION_TYPES.includes(type) ? options : type === 'yesno' ? YES_NO_OPTIONS : [],
    settings: normalizeSettings(type, settings),
  };
}
