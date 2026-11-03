import { getSettings, maskToken, saveSettings, sendMessage } from '../services/telegramService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// The raw bot token is never sent back to the browser.
const toPublic = (settings) => ({
  hasToken: Boolean(settings.botToken),
  botTokenMasked: maskToken(settings.botToken),
  chatId: settings.chatId || '',
  enabled: settings.enabled,
});

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

export const getTelegramSettings = asyncHandler(async (req, res) => {
  res.json({ data: toPublic(await getSettings()) });
});

export const updateTelegramSettings = asyncHandler(async (req, res) => {
  const current = await getSettings();
  const body = req.body || {};

  const settings = await saveSettings({
    // An empty token field means "keep the saved token".
    botToken: clean(body.botToken) || current.botToken,
    chatId: body.chatId !== undefined ? clean(body.chatId) : current.chatId,
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : current.enabled,
  });
  res.json({ data: toPublic(settings) });
});

export const sendTestMessage = asyncHandler(async (req, res) => {
  const current = await getSettings();
  const body = req.body || {};

  await sendMessage({
    botToken: clean(body.botToken) || current.botToken,
    chatId: clean(body.chatId) || current.chatId,
    text: '✅ <b>Test message</b>\nTelegram notifications for your survey system are working.',
  });
  res.json({ data: { sent: true } });
});
