import { useState } from 'react';
import OrbitLogo from './OrbitLogo';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

function validateCredentials(email, password) {
  const errors = {};
  const normalizedEmail = email.trim();

  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = 'Введи корректный email.';
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    errors.password = `Пароль должен содержать от ${PASSWORD_MIN_LENGTH} до ${PASSWORD_MAX_LENGTH} символов.`;
  }

  return errors;
}

function LoadingMark() {
  return <span aria-hidden="true" className="auth-loading-mark" />;
}

export default function AuthScreen({
  status,
  errorMessage,
  isSubmitting,
  onLogin,
  onRetry,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  async function submit(event) {
    event.preventDefault();
    const nextErrors = validateCredentials(email, password);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onLogin({ email: email.trim(), password });
    } catch {
      // The provider exposes a safe message; the form stays available for a
      // corrected attempt and never persists the password.
    } finally {
      setPassword('');
    }
  }

  function changeEmail(event) {
    setEmail(event.target.value);
    setFieldErrors((current) => ({ ...current, email: undefined }));
  }

  function changePassword(event) {
    setPassword(event.target.value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
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
            <h2 id="auth-title">Войти в NVVAI</h2>
            <p id="auth-help">Используй рабочий email и пароль владельца или участника.</p>
          </div>

          {errorMessage && (
            <div className="auth-alert" role="alert">
              {errorMessage}
            </div>
          )}

          <form className="auth-form" onSubmit={submit} noValidate>
            <label className="auth-field">
              <span>Email</span>
              <input
                aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="username"
                autoFocus
                inputMode="email"
                onChange={changeEmail}
                placeholder="you@company.com"
                type="email"
                value={email}
              />
              {fieldErrors.email && (
                <small id="auth-email-error">{fieldErrors.email}</small>
              )}
            </label>

            <label className="auth-field">
              <span>Пароль</span>
              <input
                aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
                aria-invalid={Boolean(fieldErrors.password)}
                autoComplete="current-password"
                maxLength={PASSWORD_MAX_LENGTH}
                onChange={changePassword}
                placeholder="Не меньше 12 символов"
                type="password"
                value={password}
              />
              {fieldErrors.password && (
                <small id="auth-password-error">{fieldErrors.password}</small>
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
                  Проверяем…
                </>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          <p className="auth-security-note">
            Сессия защищена cookie, а пароль не сохраняется в браузере.
          </p>
        </section>
      </div>
    </main>
  );
}
