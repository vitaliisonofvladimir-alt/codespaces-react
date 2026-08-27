import { useState } from 'react';
import ChatInput from './components/ChatInput';
import ChatModeSelector from './components/ChatModeSelector';
import ChatReply from './components/ChatReply';
import { sendChatMessage } from './api/chat';

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
      const response = await sendChatMessage(mode, text);
      setReply(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <h1>codespaces-react + OpenAI</h1>

      <ChatModeSelector
        mode={mode}
        setMode={setMode}
      />

      <p>Режим: {mode}</p>

      <ChatInput
        message={message}
        setMessage={setMessage}
        onSubmit={sendMessage}
        loading={loading}
      />

      <ChatReply
        reply={reply}
        error={error}
      />
    </div>
  );
}

export default App;
