import { useEffect, useRef, useState } from 'react';

const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstile() {
  if (window.turnstile?.render) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src^="${SCRIPT_URL}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }

    const onLoad = () => window.turnstile?.render
      ? resolve(window.turnstile)
      : reject(new Error('Turnstile did not initialize'));
    const onError = () => reject(new Error('Turnstile script failed to load'));
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
  });
}

export default function TurnstileWidget({
  siteKey,
  resetSignal,
  onToken,
  onError,
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    loadTurnstile()
      .then((turnstile) => {
        if (!active || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: 'public_lead',
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => {
            onToken('');
            onError?.();
          },
          'timeout-callback': () => onToken(''),
          theme: 'light',
        });
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        onError?.();
      });

    return () => {
      active = false;
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove?.(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onToken]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current !== null) {
      window.turnstile?.reset?.(widgetIdRef.current);
    }
  }, [resetSignal]);

  return (
    <div className="demo-turnstile">
      <div ref={containerRef} aria-label="Проверка безопасности" />
      {loadError && (
        <p role="alert">Не удалось загрузить проверку. Обнови страницу.</p>
      )}
    </div>
  );
}
