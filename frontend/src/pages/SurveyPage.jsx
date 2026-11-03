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
import { formatError } from '../questionTypes.js';
import { responseApi, surveyApi } from '../services/surveyService.js';

// Key for the respondent-name field in `errors`; matches the API's error detail key.
const NAME_KEY = 'respondentName';

const hasValue =(value) => (Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim()));

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

    const problems = {};
    if (!respondentName.trim()) problems[NAME_KEY] = t('survey.errors.nameRequired');
    for (const question of questions) {
      const value = answers[question.id];
      if (question.isRequired && !hasValue(value)) {
        problems[question.id] = t('survey.errors.required');
      } else {
        const formatKey = formatError(question, value);
        if (formatKey) problems[question.id] = t(formatKey);
      }
    }

    if (Object.keys(problems).length) {
      setErrors(problems);
      setSubmitError(t('survey.errors.summary'));
      const first = problems[NAME_KEY] ? NAME_KEY : `q-${questions.find((q) => problems[q.id]).id}`;
      document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = Object.fromEntries(Object.entries(answers).filter(([, value]) => hasValue(value)));
      await responseApi.submit({
        surveyId: survey.id,
        answers: payload,
        respondentName: respondentName.trim(),
      });
      navigate('/success', { replace: true, state: { title: survey.title } });
    } catch (err) {
      if (err.details && typeof err.details === 'object') {
        setErrors(
          Object.fromEntries(
            Object.entries(err.details).map(([key, message]) => {
              if (key === NAME_KEY) return [key, t('survey.errors.nameRequired')];
              return [
                key,
                message === 'This question is required' ? t('survey.errors.required') : t('survey.errors.invalid'),
              ];
            }),
          ),
        );
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
          <div id={NAME_KEY} className={`card question ${errors[NAME_KEY] ? 'question--error' : ''}`}>
            <Input
              label={
                <>
                  {t('survey.nameLabel')}
                  <span className="required" title={t('common.required')}>
                    {' '}
                    *
                  </span>
                </>
              }
              placeholder={t('survey.namePlaceholder')}
              value={respondentName}
              maxLength={120}
              autoComplete="name"
              required
              error={errors[NAME_KEY]}
              onChange={(event) => {
                setRespondentName(event.target.value);
                if (errors[NAME_KEY]) setErrors(({ [NAME_KEY]: _removed, ...rest }) => rest);
              }}
            />
          </div>

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

          <SurveySubmit submitting={submitting} error={submitError} />
        </>
      )}
    </form>
  );
}
