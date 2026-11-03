import en from './en.js';
import km from './km.js';

export const translations = { en, km };
export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en-GB' },
  { code: 'km', label: 'ខ្មែរ', short: 'ខ្មែរ', locale: 'km-KH' },
];

const lookup = (dict, key) => key.split('.').reduce((node, part) => node?.[part], dict);

// translate('km', 'home.questions', { count: 3 }) -> "សំណួរ 3"
export function translate(lang, key, vars = {}) {
  const template = lookup(translations[lang], key) ?? lookup(translations[DEFAULT_LANGUAGE], key);
  if (typeof template !== 'string') return key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match));
}

// Picks the right language from a { en, km } object coming from the API.
export function localize(value, lang) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value[DEFAULT_LANGUAGE] || Object.values(value).find(Boolean) || '';
}

export function formatDateTime(value, lang) {
  if (!value) return '';
  const locale = LANGUAGES.find((l) => l.code === lang)?.locale || 'en-GB';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
