import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('chat');

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();
    if (!text) return;

    setMessage('');
    setLoading(true);
    setError('');

    try {
      const endpoint =
        mode === 'agent'
          ? '/api/agent'
          : '/api/chat';

      const response = await fetch(endpoint, {
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

      <div>
        <button
          type="button"
          onClick={() => setMode('chat')}
          disabled={mode === 'chat'}
        >
          Chat
        </button>

        <button
          type="button"
          onClick={() => setMode('agent')}
          disabled={mode === 'agent'}
        >
          Agent
        </button>
      </div>

      <p>Режим: {mode}</p>

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
