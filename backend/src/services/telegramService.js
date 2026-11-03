import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const TELEGRAM_API = 'https://api.telegram.org';

// Settings saved from the admin panel take precedence over the .env defaults.
export async function getSettings() {
  const { rows } = await query(
    'SELECT bot_token AS "botToken", chat_id AS "chatId", enabled FROM telegram_settings WHERE id = 1',
  );
  const row = rows[0];
  return {
    botToken: row?.botToken || env.telegram.botToken,
    chatId: row?.chatId || env.telegram.chatId,
    enabled: row ? row.enabled : Boolean(env.telegram.botToken && env.telegram.chatId),
  };
}

export async function saveSettings({ botToken, chatId, enabled }) {
  await query(
    `INSERT INTO telegram_settings (id, bot_token, chat_id, enabled)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO UPDATE
       SET bot_token = EXCLUDED.bot_token,
           chat_id   = EXCLUDED.chat_id,
           enabled   = EXCLUDED.enabled`,
    [botToken || null, chatId || null, Boolean(enabled)],
  );
  return getSettings();
}

export function maskToken(token) {
  if (!token) return '';
  return token.length <= 10 ? '••••••' : `${token.slice(0, 4)}••••••${token.slice(-4)}`;
}

export async function sendMessage({ botToken, chatId, text }) {
  if (!botToken || !chatId) {
    throw new ApiError(400, 'Telegram bot token and chat ID are required');
  }

  let data;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    data = await res.json();
  } catch (err) {
    throw new ApiError(502, `Could not reach Telegram: ${err.message}`);
  }

  if (!data.ok) {
    throw new ApiError(502, `Telegram error: ${data.description || 'unknown error'}`);
  }
  return data.result;
}
