import { env } from '../config/env.js';
import { CHOICE_TYPES, rangeOf } from '../validators/questionTypes.js';
import { getSettings, sendMessage } from './telegramService.js';

const TELEGRAM_MESSAGE_LIMIT = 4096;

const escapeHtml = (value) =>
  String(value).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);

const label = (localized) => localized?.en || localized?.km || '';

export function formatAnswer(question, value, lang = 'en') {
  if (value === undefined || value === null) return '';

  if (CHOICE_TYPES.includes(question.type)) {
    const ids = Array.isArray(value) ? value : [value];
    return ids
      .map((id) => {
        const option = question.options.find((o) => o.id === id);
        return option ? option.label[lang] || label(option.label) : id;
      })
      .join(', ');
  }

  if (question.type === 'rating') return `${value}/${rangeOf(question).max} ★`;
  if (question.type === 'scale') return `${value}/${rangeOf(question).max}`;
  return String(value);
}

export function formatResponseMessage(survey, response) {
  const lines = [`📝 <b>New response</b> — ${escapeHtml(label(survey.title))}`, ''];

  if (response.respondentName) {
    const email = response.respondentEmail ? ` (${escapeHtml(response.respondentEmail)})` : '';
    lines.push(`👤 ${escapeHtml(response.respondentName)}${email}`, '');
  }

  for (const question of survey.questions) {
    const answer = formatAnswer(question, response.answers[question.id]);
    if (!answer) continue;
    lines.push(`<b>${escapeHtml(label(question.text))}</b>`, `• ${escapeHtml(answer)}`, '');
  }

  const submittedAt = new Date(response.createdAt).toLocaleString('en-GB', { timeZone: env.timezone });
  lines.push(`🕒 ${submittedAt}`);

  return lines.join('\n').slice(0, TELEGRAM_MESSAGE_LIMIT);
}

// Returns true when a message was sent, false when notifications are disabled.
export async function notifyNewResponse(survey, response) {
  const settings = await getSettings();
  if (!settings.enabled || !settings.botToken || !settings.chatId) return false;

  await sendMessage({
    botToken: settings.botToken,
    chatId: settings.chatId,
    text: formatResponseMessage(survey, response),
  });
  return true;
}
