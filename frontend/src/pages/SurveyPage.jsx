import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/common/Feedback.jsx';
import Input from '../components/common/Input.jsx';
import SurveyHeader from '../components/survey/SurveyHeader.jsx';
import SurveyQuestion from '../components/survey/SurveyQuestion.jsx';
import SurveySubmit from '../components/survey/SurveySubmit.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useLanguage } from '../hooks/useLanguage.js';
import { responseApi, surveyApi } from '../services/surveyService.js';

const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim()));

export default function SurveyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, tl } = useLanguage();
  const { data: survey, loading, error, reload } = useAsync(() => surveyApi.getPublic(id), [id]);

  const [answers, setAnswers] = useState({});
  const [respondentName, setRespondentName] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loading />;
  if (error?.status === 404) {
    return (
      <div className="container">
        <EmptyState
          icon="clipboard"
          title={t('survey.notFound')}
          action={
            <Button to="/" variant="secondary" icon="home">
              {t('common.backHome')}
            </Button>
          }
        />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container">
        <ErrorMessage error={error} onRetry={reload} />
      </div>
    );
  }

  const { questions } = survey;
  const answeredCount = questions.filter((q) => hasValue(answers[q.id])).length;

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors(({ [questionId]: _removed, ...rest }) => rest);
    }
  };

  async function handleSubmit(event) {
    event.preventDefault();

    const missing = {};
    for (const question of questions) {
      if (question.isRequired && !hasValue(answers[question.id])) {
        missing[question.id] = t('survey.errors.required');
      }
    }

    if (Object.keys(missing).length) {
      setErrors(missing);
      setSubmitError(t('survey.errors.summary'));
      const first = questions.find((q) => missing[q.id]);
      document.getElementById(`q-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = Object.fromEntries(Object.entries(answers).filter(([, value]) => hasValue(value)));
      await responseApi.submit({
        surveyId: survey.id,
        answers: payload,
        respondentName: respondentName.trim() || undefined,
      });
      navigate('/success', { replace: true, state: { title: survey.title } });
    } catch (err) {
      if (err.details && typeof err.details === 'object') {
        setErrors(Object.fromEntries(Object.keys(err.details).map((qid) => [qid, t('survey.errors.required')])));
      }
      setSubmitError(err.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="container survey" onSubmit={handleSubmit} noValidate>
      <SurveyHeader
        title={tl(survey.title)}
        description={tl(survey.description)}
        answered={answeredCount}
        total={questions.length}
      />

      {!questions.length ? (
        <EmptyState message={t('survey.noQuestions')} />
      ) : (
        <>
          {questions.map((question, index) => (
            <SurveyQuestion
              key={question.id}
              question={question}
              index={index}
              value={answers[question.id]}
              answered={hasValue(answers[question.id])}
              error={errors[question.id]}
              onChange={(value) => setAnswer(question.id, value)}
            />
          ))}

          <div className="card question">
            <Input
              label={`${t('survey.nameLabel')} (${t('common.optional')})`}
              placeholder={t('survey.namePlaceholder')}
              value={respondentName}
              maxLength={120}
              autoComplete="name"
              onChange={(event) => setRespondentName(event.target.value)}
            />
          </div>

          <SurveySubmit submitting={submitting} error={submitError} />
        </>
      )}
    </form>
  );
}
