import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { ErrorMessage, Loading } from '../../components/common/Feedback.jsx';
import Icon from '../../components/common/Icon.jsx';
import LanguageSwitcher from '../../components/common/LanguageSwitcher.jsx';
import ScrollList from '../../components/common/ScrollList.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useLanguage } from '../../hooks/useLanguage.js';
import { surveyApi } from '../../services/surveyService.js';

// Polls the live status while this tab is visible. Keeps the last good data when a poll fails.
function useLiveStatus(surveyId) {
  const [state, setState] = useState({ data: null, error: null, failing: false });
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      let delay = 3000;
      try {
        const data = await surveyApi.live(surveyId);
        if (cancelled) return;
        delay = data.refreshMs || delay;
        setState({ data, error: null, failing: false });
      } catch (error) {
        if (cancelled) return;
        delay = 6000;
        setState((prev) => (prev.data ? { ...prev, failing: true } : { data: null, error, failing: true }));
      }
      timer = setTimeout(poll, delay);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [surveyId, visible]);

  return { ...state, paused: !visible };
}

// Short relative time measured against the server clock, so a wrong PC clock does not skew it.
function useAgo() {
  const { t } = useLanguage();
  return (iso, nowIso) => {
    const seconds = Math.max(0, Math.round((new Date(nowIso) - new Date(iso)) / 1000));
    if (seconds < 10) return t('live.ago.now');
    if (seconds < 60) return t('live.ago.seconds', { n: seconds });
    if (seconds < 3600) return t('live.ago.minutes', { n: Math.floor(seconds / 60) });
    if (seconds < 86400) return t('live.ago.hours', { n: Math.floor(seconds / 3600) });
    return t('live.ago.days', { n: Math.floor(seconds / 86400) });
  };
}

function useClock(lang) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en-GB', { timeStyle: 'medium' }).format(now);
}

function useFullscreen() {
  const [active, setActive] = useState(() => Boolean(document.fullscreenElement));
  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = () =>
    (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(
      () => {},
    );
  return { active, toggle, supported: Boolean(document.documentElement.requestFullscreen) };
}

const initial = (name) => (name?.trim() ? name.trim()[0].toUpperCase() : '?');

function VisitorRow({ visitor, now }) {
  const { t } = useLanguage();
  const ago = useAgo();
  const status = visitor.state === 'submitted' ? 'submitted' : visitor.idle ? 'idle' : visitor.state;
  const percent = visitor.total ? Math.round((visitor.answered / visitor.total) * 100) : 0;
  const known = Boolean(visitor.name);

  return (
    <li className={`visitor visitor--${status}`}>
      <span className={`avatar ${known ? '' : 'avatar--soft'}`} aria-hidden="true">
        {initial(visitor.name)}
      </span>
      <div className="visitor__main">
        <div className="visitor__top">
          <span className={`visitor__name ${known ? '' : 'muted'}`}>{visitor.name || t('live.anonymous')}</span>
          <span className={`live-badge live-badge--${status}`}>
            {status === 'answering' && <span className="live-dot" aria-hidden="true" />}
            {status === 'submitted' && <Icon name="check" size={12} strokeWidth={3} />}
            {t(`live.states.${status}`)}
          </span>
        </div>
        <div className="visitor__progress">
          <div
            className="progress__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={status === 'submitted' ? 100 : percent}
          >
            <div className="progress__bar" style={{ width: `${status === 'submitted' ? 100 : percent}%` }} />
          </div>
          <span className="visitor__count">{t('live.progress', { answered: visitor.answered, total: visitor.total })}</span>
        </div>
        <span className="visitor__meta">
          {t(`live.devices.${visitor.device}`)} ·{' '}
          {status === 'submitted'
            ? t('live.submittedAgo', { time: ago(visitor.submittedAt, now) })
            : t('live.openedAgo', { time: ago(visitor.startedAt, now) })}
          {status === 'idle' && ` · ${t('live.lastSeen', { time: ago(visitor.lastSeen, now) })}`}
        </span>
      </div>
    </li>
  );
}

const MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };
const scoreTone = (ratio) => (ratio >= 0.8 ? 'good' : ratio >= 0.5 ? 'mid' : 'low');

// Top scores, highest first, each with a bar showing the share of the maximum score.
function Leaderboard({ board, fresh }) {
  const { t } = useLanguage();
  const { maxScore, average, count, entries } = board;

  return (
    <ScrollList visible={4} count={entries.length}>
      {({ listProps, arrows }) => (
        <section className="card leaderboard">
          <div className="live-card__head">
            <h2 className="card__title leaderboard__title">
              <Icon name="award" size={18} /> {t('live.leaderboard')}
            </h2>
            {average !== null && (
              <span className="leaderboard__average">
                {t('live.averageScore')} <strong>{average}</strong> / {maxScore}
              </span>
            )}
            {arrows}
          </div>

          {entries.length ? (
            <ol {...listProps} className={`leaderboard__list ${listProps.className}`}>
              {entries.map((entry) => {
                const ratio = maxScore ? entry.score / maxScore : 0;
                const medal = MEDALS[entry.rank];
                return (
                  <li key={entry.id} className={`leaderboard__item ${fresh.has(entry.id) ? 'is-fresh' : ''}`}>
                    <span className={`leaderboard__rank ${medal ? `leaderboard__rank--${medal}` : ''}`}>
                      {medal ? <Icon name="award" size={15} /> : entry.rank}
                      <span className="sr-only">#{entry.rank}</span>
                    </span>
                    <div className="leaderboard__main">
                      <div className="leaderboard__top">
                        <span className="leaderboard__name">{entry.name || t('live.anonymous')}</span>
                        <span className={`leaderboard__score leaderboard__score--${scoreTone(ratio)}`}>
                          {entry.score} / {maxScore}
                        </span>
                      </div>
                      <div
                        className="progress__track"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={maxScore}
                        aria-valuenow={entry.score}
                      >
                        <div
                          className={`progress__bar leaderboard__bar--${scoreTone(ratio)}`}
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="muted">{t('live.noScores')}</p>
      )}
      {count > entries.length && (
        <p className="small muted live-total">{t('live.leaderboardMore', { shown: entries.length, count })}</p>
      )}
    </section>
      )}
    </ScrollList>
  );
}

// Standalone page (no admin sidebar), so it guards the login itself.
export default function Live() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return <LiveMonitor />;
}

function LiveMonitor() {
  const { id: surveyId } = useParams();
  const { t, tl, lang } = useLanguage();
  const ago = useAgo();
  const clock = useClock(lang);
  const fullscreen = useFullscreen();
  const { data, error, failing, paused } = useLiveStatus(surveyId);
  const title = data ? tl(data.survey.title) : '';
  const liveLabel = t('admin.tabs.live');

  // Browser-tab title, so the monitor tab is easy to find; restored when leaving the page.
  useEffect(() => {
    const original = document.title;
    return () => {
      document.title = original;
    };
  }, []);
  useEffect(() => {
    if (title) document.title = `● ${liveLabel} · ${title}`;
  }, [title, liveLabel]);

  // Briefly highlight submissions that arrive while the page is open.
  const seen = useRef(null);
  const [fresh, setFresh] = useState(() => new Set());
  useEffect(() => {
    if (!data) return undefined;
    const ids = data.recent.map((r) => r.id);
    if (seen.current) {
      const added = ids.filter((rid) => !seen.current.has(rid));
      if (added.length) setFresh(new Set(added));
    }
    seen.current = new Set(ids);
    const timer = setTimeout(() => setFresh(new Set()), 4000);
    return () => clearTimeout(timer);
  }, [data]);

  const header = (
    <header className="live-bar">
      <div className="live-bar__left">
        <Link to="/admin" className="brand" title={t('common.appName')}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="32" height="32" />
        </Link>
        <span className="live-pill">
          <span className="live-dot" aria-hidden="true" />
          {t('live.badge')}
        </span>
        <div className="live-bar__title">
          <h1>{title || '…'}</h1>
          <span className={`live-status ${failing ? 'is-failing' : paused ? 'is-paused' : ''}`}>
            {failing ? t('live.reconnecting') : paused ? t('live.paused') : t('live.updating')}
          </span>
        </div>
      </div>
      <div className="live-bar__right">
        <span className="live-clock" aria-label={t('live.clock')}>
          {clock}
        </span>
        <LanguageSwitcher />
        {fullscreen.supported && (
          <Button
            variant="ghost"
            size="sm"
            icon={fullscreen.active ? 'minimize' : 'maximize'}
            onClick={fullscreen.toggle}
            title={t(fullscreen.active ? 'live.exitFullscreen' : 'live.fullscreen')}
            aria-label={t(fullscreen.active ? 'live.exitFullscreen' : 'live.fullscreen')}
          />
        )}
        <Button variant="secondary" size="sm" icon="arrowLeft" to={`/admin/surveys/${surveyId}/reports`}>
          {t('live.backToAdmin')}
        </Button>
      </div>
    </header>
  );

  if (!data) {
    return (
      <div className="live-page">
        {header}
        <main className="live-page__body">{error ? <ErrorMessage error={error} /> : <Loading />}</main>
      </div>
    );
  }

  const { survey, counts, visitors, recent, leaderboard, now } = data;

  return (
    <div className="live-page">
      {header}
      <main className="live-page__body">
        {!survey.isActive && (
          <p className="alert alert--warning">
            <Icon name="lock" size={16} /> {t('live.closed')}
          </p>
        )}

        <div className="grid grid--stats">
          <StatCard icon="users" tone="teal" label={t('live.online')} value={counts.online} />
          <StatCard icon="edit" tone="blue" label={t('live.answering')} value={counts.answering} />
          <StatCard icon="send" tone="violet" label={t('live.lastHour')} value={counts.lastHour} />
          <StatCard icon="calendar" tone="amber" label={t('live.today')} value={counts.today} />
        </div>

        <div className="grid grid--sidebar">
          <ScrollList visible={6} count={visitors.length}>
            {({ listProps, arrows }) => (
              <section className="card">
                <div className="live-card__head">
                  <h2 className="card__title">{t('live.rightNow')}</h2>
                  {arrows}
                </div>
                {visitors.length ? (
                  <ul {...listProps} className={`visitor-list ${listProps.className}`}>
                    {visitors.map((visitor) => (
                      <VisitorRow key={visitor.key} visitor={visitor} now={now} />
                    ))}
                  </ul>
                ) : (
                  <div className="live-empty">
                    <Icon name="users" size={28} />
                    <p className="live-empty__title">{t('live.empty')}</p>
                    <p className="muted small">{t('live.emptyHint')}</p>
                  </div>
            )}
          </section>
            )}
          </ScrollList>

          <div className="stack live-side">
            {leaderboard && <Leaderboard board={leaderboard} fresh={fresh} />}
            <ScrollList visible={4} count={recent.length}>
              {({ listProps, arrows }) => (
                <section className="card">
                  <div className="live-card__head">
                    <h2 className="card__title">{t('live.latest')}</h2>
                    {arrows}
                  </div>
                  {recent.length ? (
                    <ul {...listProps} className={`list ${listProps.className}`}>
                      {recent.map((response) => (
                        <li key={response.id} className={`list__item live-recent ${fresh.has(response.id) ? 'is-fresh' : ''}`}>
                          <span className="avatar avatar--soft" aria-hidden="true">
                            {initial(response.respondentName)}
                          </span>
                          <div className="list__main">
                            <span className="live-recent__name">{response.respondentName || t('live.anonymous')}</span>
                            <span className="small muted">{ago(response.createdAt, now)}</span>
                          </div>
                          {response.scoring && (
                            <span className="badge badge--points">
                              {response.scoring.score}/{response.scoring.maxScore}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">{t('live.noSubmissions')}</p>
              )}
              <p className="small muted live-total">{t('live.total', { count: counts.total })}</p>
            </section>
              )}
            </ScrollList>
          </div>
        </div>
      </main>
    </div>
  );
}
