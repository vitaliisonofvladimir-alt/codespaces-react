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
      setError('Please provide a phone number or email address.');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the security check.');
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
      setError('Secure submission is unavailable in this browser.');
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
        <span className="demo-label"><span /> DEMO COMPANY</span>
      </header>

      <section className="demo-hero" aria-labelledby="demo-title">
        <div className="demo-hero__copy">
          <span className="demo-eyebrow">AI Intake Demo for HVAC & Home Services</span>
          <h1 id="demo-title">Make service requests easier to handle.</h1>
          <p>
            From HVAC repair to other home services, describe the issue, ask the AI assistant a question, and submit a sample service request.
          </p>
          <a className="demo-cta" href="#request">Submit a request <span aria-hidden="true">↓</span></a>
          <p className="demo-disclaimer">Product demo only. No real service appointment will be booked.</p>
        </div>
        <div className="demo-visual" aria-hidden="true">
          <div className="demo-visual__sun" />
          <div className="demo-visual__unit demo-visual__unit--services">
            <span className="demo-visual__service-mark" aria-hidden="true">✦</span>
            <strong>Need service?</strong>
            <span>Tell us what you need</span>
          </div>
          <div className="demo-visual__caption">HOME · HVAC · SERVICE</div>
        </div>
      </section>

      <section className="demo-services" aria-label="Common service requests">
        <div>
          <span className="demo-service-icon" aria-hidden="true">↗</span>
          <h2>Heating and cooling</h2>
          <p>AC problems, heating repairs, and seasonal maintenance.</p>
        </div>
        <div>
          <span className="demo-service-icon" aria-hidden="true">＋</span>
          <h2>Installation and repair</h2>
          <p>System replacement, installation quotes, and related repairs.</p>
        </div>
        <div>
          <span className="demo-service-icon" aria-hidden="true">◷</span>
          <h2>Other home services</h2>
          <p>Plumbing, electrical, appliance repair, and more.</p>
        </div>
      </section>

      <HvacAiChat />

      <section className="demo-form-section" id="request" aria-labelledby="request-title">
        <div className="demo-form-intro">
          <span className="demo-eyebrow">About one minute</span>
          <h2 id="request-title">Tell us about your request</h2>
          <p>Share your contact information and a short description. You may suggest a preferred time for a follow-up.</p>
        </div>
        <form className="demo-form" onSubmit={submit}>
          <label>
            <span>Your name</span>
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
              <span>Phone</span>
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
            <span>Describe your service request</span>
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
            <span>Preferred contact time <em>optional</em></span>
            <input
              name="preferredAt"
              onChange={(event) => update('preferredAt', event.target.value)}
              type="datetime-local"
              value={form.preferredAt}
            />
          </label>

          {!siteKey || !intakeConfigured ? (
            <p className="demo-config-note" role="status">
              This form is unavailable until security verification and the demo API are configured.
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
              Security verification is unavailable. Please try again later.
            </p>
          )}
          {sent && (
            <p className="demo-form-success" role="status">
              Sample request received. This is a demo, not a confirmed appointment.
            </p>
          )}
          <button
            className="demo-submit"
            disabled={!siteKey || !intakeConfigured || turnstileUnavailable || submitting}
            type="submit"
          >
            {submitting ? 'Submitting…' : 'Submit sample request'}
          </button>
          <small className="demo-privacy-note">
            Do not enter payment details or passwords. This demo collects only the contact details required for follow-up.
          </small>
        </form>
      </section>

      <footer className="demo-footer">
        <span className="demo-brand"><OrbitLogo /><span>NVVAI</span></span>
        <span>Demonstration only · No real booking</span>
      </footer>
    </main>
  );
}

export default PublicHvacDemo;
