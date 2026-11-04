// Mirrors backend/src/validators/questionTypes.js. Labels live in i18n under questions.types.*.
export const TYPE_GROUPS = [
  { key: 'choice', types: ['checkbox', 'radio', 'dropdown', 'yesno'] },
  { key: 'rating', types: ['rating', 'scale'] },
  { key: 'text', types: ['text', 'paragraph'] },
  { key: 'specific', types: ['number', 'email', 'phone', 'date'] },
];

export const TYPE_ICONS = {
  checkbox: 'checkSquare',
  radio: 'circleDot',
  dropdown: 'chevronDown',
  yesno: 'thumbsUp',
  rating: 'star',
  scale: 'sliders',
  text: 'type',
  paragraph: 'alignLeft',
  number: 'hash',
  email: 'mail',
  phone: 'phone',
  date: 'calendar',
};

// Types whose options the admin writes.
export const OPTION_TYPES = ['checkbox', 'radio', 'dropdown'];
// Types whose answers are option IDs.
export const CHOICE_TYPES = [...OPTION_TYPES, 'yesno'];
export const RANGE_TYPES = ['rating', 'scale'];

// "Other" with a free-text answer (settings.allowOther). The server appends an option with OTHER_ID;
// the typed text travels next to the answer as answers["<questionId>:other"].
export const OTHER_TYPES = ['checkbox', 'radio'];
export const OTHER_ID = '__other';
export const otherKey = (questionId) => `${questionId}:other`;

export const DEFAULT_SETTINGS = {
  rating: { max: 5 },
  scale: { min: 1, max: 5, minLabel: {}, maxLabel: {} },
};

export function rangeOf(question) {
  const settings = question.settings ?? {};
  if (question.type === 'rating') return { min: 1, max: settings.max ?? 5 };
  return { min: settings.min ?? 1, max: settings.max ?? 5 };
}

export const range = (min, max) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

// Client-side format checks; the server re-validates every answer.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9][0-9\s\-().]{5,28}$/;

export function formatError(question, value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (question.type === 'email' && !EMAIL.test(text)) return 'survey.errors.invalidEmail';
  if (question.type === 'phone' && !PHONE.test(text)) return 'survey.errors.invalidPhone';
  if (question.type === 'number' && !Number.isFinite(Number(text.replace(',', '.')))) {
    return 'survey.errors.invalidNumber';
  }
  return null;
}

// Human-readable answer for tables. `tl` picks the right language from { en, km }.
// `answers` is the whole response's answers object (it holds the "Other" text).
export function formatAnswerValue(question, answers, tl) {
  const value = answers?.[question.id];
  if (value === undefined || value === null || value === '') return '—';
  if (CHOICE_TYPES.includes(question.type)) {
    return (Array.isArray(value) ? value : [value])
      .map((id) => {
        const label = tl(question.options.find((o) => o.id === id)?.label) || id;
        const other = id === OTHER_ID && answers[otherKey(question.id)];
        return other ? `${label}: ${other}` : label;
      })
      .join(', ');
  }
  if (question.type === 'rating') return `${'★'.repeat(value)} ${value}/${rangeOf(question).max}`;
  if (question.type === 'scale') return `${value}/${rangeOf(question).max}`;
  return String(value);
}
