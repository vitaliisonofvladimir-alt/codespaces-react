export default function ChatInput({
  message,
  setMessage,
  onSubmit,
  loading,
}) {
  return (
    <form onSubmit={onSubmit}>
      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Введите сообщение"
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить'}
      </button>
    </form>
  );
}
