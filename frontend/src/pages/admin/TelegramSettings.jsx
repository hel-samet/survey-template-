import { useState } from 'react';
import Button from '../../components/common/Button.jsx';
import Checkbox from '../../components/common/Checkbox.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import Input from '../../components/common/Input.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { telegramApi } from '../../services/surveyService.js';

export default function TelegramSettings() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ botToken: '', chatId: '', enabled: false });
  const [status, setStatus] = useState({ type: null, message: '' });
  const [busy, setBusy] = useState(null); // 'save' | 'test' | null

  const { data: settings, loading, error, reload, setData } = useAsync(async () => {
    const loaded = await telegramApi.getSettings();
    setForm({ botToken: '', chatId: loaded.chatId, enabled: loaded.enabled });
    return loaded;
  }, []);

  async function run(kind, action, successMessage) {
    setBusy(kind);
    setStatus({ type: null, message: '' });
    try {
      await action();
      setStatus({ type: 'success', message: successMessage });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  }

  const save = (event) => {
    event.preventDefault();
    run(
      'save',
      async () => {
        const saved = await telegramApi.saveSettings(form);
        setData(saved);
        setForm((prev) => ({ ...prev, botToken: '' }));
      },
      t('telegram.saved'),
    );
  };

  const sendTest = () =>
    run('test', () => telegramApi.sendTest({ botToken: form.botToken, chatId: form.chatId }), t('telegram.testSent'));

  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title={t('telegram.title')} subtitle={t('telegram.intro')} />

      <div className="grid grid--sidebar">
        <form className="card form" onSubmit={save}>
          <Input
            label={t('telegram.botToken')}
            type="password"
            autoComplete="off"
            placeholder={settings.hasToken ? settings.botTokenMasked : '123456789:AA…'}
            hint={
              settings.hasToken
                ? `${t('telegram.botTokenSaved', { token: settings.botTokenMasked })} ${t('telegram.botTokenHint')}`
                : null
            }
            value={form.botToken}
            onChange={(e) => setForm((prev) => ({ ...prev, botToken: e.target.value }))}
          />
          <Input
            label={t('telegram.chatId')}
            hint={t('telegram.chatIdHint')}
            value={form.chatId}
            onChange={(e) => setForm((prev) => ({ ...prev, chatId: e.target.value }))}
          />
          <Checkbox
            label={t('telegram.enabled')}
            checked={form.enabled}
            onChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
          />

          {status.message && (
            <p className={`alert alert--${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>
              {status.message}
            </p>
          )}

          <div className="form__actions">
            <Button
              variant="secondary"
              icon="send"
              loading={busy === 'test'}
              disabled={busy !== null || (!settings.hasToken && !form.botToken) || !form.chatId}
              onClick={sendTest}
            >
              {t('telegram.test')}
            </Button>
            <Button type="submit" loading={busy === 'save'} disabled={busy !== null}>
              {t('common.save')}
            </Button>
          </div>
        </form>

        <aside className="card">
          <h2 className="card__title">{t('telegram.howTo')}</h2>
          <ol className="steps">
            <li>{t('telegram.steps.one')}</li>
            <li>{t('telegram.steps.two')}</li>
            <li>{t('telegram.steps.three')}</li>
            <li>{t('telegram.steps.four')}</li>
          </ol>
        </aside>
      </div>
    </>
  );
}
