import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import Icon from '../../components/common/Icon.jsx';
import Input from '../../components/common/Input.jsx';
import LanguageSwitcher from '../../components/common/LanguageSwitcher.jsx';
import Turnstile, { isCaptchaEnabled } from '../../components/common/Turnstile.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';

export default function Login() {
  const { t } = useLanguage();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef(null);

  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    if (isCaptchaEnabled && !captchaToken) {
      setError(t('common.captchaRequired'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await login(username, password, captchaToken || undefined);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      captchaRef.current?.reset();
      setError(err.details?.captcha ? t('common.captchaFailed') : err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <section className="login__brand" aria-hidden="true">
        <div className="brand brand--inverse">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="36" height="36" />
          <span>{t('common.appName')}</span>
        </div>
        <div className="login__pitch">
          <h2>{t('login.brandTitle')}</h2>
          <p>{t('login.brandText')}</p>
        </div>
        <div className="login__preview">
          {[72, 48, 28].map((width, i) => (
            <div key={width} className="login__preview-row">
              <span className={`choice__box choice__box--checkbox ${i < 2 ? 'is-on' : ''}`} />
              <span className="login__preview-bar" style={{ width: `${width}%` }} />
            </div>
          ))}
        </div>
      </section>

      <div className="login__panel">
        <div className="login__lang">
          <LanguageSwitcher />
        </div>
        <form className="login__card" onSubmit={handleSubmit}>
          <span className="login__lock">
            <Icon name="lock" size={22} />
          </span>
          <h1>{t('login.title')}</h1>
          <p className="muted">{t('login.subtitle')}</p>

        <Input
          label={t('login.username')}
          value={username}
          autoComplete="username"
          required
          autoFocus
          onChange={(event) => setUsername(event.target.value)}
        />
        <Input
          label={t('login.password')}
          type="password"
          value={password}
          autoComplete="current-password"
          required
          onChange={(event) => setPassword(event.target.value)}
        />

        <Turnstile ref={captchaRef} action="admin-login" onToken={setCaptchaToken} />

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}
          <Button type="submit" size="lg" loading={submitting} iconRight="arrowRight">
            {t('login.submit')}
          </Button>
          <Link to="/" className="login__back">
            <Icon name="arrowLeft" size={15} />
            {t('common.backHome')}
          </Link>
        </form>
      </div>
    </div>
  );
}
