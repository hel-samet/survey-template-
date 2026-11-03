import { Link } from 'react-router-dom';
import { EmptyState, ErrorMessage, Loading } from '../components/common/Feedback.jsx';
import Icon from '../components/common/Icon.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useLanguage } from '../hooks/useLanguage.js';
import { surveyApi } from '../services/surveyService.js';

// Rough estimate shown on each card: ~20 seconds per question, at least one minute.
const estimateMinutes = (questionCount) => Math.max(1, Math.round(questionCount / 3));

export default function Home() {
  const { t, tl } = useLanguage();
  const { data: surveys, loading, error, reload } = useAsync(() => surveyApi.listActive(), []);

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <span className="hero__eyebrow">
            <Icon name="sparkle" size={15} />
            {t('home.eyebrow')}
          </span>
          <h1 className="hero__title">{t('home.title')}</h1>
          <p className="hero__subtitle">{t('home.subtitle')}</p>
        </div>
      </section>

      <div className="container container--wide home__list">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorMessage error={error} onRetry={reload} />
        ) : !surveys.length ? (
          <EmptyState icon="inbox" message={t('home.empty')} />
        ) : (
          <div className="grid grid--cards">
            {surveys.map((survey) => (
              <Link key={survey.id} to={`/survey/${survey.id}`} className="card survey-card">
                <span className="survey-card__icon">
                  <Icon name="clipboard" size={22} />
                </span>
                <h2 className="survey-card__title">{tl(survey.title)}</h2>
                {tl(survey.description) && <p className="survey-card__desc">{tl(survey.description)}</p>}
                <div className="survey-card__meta">
                  <span>
                    <Icon name="list" size={15} />
                    {t('home.questions', { count: survey.questionCount })}
                  </span>
                  <span>
                    <Icon name="clock" size={15} />
                    {t('home.minutes', { count: estimateMinutes(survey.questionCount) })}
                  </span>
                </div>
                <span className="survey-card__cta">
                  {t('home.start')}
                  <Icon name="arrowRight" size={17} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
