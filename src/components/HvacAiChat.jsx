import { useState } from 'react';

const INITIAL = [{
  role: 'assistant',
  content: 'Привет! Я тестовый AI-консультант NVVAI по кондиционерам и климатическим системам. Что тебя интересует: ремонт, установка или обслуживание?',
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
          ? 'AI-консультант ещё не подключён к Azure. Заявку можно отправить через форму ниже.'
          : response.status === 429
            ? 'Достигнут лимит запросов AI. Попробуй позже.'
            : 'AI-консультант временно недоступен. Попробуй позже.');
      }
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply.slice(0, 1600) }]);
    } catch (err) {
      setError(err.message || 'Не удалось связаться с AI-консультантом.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="hvac-ai-section" aria-labelledby="hvac-ai-title">
      <div className="hvac-ai-intro">
        <span className="demo-eyebrow">AI-ПОМОЩНИК · MICROSOFT AZURE</span>
        <h2 id="hvac-ai-title">Сначала обсудим задачу</h2>
        <p>Расскажи о климатической системе — помощник задаст уточняющие вопросы. Для заявки используй отдельную форму ниже.</p>
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
          <label htmlFor="hvac-ai-message">Вопрос о кондиционере или отоплении</label>
          <div className="hvac-ai-input-row">
            <input id="hvac-ai-message" value={draft} maxLength={600} onChange={e => setDraft(e.target.value)} placeholder="Например, кондиционер плохо охлаждает…" />
            <button type="submit" disabled={pending || !draft.trim()}>Отправить</button>
          </div>
        </form>
        <small className="hvac-ai-note">AI может ошибаться. Не передавай пароли, платёжные данные или личные документы. Этот чат не создаёт заявку автоматически.</small>
      </div>
    </section>
  );
}
