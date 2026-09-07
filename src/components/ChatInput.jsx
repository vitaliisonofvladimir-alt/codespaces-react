export default function ChatInput({
  message,
  setMessage,
  onSubmit,
  loading,
  onStartRecording,
}) {
  return (
    <form onSubmit={onSubmit}>
      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Введите сообщение"
      />

      <button
        type="button"
        aria-label="Микрофон"
        onClick={onStartRecording}
        disabled={loading}
      >
        🎤
      </button>

      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить'}
      </button>
    </form>
  );
}
