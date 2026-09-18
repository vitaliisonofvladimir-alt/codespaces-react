export default function ChatInput({
  message,
  setMessage,
  onSubmit,
  loading,
  onStartRecording,
  recording = false,
}) {
  return (
    <form className="prompt-form" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="nvvai-prompt">Сообщение для NVVAI</label>
      <textarea
        id="nvvai-prompt"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Спроси NVVAI о чём угодно…"
        rows="1"
      />

      <button
        type="button"
        className={`icon-button microphone-button ${recording ? 'is-recording' : ''}`}
        aria-label={recording ? 'Остановить запись' : 'Микрофон'}
        onClick={onStartRecording}
        disabled={loading}
      >
        {recording ? (
          <span className="stop-icon" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z" />
            <path d="M5.8 11.5v.5a6.2 6.2 0 0 0 12.4 0v-.5M12 18.2V22M9 22h6" />
          </svg>
        )}
      </button>

      <button
        className="send-button"
        type="submit"
        aria-label={loading ? 'Отправка...' : 'Отправить'}
        disabled={loading || !message.trim()}
      >
        {loading ? (
          <span className="spinner" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 12 14-7-4.8 14-2.8-5.4L5 12Z" />
          </svg>
        )}
      </button>
    </form>
  );
}
