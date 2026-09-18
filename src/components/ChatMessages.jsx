export default function ChatMessages({ messages, loading = false }) {
  return (
    <div className="message-list" role="log" aria-live="polite">
      {messages.map((message, index) => (
        <article className={`message-row ${message.role === 'user' ? 'is-user' : 'is-assistant'}`} key={`${message.role}-${index}`}>
          {message.role === 'assistant' && <span className="assistant-avatar" aria-hidden="true">N</span>}
          <div className="message-bubble">
            <span className="message-author">{message.role === 'user' ? 'Ты' : 'NVVAI'}</span>
            <p>{message.content}</p>
          </div>
        </article>
      ))}
      {loading && (
        <article className="message-row is-assistant">
          <span className="assistant-avatar" aria-hidden="true">N</span>
          <div className="message-bubble typing-indicator" aria-label="NVVAI отвечает"><span /><span /><span /></div>
        </article>
      )}
    </div>
  );
}
