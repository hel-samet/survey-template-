// Single source of truth for question types and how each one stores its answer.
//
//   type        answer value                 options     settings
//   checkbox    ["optId", ...]               custom      -
//   radio       "optId"                      custom      -
//   dropdown    "optId"                      custom      -
//   yesno       "yes" | "no"                 fixed       -
//   rating      1..max (integer)             -           { max }
//   scale       min..max (integer)           -           { min, max, minLabel, maxLabel }
//   text        string (≤ 500)               -           -
//   paragraph   string (≤ 2000)              -           -
//   number      number                       -           -
//   email       string                       -           -
//   phone       string                       -           -
//   date        "YYYY-MM-DD"                 -           -
export const QUESTION_TYPES = [
  'checkbox',
  'radio',
  'dropdown',
  'yesno',
  'rating',
  'scale',
  'text',
  'paragraph',
  'number',
  'email',
  'phone',
  'date',
];

// Types whose options the admin writes.
export const OPTION_TYPES = ['checkbox', 'radio', 'dropdown'];
// Types whose answers are option IDs (reported as counts per option).
export const CHOICE_TYPES = [...OPTION_TYPES, 'yesno'];
// Types whose answers are integers on a fixed range (reported as a distribution + average).
export const RANGE_TYPES = ['rating', 'scale'];

export const YES_NO_OPTIONS = [
  { id: 'yes', label: { en: 'Yes', km: 'បាទ/ចាស' } },
  { id: 'no', label: { en: 'No', km: 'ទេ' } },
];

export const TEXT_LIMITS = { text: 500, paragraph: 2000, email: 254, phone: 30, other: 500 };

// Checkbox and multiple-choice questions can offer "Other" with a free-text answer (settings.allowOther).
// The server appends OTHER_OPTION to their options, so counts, reports and validation treat it like any
// option; the typed text is stored next to the answer in answers["<questionId>:other"].
export const OTHER_TYPES = ['checkbox', 'radio'];
export const OTHER_ID = '__other';
export const OTHER_OPTION = { id: OTHER_ID, label: { en: 'Other', km: 'ផ្សេងៗ' } };
export const otherKey = (questionId) => `${questionId}:other`;

// Inclusive answer range for rating / scale questions.
export function rangeOf(question) {
  const settings = question.settings ?? {};
  if (question.type === 'rating') return { min: 1, max: settings.max ?? 5 };
  return { min: settings.min ?? 1, max: settings.max ?? 5 };
}
