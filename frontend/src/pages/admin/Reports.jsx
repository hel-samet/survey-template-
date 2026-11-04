import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { EmptyState, ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import Icon from '../../components/common/Icon.jsx';
import BarList from '../../components/dashboard/BarList.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import SurveyTabs from '../../components/layout/SurveyTabs.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { formatDateTime } from '../../i18n/index.js';
import { CHOICE_TYPES, RANGE_TYPES, rangeOf } from '../../questionTypes.js';
import { responseApi } from '../../services/surveyService.js';

export default function Reports() {
  const { id: surveyId } = useParams();
  const { t, tl, lang } = useLanguage();
  const { data: report, loading, error, reload } = useAsync(() => responseApi.report(surveyId), [surveyId]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  async function exportFile(format) {
    setExporting(format);
    setExportError(null);
    try {
      await responseApi.download(surveyId, lang, format);
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const { survey, totalResponses, questions, scoring } = report;

  return (
    <>
      <PageHeader
        title={tl(survey.title)}
        subtitle={t('reports.total', { count: totalResponses })}
        backTo="/admin/surveys"
        backLabel={t('surveys.title')}
        actions={
          <>
            <Button
              variant="secondary"
              icon="download"
              loading={exporting === 'xlsx'}
              disabled={!totalResponses || Boolean(exporting)}
              onClick={() => exportFile('xlsx')}
            >
              {t('responses.exportExcel')}
            </Button>
            <Button
              variant="ghost"
              loading={exporting === 'csv'}
              disabled={!totalResponses || Boolean(exporting)}
              onClick={() => exportFile('csv')}
            >
              {t('responses.exportCsv')}
            </Button>
          </>
        }
      />
      <SurveyTabs surveyId={surveyId} />

      {exportError && <ErrorMessage error={exportError} />}

      {!totalResponses ? (
        <EmptyState message={t('reports.noData')} />
      ) : (
        <div className="stack">
          {scoring && scoring.average !== null && (
            <section className="card">
              <h2 className="card__title">
                <Icon name="award" size={18} /> {t('reports.scoreSummary')}
              </h2>
              <div className="report__stats report__stats--flush">
                {['average', 'highest', 'lowest'].map((key) => (
                  <div key={key} className="report__stat">
                    <span className="report__stat-value">
                      {scoring[key]}
                      <span className="muted"> / {scoring.maxScore}</span>
                    </span>
                    <span className="report__stat-label">{t(`reports.score.${key}`)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {questions.map((question, index) => (
            <section key={question.id} className="card">
              <div className="report__head">
                <h2 className="card__title">
                  {index + 1}. {tl(question.text)}
                </h2>
                <span className="small muted">
                  {t(`questions.types.${question.type}`)} · {t('reports.answered', { count: question.answeredCount })}
                </span>
              </div>

              <ReportBody question={question} totalResponses={totalResponses} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function ReportBody({ question, totalResponses }) {
  const { t, tl, lang } = useLanguage();

  if (CHOICE_TYPES.includes(question.type)) {
    const correct = new Set(question.settings?.correct ?? []);
    const graded = question.correctCount !== undefined;
    return (
      <>
        {graded && (
          <div className="report__stats">
            <div className="report__stat report__stat--good">
              <span className="report__stat-value">
                {question.answeredCount ? Math.round((question.correctCount / question.answeredCount) * 100) : 0}%
              </span>
              <span className="report__stat-label">
                {t('reports.correctRate', { count: question.correctCount, total: question.answeredCount })}
              </span>
            </div>
          </div>
        )}
        <BarList
          total={totalResponses}
          items={question.options.map((option) => ({
            key: option.id,
            highlight: correct.has(option.id),
            label: correct.has(option.id) ? (
              <span className="correct-label">
                {tl(option.label)}
                <span className="correct-tag">
                  <Icon name="check" size={12} strokeWidth={3} />
                  {t('questions.correct')}
                </span>
              </span>
            ) : (
              tl(option.label)
            ),
            value: option.count,
          }))}
        />
        {question.otherAnswers && (
          <>
            <h4 className="report__subtitle">{t('reports.otherAnswers')}</h4>
            <ul className="list">
              {question.otherAnswers.map((answer, i) => (
                <li key={i} className="list__item">
                  <span>{answer.value}</span>
                  <span className="small muted nowrap">{formatDateTime(answer.createdAt, lang)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  }

  if (RANGE_TYPES.includes(question.type)) {
    const { max } = rangeOf(question);
    return (
      <>
        {question.average !== null && (
          <div className="report__stats">
            <div className="report__stat">
              <span className="report__stat-value">
                {question.average}
                <span className="muted"> / {max}</span>
              </span>
              <span className="report__stat-label">{t('reports.average')}</span>
            </div>
          </div>
        )}
        <BarList
          total={question.answeredCount}
          items={question.distribution.map(({ value, count }) => ({
            key: value,
            label: question.type === 'rating' ? `${'★'.repeat(value)}` : String(value),
            value: count,
          }))}
        />
      </>
    );
  }

  return (
    <>
      {question.stats && (
        <div className="report__stats">
          {['average', 'min', 'max'].map((key) => (
            <div key={key} className="report__stat">
              <span className="report__stat-value">{question.stats[key]}</span>
              <span className="report__stat-label">{t(`reports.${key}`)}</span>
            </div>
          ))}
        </div>
      )}
      {question.textAnswers.length ? (
        <ul className="list">
          {question.textAnswers.map((answer, i) => (
            <li key={i} className="list__item">
              <span>{String(answer.value)}</span>
              <span className="small muted nowrap">{formatDateTime(answer.createdAt, lang)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('reports.noData')}</p>
      )}
    </>
  );
}
