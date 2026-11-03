import { useLocation } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import { useLanguage } from '../hooks/useLanguage.js';

export default function SuccessPage() {
  const { t, tl } = useLanguage();
  const { state } = useLocation();

  return (
    <div className="container">
      <div className="card result">
        <div className="result__icon result__icon--success" aria-hidden="true">
          <Icon name="check" size={36} strokeWidth={2.6} />
        </div>
        <h1>{t('success.title')}</h1>
        <p className="muted">{t('success.message')}</p>
        {state?.score && (
          <div className="score-card">
            <span className="score-card__label">{t('success.yourScore')}</span>
            <span className="score-card__value">
              {state.score.score}
              <span className="score-card__max"> / {state.score.maxScore}</span>
            </span>
            <span className="score-card__percent">
              {Math.round((state.score.score / state.score.maxScore) * 100)}%
            </span>
          </div>
        )}
        {state?.title && <p className="result__survey">{t('success.surveyLabel', { title: tl(state.title) })}</p>}
        <Button to="/" icon="home">
          {t('success.another')}
        </Button>
      </div>
    </div>
  );
}
