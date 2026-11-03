import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { EmptyState, ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import BarList from '../../components/dashboard/BarList.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SurveyTabs from '../../components/layout/SurveyTabs.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { formatDateTime } from '../../i18n/index.js';
import { responseApi } from '../../services/surveyService.js';

export default function Reports() {
  const { id: surveyId } = useParams();
  const { t, tl, lang } = useLanguage();
  const { data: report, loading, error, reload } = useAsync(() => responseApi.report(surveyId), [surveyId]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      await responseApi.downloadCsv(surveyId, lang);
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const { survey, totalResponses, questions } = report;

  return (
    <>
      <PageHeader
        title={tl(survey.title)}
        subtitle={t('reports.total', { count: totalResponses })}
        backTo="/admin/surveys"
        backLabel={t('surveys.title')}
        actions={
          <Button variant="secondary" icon="download" loading={exporting} disabled={!totalResponses} onClick={exportCsv}>
            {t('responses.export')}
          </Button>
        }
      />
      <SurveyTabs surveyId={surveyId} />

      {exportError && <ErrorMessage error={exportError} />}

      {!totalResponses ? (
        <EmptyState message={t('reports.noData')} />
      ) : (
        <div className="stack">
          {questions.map((question, index) => (
            <section key={question.id} className="card">
              <div className="report__head">
                <h2 className="card__title">
                  {index + 1}. {tl(question.text)}
                </h2>
                <span className="small muted">
                  {t(`questions.typeShort.${question.type}`)} · {t('reports.answered', { count: question.answeredCount })}
                </span>
              </div>

              {question.type === 'text' ? (
                question.textAnswers.length ? (
                  <ul className="list">
                    {question.textAnswers.map((answer, i) => (
                      <li key={i} className="list__item">
                        <span>{answer.value}</span>
                        <span className="small muted nowrap">{formatDateTime(answer.createdAt, lang)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t('reports.noData')}</p>
                )
              ) : (
                <BarList
                  total={totalResponses}
                  items={question.options.map((option) => ({
                    key: option.id,
                    label: tl(option.label),
                    value: option.count,
                  }))}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
