import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();
    if (!text) return;

    setMessage('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setReply(data.reply);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <h1>codespaces-react + OpenAI</h1>

      <form onSubmit={sendMessage}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Введите сообщение"
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить'}
        </button>
      </form>

      {reply && <p>{reply}</p>}
      {error && <p>{error}</p>}
    </div>
  );
}

export default App;
