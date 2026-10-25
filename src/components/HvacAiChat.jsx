import { useState } from 'react';

const INITIAL = [{
  role: 'assistant',
  content: 'Hello! I am the NVVAI demo assistant. Is this about heating, cooling, repairs, or another home service? I can help clarify your request before you use the form below.',
}];

export default function HvacAiChat() {
  const [messages, setMessages] = useState(INITIAL);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending || text.length > 600) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setError('');
    setPending(true);
    try {
      const history = next.slice(1, -1).slice(-6).map(({ role, content }) => ({ role, content }));
      const response = await fetch('/api/hvac-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ message: text, history }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.reply !== 'string') {
        throw new Error(response.status === 503
          ? 'The AI assistant is temporarily unavailable. Please use the sample form below.'
          : response.status === 429
            ? 'Request limit reached. Try again later.'
            : 'The AI assistant is temporarily unavailable.');
      }
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply.slice(0, 1600) }]);
    } catch (err) {
      setError(err.message || 'Could not connect to the AI assistant.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="hvac-ai-section" aria-labelledby="hvac-ai-title">
      <div className="hvac-ai-intro">
        <span className="demo-eyebrow">AI ASSISTANT · MICROSOFT AZURE</span>
        <h2 id="hvac-ai-title">Tell us what needs attention</h2>
        <p>Describe the problem. The AI can ask a clarifying question; submitting a sample request is a separate step below.</p>
      </div>
      <div className="hvac-ai-card">
        <div className="hvac-ai-feed" role="log" aria-live="polite" aria-label="Conversation with AI">
          {messages.map((item, index) => (
            <div key={index} className={`hvac-ai-message hvac-ai-message--${item.role}`}>
              <strong>{item.role === 'user' ? 'You' : 'NVVAI AI'}</strong>
              <p>{item.content}</p>
            </div>
          ))}
          {pending && <p className="hvac-ai-pending" role="status">Thinking…</p>}
        </div>
        {error && <p className="hvac-ai-error" role="alert">{error}</p>}
        <form className="hvac-ai-form" onSubmit={send}>
          <label htmlFor="hvac-ai-message">What service do you need?</label>
          <div className="hvac-ai-input-row">
            <input id="hvac-ai-message" value={draft} maxLength={600} onChange={e => setDraft(e.target.value)} placeholder="For example, my AC is not cooling…" />
            <button type="submit" disabled={pending || !draft.trim()}>Send</button>
          </div>
        </form>
        <a className="hvac-ai-request-link" href="#request">Submit sample request →</a>
        <small className="hvac-ai-note">AI can make mistakes. This chat does not create a request automatically; please use the separate form.</small>
      </div>
    </section>
  );
}
