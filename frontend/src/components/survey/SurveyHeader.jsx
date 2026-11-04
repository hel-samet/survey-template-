import { useLanguage } from '../../hooks/useLanguage.js';
import Icon from '../common/Icon.jsx';

// Renders the intro card plus a progress strip that sticks below the top bar while scrolling.
// `cover` is an optional banner image URL shown across the top of the card.
export default function SurveyHeader({ title, description, cover, answered = 0, total = 0 }) {
  const { t } = useLanguage();
  const percent = total ? Math.round((answered / total) * 100) : 0;

  return (
    <>
      <header className={`card survey-header ${cover ? 'survey-header--cover' : ''}`}>
        {cover ? (
          <img className="survey-header__cover" src={cover} alt="" />
        ) : (
          <span className="survey-header__icon">
            <Icon name="clipboard" size={24} />
          </span>
        )}
        <h1 className="survey-header__title">{title}</h1>
        {description && <p className="survey-header__desc">{description}</p>}
        <p className="survey-header__note">
          <span className="required">*</span> {t('survey.requiredNote')}
        </p>
      </header>

      {total > 0 && (
        <div className="survey-progress">
          <div className="survey-progress__meta">
            <span>{t('survey.progress', { answered, total })}</span>
            <span className="survey-progress__percent">{percent}%</span>
          </div>
          <div
            className="progress__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="progress__bar" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
    </>
  );
}
