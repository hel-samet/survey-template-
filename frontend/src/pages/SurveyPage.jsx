import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/common/Feedback.jsx';
import Input from '../components/common/Input.jsx';
import { AccountBar, AlreadySubmitted, SignInCard } from '../components/survey/GoogleSignIn.jsx';
import SurveyHeader from '../components/survey/SurveyHeader.jsx';
import SurveyQuestion from '../components/survey/SurveyQuestion.jsx';
import SurveySubmit from '../components/survey/SurveySubmit.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useLanguage } from '../hooks/useLanguage.js';
import { usePresence } from '../hooks/usePresence.js';
import { formatError, OTHER_ID, otherKey } from '../questionTypes.js';
import { googleAuth, isGoogleSignInConfigured } from '../services/googleAuth.js';
import { coverUrl, responseApi, surveyApi } from '../services/surveyService.js';

// Key for the respondent-name field in `errors`; matches the API's error detail key.
const NAME_KEY = 'respondentName';

// Firebase popup errors that just mean the respondent closed the window.
const DISMISSED_POPUP = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim()));

// Signed-in Google user for sign-in surveys: undefined while checking, null when signed out.
function useRespondent(enabled) {
  const [user, setUser] = useState(undefined);
  useEffect(() => (enabled ? googleAuth.onChange(setUser) : undefined), [enabled]);
  return user;
}

export default function SurveyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, tl } = useLanguage();
  const { data: survey, loading, error, reload } = useAsync(() => surveyApi.getPublic(id), [id]);

  const needsLogin = Boolean(survey?.requireLogin);
  const user = useRespondent(needsLogin && isGoogleSignInConfigured);
  const [status, setStatus] = useState({ loading: false, submitted: false });
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');

  const [answers, setAnswers] = useState({});
  const [respondentName, setRespondentName] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live status for the admin: only while the answer form itself is on screen.
  const formVisible =
    Boolean(survey) &&
    (!needsLogin || (isGoogleSignInConfigured && Boolean(user) && !status.loading && !status.submitted));
  const presence = usePresence(survey?.id, {
    enabled: formVisible,
    name: respondentName,
    answered: survey ? survey.questions.filter((q) => hasValue(answers[q.id])).length : 0,
    total: survey?.questions.length ?? 0,
  });

  // Once signed in, ask the server whether this Google account has already answered.
  useEffect(() => {
    if (!needsLogin || !user) return undefined;
    let cancelled = false;
    setStatus({ loading: true, submitted: false });
    googleAuth
      .getIdToken()
      .then((token) => responseApi.status(survey.id, token))
      .then(
        (result) => !cancelled && setStatus({ loading: false, submitted: result.submitted }),
        () => !cancelled && setStatus({ loading: false, submitted: false }),
      );
    if (user.name) setRespondentName((current) => current || user.name);
    return () => {
      cancelled = true;
    };
  }, [needsLogin, user, survey?.id]);

  async function signIn({ switchAccount = false } = {}) {
    setSigningIn(true);
    setSignInError('');
    try {
      if (switchAccount) {
        await googleAuth.signOut();
        setRespondentName('');
      }
      await googleAuth.signIn();
    } catch (err) {
      if (!DISMISSED_POPUP.includes(err.code)) setSignInError(t('signin.failed'));
    } finally {
      setSigningIn(false);
    }
  }

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

  if (needsLogin && !isGoogleSignInConfigured) {
    return (
      <div className="container">
        <EmptyState icon="lock" title={t('signin.notConfigured')} />
      </div>
    );
  }
  if (needsLogin && (user === undefined || status.loading)) return <Loading />;
  if (needsLogin && user === null) {
    return (
      <div className="container survey">
        <SurveyHeader title={tl(survey.title)} description={tl(survey.description)} cover={coverUrl(survey)} />
        <SignInCard onSignIn={() => signIn()} busy={signingIn} error={signInError} />
      </div>
    );
  }
  if (needsLogin && status.submitted) {
    return (
      <div className="container">
        <AlreadySubmitted user={user} />
      </div>
    );
  }

  const { questions } = survey;
  const answeredCount = questions.filter((q) => hasValue(answers[q.id])).length;

  // `key` is a question ID, or otherKey(questionId) for typed "Other" text; errors are keyed by question ID.
  const setAnswer = (key, value, questionId = key) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
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
      } else if ([value].flat().includes(OTHER_ID) && !answers[otherKey(question.id)]?.trim()) {
        problems[question.id] = t('survey.errors.otherRequired');
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
      const result = await responseApi.submit({
        surveyId: survey.id,
        answers: payload,
        respondentName: respondentName.trim(),
        respondentToken: needsLogin ? await googleAuth.getIdToken() : undefined,
      });
      presence.markSubmitted();
      navigate('/success', { replace: true, state: { title: survey.title, score: result.score } });
    } catch (err) {
      if (err.status === 409) {
        setStatus({ loading: false, submitted: true });
        return;
      }
      if (err.details?.auth) {
        setSubmitError(t('signin.expired'));
        return;
      }
      if (err.details && typeof err.details === 'object') {
        setErrors(
          Object.fromEntries(
            Object.entries(err.details).map(([key, message]) => {
              if (key === NAME_KEY) return [key, t('survey.errors.nameRequired')];
              if (message === 'This question is required') return [key, t('survey.errors.required')];
              if (message.includes('"Other"')) return [key, t('survey.errors.otherRequired')];
              return [key, t('survey.errors.invalid')];
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
        cover={coverUrl(survey)}
        answered={answeredCount}
        total={questions.length}
      />

      {needsLogin && <AccountBar user={user} onSwitch={() => signIn({ switchAccount: true })} />}

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
              otherText={answers[otherKey(question.id)]}
              onOtherChange={(text) => setAnswer(otherKey(question.id), text, question.id)}
            />
          ))}

          <SurveySubmit submitting={submitting} error={submitError} />
        </>
      )}
    </form>
  );
}
