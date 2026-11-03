import { useLanguage } from '../../hooks/useLanguage.js';
import Button from '../common/Button.jsx';

export default function SurveySubmit({ submitting = false, error }) {
  const { t } = useLanguage();

  return (
    <div className="survey-submit">
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" loading={submitting} iconRight={submitting ? undefined : 'send'}>
        {submitting ? t('survey.submitting') : t('survey.submit')}
      </Button>
      <p className="survey-submit__note">{t('survey.privacyNote')}</p>
    </div>
  );
}
