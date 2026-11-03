import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { EmptyState, ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { surveyApi } from '../../services/surveyService.js';

export default function SurveyList() {
  const { t, tl } = useLanguage();
  const { data: surveys, loading, error, reload, setData } = useAsync(() => surveyApi.listAll(), []);
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function run(surveyId, action) {
    setBusyId(surveyId);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyId(null);
    }
  }

  const toggleActive = (survey) =>
    run(survey.id, async () => {
      const updated = await surveyApi.update(survey.id, { isActive: !survey.isActive });
      setData((list) => list.map((s) => (s.id === survey.id ? updated : s)));
    });

  const remove = (survey) => {
    if (!window.confirm(t('surveys.deleteConfirm', { title: tl(survey.title) }))) return;
    run(survey.id, async () => {
      await surveyApi.remove(survey.id);
      setData((list) => list.filter((s) => s.id !== survey.id));
    });
  };

  return (
    <>
      <PageHeader
        title={t('surveys.title')}
        actions={
          <Button to="/admin/surveys/new" icon="plus">
            {t('surveys.new')}
          </Button>
        }
      />

      {actionError && <ErrorMessage error={actionError} />}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : !surveys.length ? (
        <EmptyState
          message={t('surveys.empty')}
          icon="clipboard"
          action={
            <Button to="/admin/surveys/new" icon="plus">
              {t('surveys.new')}
            </Button>
          }
        />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('surveys.colTitle')}</th>
                <th className="num">{t('surveys.colQuestions')}</th>
                <th className="num">{t('surveys.colResponses')}</th>
                <th>{t('surveys.colStatus')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => (
                <tr key={survey.id}>
                  <td>
                    <Link to={`/admin/surveys/${survey.id}/questions`} className="strong">
                      {tl(survey.title)}
                    </Link>
                  </td>
                  <td className="num">{survey.questionCount}</td>
                  <td className="num">
                    <Link to={`/admin/surveys/${survey.id}/responses`}>{survey.responseCount}</Link>
                  </td>
                  <td>
                    <span className={`badge badge--dot ${survey.isActive ? 'badge--success' : ''}`}>
                      {survey.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Button size="sm" variant="secondary" icon="chart" to={`/admin/surveys/${survey.id}/reports`}>
                        {t('admin.tabs.reports')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="power"
                        title={survey.isActive ? t('surveys.deactivate') : t('surveys.activate')}
                        aria-label={survey.isActive ? t('surveys.deactivate') : t('surveys.activate')}
                        disabled={busyId === survey.id}
                        onClick={() => toggleActive(survey)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="edit"
                        title={t('common.edit')}
                        aria-label={t('common.edit')}
                        to={`/admin/surveys/${survey.id}/edit`}
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        icon="trash"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                        disabled={busyId === survey.id}
                        onClick={() => remove(survey)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
