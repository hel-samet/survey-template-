import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { EmptyState, ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SurveyTabs from '../../components/layout/SurveyTabs.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { formatDateTime } from '../../i18n/index.js';
import { formatAnswerValue } from '../../questionTypes.js';
import { responseApi, surveyApi } from '../../services/surveyService.js';

const PAGE_SIZE = 20;

export default function Responses() {
  const { id: surveyId } = useParams();
  const { t, tl, lang } = useLanguage();
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const surveyState = useAsync(() => surveyApi.getAdmin(surveyId), [surveyId]);
  const responsesState = useAsync(() => responseApi.list(surveyId, { page, pageSize: PAGE_SIZE }), [surveyId, page]);

  const formatAnswer = (question, value) => formatAnswerValue(question, value, tl);

  async function remove(responseId) {
    if (!window.confirm(t('responses.deleteConfirm'))) return;
    setActionError(null);
    try {
      await responseApi.remove(responseId);
      responsesState.reload();
    } catch (err) {
      setActionError(err);
    }
  }

  async function allowAgain(response) {
    if (!window.confirm(t('responses.allowAgainConfirm', { email: response.respondentEmail }))) return;
    setActionError(null);
    try {
      await responseApi.allowResubmit(response.id);
      responsesState.reload();
    } catch (err) {
      setActionError(err);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setActionError(null);
    try {
      await responseApi.downloadCsv(surveyId, lang);
    } catch (err) {
      setActionError(err);
    } finally {
      setExporting(false);
    }
  }

  if (surveyState.loading) return <Loading />;
  if (surveyState.error) return <ErrorMessage error={surveyState.error} onRetry={surveyState.reload} />;

  const survey = surveyState.data;
  const meta = responsesState.data?.meta;
  const rows = responsesState.data?.data ?? [];

  return (
    <>
      <PageHeader
        title={tl(survey.title)}
        subtitle={meta ? t('responses.total', { count: meta.total }) : t('responses.title')}
        backTo="/admin/surveys"
        backLabel={t('surveys.title')}
        actions={
          <Button variant="secondary" icon="download" loading={exporting} disabled={!meta?.total} onClick={exportCsv}>
            {t('responses.export')}
          </Button>
        }
      />
      <SurveyTabs surveyId={surveyId} />

      {actionError && <ErrorMessage error={actionError} />}

      {responsesState.loading && !responsesState.data ? (
        <Loading />
      ) : responsesState.error ? (
        <ErrorMessage error={responsesState.error} onRetry={responsesState.reload} />
      ) : !rows.length ? (
        <EmptyState message={t('responses.empty')} />
      ) : (
        <>
          <div className="card table-wrap">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('responses.date')}</th>
                  <th>{t('responses.name')}</th>
                  {survey.questions.map((question) => (
                    <th key={question.id} title={tl(question.text)} className="truncate">
                      {tl(question.text)}
                    </th>
                  ))}
                  <th aria-label={t('common.actions')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((response) => (
                  <tr key={response.id}>
                    <td className="muted">{response.id}</td>
                    <td className="nowrap">{formatDateTime(response.createdAt, lang)}</td>
                    <td>
                      <div className="respondent">
                        <span>{response.respondentName || <span className="muted">{t('dashboard.anonymous')}</span>}</span>
                        {response.respondentEmail && <span className="small muted">{response.respondentEmail}</span>}
                        {response.resubmitAllowed && (
                          <span className="badge badge--success">{t('responses.canAnswerAgain')}</span>
                        )}
                      </div>
                    </td>
                    {survey.questions.map((question) => (
                      <td key={question.id}>{formatAnswer(question, response.answers[question.id])}</td>
                    ))}
                    <td>
                      <div className="row-actions nowrap">
                        {response.signedIn && !response.resubmitAllowed && (
                          <Button size="sm" variant="secondary" icon="unlock" onClick={() => allowAgain(response)}>
                            {t('responses.allowAgain')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          icon="trash"
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
                          onClick={() => remove(response.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('responses.prev')}
              </Button>
              <span className="muted small">{t('responses.page', { page, pages: meta.totalPages })}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('responses.next')}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
