import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendMessage() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
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

      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Введите сообщение"
      />

      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить'}
      </button>

      {reply && <p>{reply}</p>}
      {error && <p>{error}</p>}
    </div>
  );
}

export default App;
