import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import BarList from '../../components/dashboard/BarList.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { formatDateTime } from '../../i18n/index.js';
import { surveyApi } from '../../services/surveyService.js';

export default function Dashboard() {
  const { t, tl, lang } = useLanguage();
  const { user } = useAuth();
  const { data: stats, loading, error, reload } = useAsync(() => surveyApi.stats(), []);

  return (
    <>
      <PageHeader
        title={t('dashboard.welcome', { name: user.username })}
        subtitle={t('dashboard.subtitle')}
        actions={
          <Button to="/admin/surveys/new" icon="plus">
            {t('surveys.new')}
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid--stats">
            <StatCard icon="clipboard" tone="teal" label={t('dashboard.totalSurveys')} value={stats.totalSurveys} />
            <StatCard icon="power" tone="blue" label={t('dashboard.activeSurveys')} value={stats.activeSurveys} />
            <StatCard icon="inbox" tone="violet" label={t('dashboard.totalResponses')} value={stats.totalResponses} />
            <StatCard icon="trend" tone="amber" label={t('dashboard.last7Days')} value={stats.responsesLast7Days} />
          </div>

          <div className="grid grid--2">
            <section className="card">
              <h2 className="card__title">{t('dashboard.topSurveys')}</h2>
              {stats.topSurveys.length ? (
                <BarList
                  items={stats.topSurveys.map((survey) => ({
                    key: survey.id,
                    label: <Link to={`/admin/surveys/${survey.id}/reports`}>{tl(survey.title)}</Link>,
                    value: survey.responseCount,
                  }))}
                />
              ) : (
                <p className="muted">{t('dashboard.noResponses')}</p>
              )}
            </section>

            <section className="card">
              <h2 className="card__title">{t('dashboard.recent')}</h2>
              {stats.recentResponses.length ? (
                <ul className="list">
                  {stats.recentResponses.map((response) => (
                    <li key={response.id} className="list__item">
                      <span className="avatar avatar--soft" aria-hidden="true">
                        {(response.respondentName || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <div className="list__main">
                        <div>{response.respondentName || t('dashboard.anonymous')}</div>
                        <Link to={`/admin/surveys/${response.surveyId}/responses`} className="small muted">
                          {tl(response.surveyTitle)}
                        </Link>
                      </div>
                      <span className="small muted">{formatDateTime(response.createdAt, lang)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t('dashboard.noResponses')}</p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
