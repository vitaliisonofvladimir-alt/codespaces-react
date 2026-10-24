import { useState } from 'react';

const INITIAL = [{
  role: 'assistant',
  content: 'Здравствуйте! Я демонстрационный AI-администратор NVVAI. Какой мастер нужен: сантехник, электрик, ремонт техники, отопление или другая услуга? Помогу описать запрос и перейти к форме заявки.',
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
          ? 'AI-администратор ещё не подключён к Azure. Заявку можно отправить через форму ниже.'
          : response.status === 429
            ? 'Достигнут лимит запросов AI. Попробуй позже.'
            : 'AI-администратор временно недоступен. Попробуй позже.');
      }
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply.slice(0, 1600) }]);
    } catch (err) {
      setError(err.message || 'Не удалось связаться с AI-администратором.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="hvac-ai-section" aria-labelledby="hvac-ai-title">
      <div className="hvac-ai-intro">
        <span className="demo-eyebrow">AI-ПОМОЩНИК · MICROSOFT AZURE</span>
        <h2 id="hvac-ai-title">Сначала обсудим задачу</h2>
        <p>Опиши, какой мастер или услуга нужны. AI поможет уточнить задачу, а заявку можно оставить через форму ниже.</p>
      </div>
      <div className="hvac-ai-card">
        <div className="hvac-ai-feed" role="log" aria-live="polite" aria-label="Диалог с AI">
          {messages.map((item, index) => (
            <div key={index} className={`hvac-ai-message hvac-ai-message--${item.role}`}>
              <strong>{item.role === 'user' ? 'Ты' : 'NVVAI AI'}</strong>
              <p>{item.content}</p>
            </div>
          ))}
          {pending && <p className="hvac-ai-pending" role="status">Формирую ответ…</p>}
        </div>
        {error && <p className="hvac-ai-error" role="alert">{error}</p>}
        <form className="hvac-ai-form" onSubmit={send}>
          <label htmlFor="hvac-ai-message">Какой мастер или услуга нужны?</label>
          <div className="hvac-ai-input-row">
            <input id="hvac-ai-message" value={draft} maxLength={600} onChange={e => setDraft(e.target.value)} placeholder="Например, протекает кран, нужен электрик…" />
            <button type="submit" disabled={pending || !draft.trim()}>Отправить</button>
          </div>
        </form>
        <a className="hvac-ai-request-link" href="#request">Оставить заявку →</a>
        <small className="hvac-ai-note">AI может ошибаться. Не передавай пароли, платёжные данные или личные документы. Этот чат не создаёт заявку автоматически.</small>
      </div>
    </section>
  );
}
