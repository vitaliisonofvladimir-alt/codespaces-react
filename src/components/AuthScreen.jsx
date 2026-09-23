import { useState } from 'react';
import OrbitLogo from './OrbitLogo';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validateEmail(email) {
  const normalizedEmail = email.trim();
  return normalizedEmail && EMAIL_PATTERN.test(normalizedEmail)
    ? ''
    : 'Введи корректный email.';
}

function LoadingMark() {
  return <span aria-hidden="true" className="auth-loading-mark" />;
}

export default function AuthScreen({
  status,
  errorMessage,
  actionErrorMessage = '',
  isSubmitting,
  magicLinkSent = false,
  onRequestMagicLink,
  onRetry,
}) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const nextError = validateEmail(email);
    setEmailError(nextError);
    if (nextError) return;

    try {
      await onRequestMagicLink(email.trim());
    } catch {
      // The provider exposes a safe message. The form stays available for a
      // retry, without storing credentials beyond this component.
    }
  }

  function changeEmail(event) {
    setEmail(event.target.value);
    setEmailError('');
  }

  if (status === 'loading') {
    return (
      <main className="auth-screen auth-screen--loading" aria-busy="true">
        <div className="auth-loading-card">
          <OrbitLogo className="auth-logo" />
          <LoadingMark />
          <p>Проверяем защищённую сессию…</p>
        </div>
      </main>
    );
  }

  if (status === 'unavailable') {
    return (
      <main className="auth-screen" aria-labelledby="auth-unavailable-title">
        <div className="auth-frame auth-frame--compact">
          <div className="auth-brand">
            <OrbitLogo className="auth-logo" />
            <span>NVVAI</span>
          </div>
          <section className="auth-card auth-card--status">
            <span className="auth-status-icon" aria-hidden="true">!</span>
            <span className="eyebrow">Вход временно недоступен</span>
            <h1 id="auth-unavailable-title">Не удалось открыть рабочее пространство</h1>
            <p>
              {errorMessage ||
                'Сервис авторизации пока не отвечает. Проверь подключение и повтори попытку.'}
            </p>
            <button
              className="button button--primary auth-submit"
              onClick={onRetry}
              type="button"
            >
              Повторить проверку
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-screen" aria-labelledby="auth-title">
      <div className="auth-frame">
        <section className="auth-intro">
          <div className="auth-brand">
            <OrbitLogo className="auth-logo" />
            <span>NVVAI</span>
          </div>
          <div className="auth-intro__copy">
            <span className="eyebrow">Защищённое рабочее пространство</span>
            <h1>Вход начинается с правильного контекста.</h1>
            <p>
              Управляй услугами, знаниями и лидами компании из одного
              tenant-aware пространства.
            </p>
          </div>
          <div className="auth-note">
            <span className="auth-note__dot" />
            Данные доступны только участникам этой компании
          </div>
        </section>

        <section className="auth-card" aria-describedby="auth-help">
          <div className="auth-card__heading">
            <span className="eyebrow">Добро пожаловать</span>
            <h2 id="auth-title">Войти по ссылке</h2>
            <p id="auth-help">Укажи рабочий email. Отправим одноразовую ссылку для входа, если адрес подключён к компании.</p>
          </div>

          {actionErrorMessage && (
            <div className="auth-alert" role="alert">
              {actionErrorMessage}
            </div>
          )}

          {magicLinkSent && (
            <div className="auth-success" role="status" aria-live="polite">
              Если этот адрес подключён к компании, письмо со ссылкой уже отправлено. Проверь входящие и папку «Спам».
            </div>
          )}

          <form className="auth-form" onSubmit={submit} noValidate>
            <label className="auth-field">
              <span>Email</span>
              <input
                aria-describedby={emailError ? 'auth-email-error' : undefined}
                aria-invalid={Boolean(emailError)}
                autoComplete="email"
                autoFocus
                inputMode="email"
                onChange={changeEmail}
                placeholder="you@company.com"
                type="email"
                value={email}
              />
              {emailError && (
                <small id="auth-email-error">{emailError}</small>
              )}
            </label>

            <button
              className="button button--primary auth-submit"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Отправляем…
                </>
              ) : (
                magicLinkSent ? 'Отправить ещё раз' : 'Отправить ссылку'
              )}
            </button>
          </form>

          <p className="auth-security-note">
            Ссылка одноразовая и действует 15 минут. После входа сессия хранится в защищённой cookie.
          </p>
        </section>
      </div>
    </main>
  );
}
