import { env } from '../config/env.js';
import { CHOICE_TYPES, OTHER_ID, otherKey, rangeOf } from '../validators/questionTypes.js';
import { getSettings, sendMessage } from './telegramService.js';

const TELEGRAM_MESSAGE_LIMIT = 4096;

const escapeHtml = (value) =>
  String(value).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);

const label = (localized) => localized?.en || localized?.km || '';

// `answers` is the whole response's answers object; it holds the "Other" text next to the choice.
export function formatAnswer(question, answers, lang = 'en') {
  const value = answers?.[question.id];
  if (value === undefined || value === null) return '';

  if (CHOICE_TYPES.includes(question.type)) {
    const ids = Array.isArray(value) ? value : [value];
    return ids
      .map((id) => {
        const option = question.options.find((o) => o.id === id);
        const text = option ? option.label[lang] || label(option.label) : id;
        const other = id === OTHER_ID && answers[otherKey(question.id)];
        return other ? `${text}: ${other}` : text;
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

  if (response.scoring) {
    lines.push(`🏆 Score: <b>${response.scoring.score}/${response.scoring.maxScore}</b>`, '');
  }

  for (const question of survey.questions) {
    const answer = formatAnswer(question, response.answers);
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
