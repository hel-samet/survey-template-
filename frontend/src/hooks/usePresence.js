import { useCallback, useEffect, useRef, useState } from 'react';
import { BASE_URL } from '../services/api.js';

const HEARTBEAT_MS = 15_000; // keep in sync with backend/src/services/liveService.js
const PROGRESS_DEBOUNCE_MS = 1500;

const newSessionId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

// Reports this open survey page to the admin "Live" tab: who is answering and how far they got.
// Sent as text/plain so the request needs no CORS preflight, and with sendBeacon when the page closes.
// Failures are ignored: presence is best effort and must never disturb the respondent.
export function usePresence(surveyId, { enabled, name, answered, total }) {
  const [sessionId] = useState(newSessionId);
  const latest = useRef({ name, answered, total });
  latest.current = { name, answered, total };
  const submitted = useRef(false);

  const send = useCallback(
    (state, { beacon = false } = {}) => {
      if (!surveyId) return;
      const { name: currentName, answered: count, total: of } = latest.current;
      const body = JSON.stringify({ sessionId, state, name: currentName, answered: count, total: of });
      const url = `${BASE_URL}/surveys/${surveyId}/presence`;
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
        return;
      }
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {});
    },
    [surveyId, sessionId],
  );

  const currentState = () => (latest.current.answered > 0 || latest.current.name?.trim() ? 'answering' : 'viewing');

  // Announce on open, then heartbeat while the tab is visible; say goodbye when the page goes away.
  useEffect(() => {
    if (!enabled) return undefined;
    send(currentState());
    const timer = setInterval(() => {
      if (!submitted.current && document.visibilityState === 'visible') send(currentState());
    }, HEARTBEAT_MS);
    const onVisible = () => document.visibilityState === 'visible' && !submitted.current && send(currentState());
    const onHide = () => !submitted.current && send('left', { beacon: true });
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onHide);
      if (!submitted.current) send('left', { beacon: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, send]);

  // Report progress shortly after the respondent stops typing or clicking.
  useEffect(() => {
    if (!enabled || submitted.current) return undefined;
    const timer = setTimeout(() => send(currentState()), PROGRESS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, send, answered, total, name]);

  const markSubmitted = useCallback(() => {
    submitted.current = true;
    send('submitted');
  }, [send]);

  return { markSubmitted };
}
