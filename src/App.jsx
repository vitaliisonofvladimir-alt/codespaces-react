import { useState } from 'react';
import ChatInput from './components/ChatInput';
import ChatModeSelector from './components/ChatModeSelector';
import { sendChatMessage } from './api/chat';
import ChatMessages from './components/ChatMessages';

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('chat');

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();
    if (!text) return;

    setMessage('');

    setMessages((prev) => [
  ...prev,
  {
    role: 'user',
    content: text,
  },
]);

    setLoading(true);
    setError('');

    try {
      const response = await sendChatMessage(mode, text);
   
    setMessages((prev) => [
  ...prev,
  {
    role: 'assistant',
    content: response,
  },
]);

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

      <ChatMessages messages={messages} />

      {error && <p>{error}</p>}     
    </div>
  );
}

export default App;
