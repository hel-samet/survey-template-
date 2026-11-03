import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Cloudflare Turnstile CAPTCHA. Renders nothing when VITE_TURNSTILE_SITE_KEY is not set,
// so local development works without a Cloudflare account.
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
export const isCaptchaEnabled = Boolean(TURNSTILE_SITE_KEY);

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise;

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error('Could not load CAPTCHA'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// onToken(token) is called with a fresh token, or '' when it expires or fails.
// The parent can call ref.current.reset() after a failed submit, since tokens are single-use.
const Turnstile = forwardRef(function Turnstile({ onToken, action }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current?.('');
      if (widgetIdRef.current !== null) window.turnstile?.reset(widgetIdRef.current);
    },
  }));

  useEffect(() => {
    if (!isCaptchaEnabled) return undefined;
    let cancelled = false;

    loadScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: 'auto',
          callback: (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(''),
          'error-callback': () => onTokenRef.current?.(''),
        });
      })
      .catch(() => onTokenRef.current?.(''));

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action]);

  if (!isCaptchaEnabled) return null;
  return <div ref={containerRef} className="captcha" />;
});

export default Turnstile;
