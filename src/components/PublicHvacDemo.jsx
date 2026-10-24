import { useRef, useState } from 'react';
import {
  resolvePublicLeadsUrl,
  submitPublicLead,
} from '../api/publicLeads';
import OrbitLogo from './OrbitLogo';
import HvacAiChat from './HvacAiChat';
import TurnstileWidget from './TurnstileWidget';

function newIdempotencyKey() {
  if (typeof crypto?.randomUUID !== 'function') {
    throw new Error('Secure random IDs are unavailable');
  }
  return crypto.randomUUID();
}

function PublicHvacDemo() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    description: '',
    preferredAt: '',
  });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const keyForPayload = useRef(null);
  const siteKey = import.meta.env?.VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY ?? '';
  const apiOrigin = import.meta.env?.VITE_PUBLIC_LEADS_API_BASE_URL ?? '';
  const intakeConfigured = (() => {
    try {
      resolvePublicLeadsUrl({ configuredOrigin: apiOrigin });
      return true;
    } catch {
      return false;
    }
  })();

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError('');
    setSent(false);
  }

  async function submit(event) {
    event.preventDefault();
    const normalized = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      description: form.description.trim(),
      preferredAt: form.preferredAt
        ? new Date(form.preferredAt).toISOString()
        : undefined,
      turnstileToken,
    };
    if (!normalized.phone && !normalized.email) {
      setError('Оставь телефон или email — как тебе удобнее.');
      return;
    }
    if (!turnstileToken) {
      setError('Сначала пройди проверку безопасности.');
      return;
    }

    const fingerprint = JSON.stringify({ ...normalized, turnstileToken: undefined });
    try {
      if (keyForPayload.current?.fingerprint !== fingerprint) {
        keyForPayload.current = {
          fingerprint,
          key: newIdempotencyKey(),
        };
      }
    } catch {
      setError('Безопасная отправка недоступна в этом браузере.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await submitPublicLead(
        normalized,
        keyForPayload.current.key
      );
      setSent(true);
      setForm({
        name: '',
        phone: '',
        email: '',
        description: '',
        preferredAt: '',
      });
      setTurnstileToken('');
      setTurnstileReset((value) => value + 1);
      keyForPayload.current = null;
    } catch (submitError) {
      setError(submitError.message);
      if (submitError.code === 'invalid_human_verification') {
        setTurnstileToken('');
        setTurnstileReset((value) => value + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="public-demo">
      <header className="demo-nav">
        <a className="demo-brand" href="/" aria-label="NVVAI">
          <OrbitLogo />
          <span>NVVAI</span>
        </a>
        <span className="demo-label"><span /> ДЕМО-КОМПАНИЯ</span>
      </header>

      <section className="demo-hero" aria-labelledby="demo-title">
        <div className="demo-hero__copy">
          <span className="demo-eyebrow">Демонстрация сервиса для мастеров</span>
          <h1 id="demo-title">Нужен мастер? Начни с простого разговора.</h1>
          <p>
            Сантехника, электрика, ремонт техники, монтаж и другие задачи.
            Опиши, что случилось, и попробуй оформление тестовой заявки с AI.
          </p>
          <a className="demo-cta" href="#request">Оставить заявку <span aria-hidden="true">↓</span></a>
          <p className="demo-disclaimer">Это демонстрация продукта, не реальная служба обслуживания.</p>
        </div>
        <div className="demo-visual" aria-hidden="true">
          <div className="demo-visual__sun" />
          <div className="demo-visual__unit demo-visual__unit--services">
            <span className="demo-visual__service-mark" aria-hidden="true">✦</span>
            <strong>Нужен мастер?</strong>
            <span>Опиши задачу — начни с заявки</span>
          </div>
          <div className="demo-visual__caption">ДОМ · РЕМОНТ · СЕРВИС</div>
        </div>
      </section>

      <section className="demo-services" aria-label="Типовые запросы">
        <div>
          <span className="demo-service-icon" aria-hidden="true">↗</span>
          <h2>Сантехника и электрика</h2>
          <p>Протечка, розетки, освещение и другие задачи дома.</p>
        </div>
        <div>
          <span className="demo-service-icon" aria-hidden="true">＋</span>
          <h2>Монтаж и ремонт</h2>
          <p>Бытовая техника, мебель, отделка и климатическое оборудование.</p>
        </div>
        <div>
          <span className="demo-service-icon" aria-hidden="true">◷</span>
          <h2>Другие специалисты</h2>
          <p>Не нашёл свою услугу? Опиши запрос в заявке.</p>
        </div>
      </section>

      <HvacAiChat />

      <section className="demo-form-section" id="request" aria-labelledby="request-title">
        <div className="demo-form-intro">
          <span className="demo-eyebrow">Заявка занимает около минуты</span>
          <h2 id="request-title">Расскажи, чем помочь</h2>
          <p>Оставь контакт и краткое описание. Можно указать удобное время для связи.</p>
        </div>
        <form className="demo-form" onSubmit={submit}>
          <label>
            <span>Как к тебе обращаться</span>
            <input
              autoComplete="name"
              maxLength={200}
              name="name"
              onChange={(event) => update('name', event.target.value)}
              required
              value={form.name}
            />
          </label>
          <div className="demo-form__row">
            <label>
              <span>Телефон</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                maxLength={50}
                name="phone"
                onChange={(event) => update('phone', event.target.value)}
                placeholder="+1 555 0100"
                type="tel"
                value={form.phone}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                autoComplete="email"
                maxLength={320}
                name="email"
                onChange={(event) => update('email', event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={form.email}
              />
            </label>
          </div>
          <label>
            <span>Что случилось или какая услуга нужна?</span>
            <textarea
              maxLength={4000}
              name="description"
              onChange={(event) => update('description', event.target.value)}
              required
              rows={4}
              value={form.description}
            />
          </label>
          <label>
            <span>Удобное время для связи <em>необязательно</em></span>
            <input
              name="preferredAt"
              onChange={(event) => update('preferredAt', event.target.value)}
              type="datetime-local"
              value={form.preferredAt}
            />
          </label>

          {!siteKey || !intakeConfigured ? (
            <p className="demo-config-note" role="status">
              Форма включится после настройки проверки безопасности и API для этой среды.
            </p>
          ) : (
            <TurnstileWidget
              siteKey={siteKey}
              resetSignal={turnstileReset}
              onToken={setTurnstileToken}
              onError={() => setTurnstileUnavailable(true)}
            />
          )}

          {error && <p className="demo-form-error" role="alert">{error}</p>}
          {turnstileUnavailable && (
            <p className="demo-form-error" role="alert">
              Проверка безопасности пока недоступна. Обнови страницу позже.
            </p>
          )}
          {sent && (
            <p className="demo-form-success" role="status">
              Заявка принята. Спасибо — это демонстрационный сценарий.
            </p>
          )}
          <button
            className="demo-submit"
            disabled={!siteKey || !intakeConfigured || turnstileUnavailable || submitting}
            type="submit"
          >
            {submitting ? 'Отправляем…' : 'Отправить заявку'}
          </button>
          <small className="demo-privacy-note">
            Не указывай платёжные данные или пароли. Эта демо-форма собирает только
            сведения, нужные для обратной связи.
          </small>
        </form>
      </section>

      <footer className="demo-footer">
        <span className="demo-brand"><OrbitLogo /><span>NVVAI</span></span>
        <span>Явно обозначенная демонстрация · Без реального заказа</span>
      </footer>
    </main>
  );
}

export default PublicHvacDemo;
