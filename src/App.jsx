import { useRef, useState } from 'react';
import ChatInput from './components/ChatInput';
import { sendChatMessage } from './api/chat';
import { transcribeRecording } from './api/transcription';
import ChatMessages from './components/ChatMessages';

const suggestions = [
  { label: 'Объясни сложную тему', prompt: 'Объясни сложную тему простыми словами', icon: '✦' },
  { label: 'Помоги с текстом', prompt: 'Помоги мне написать и улучшить текст', icon: 'Aa' },
  { label: 'Придумай идеи', prompt: 'Предложи несколько свежих идей для моего проекта', icon: '◎' },
];

function OrbitLogo() {
  return (
    <svg className="brand-mark" viewBox="0 0 44 40" aria-hidden="true">
      <defs>
        <linearGradient id="orbit-gradient" x1="4" y1="34" x2="40" y2="6">
          <stop stopColor="#0b57d0" />
          <stop offset="1" stopColor="#8ab4f8" />
        </linearGradient>
      </defs>
      <ellipse cx="22" cy="20" rx="17" ry="8.5" fill="none" stroke="url(#orbit-gradient)" strokeWidth="2.4" transform="rotate(-24 22 20)" />
      <ellipse cx="22" cy="20" rx="17" ry="8.5" fill="none" stroke="#b6d2fb" strokeWidth="2.4" transform="rotate(35 22 20)" />
      <circle cx="22" cy="20" r="5.2" fill="#0b57d0" />
      <circle cx="36.5" cy="11.5" r="2.8" fill="#75a7f5" />
    </svg>
  );
}

function App({ onAudioReady }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Браузер не поддерживает доступ к микрофону.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        if (audioBlob.size > 0) {
          if (onAudioReady) {
            onAudioReady(audioBlob);
          } else {
            try {
              const transcript = await transcribeRecording(audioBlob);
              setMessage(transcript);
              setError('');
            } catch (err) {
              setError(err.message);
            }
          }
        }

        audioChunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaStreamRef.current = stream;

      mediaRecorder.start();
      setRecording(true);
      setError('');
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Доступ к микрофону запрещён.'
          : err.message
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();

    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    setRecording(false);
  }

  function toggleRecording() {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

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
      const response = await sendChatMessage('chat', text);

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

  const hasConversation = messages.length > 0;

  const composer = (
    <ChatInput
      message={message}
      setMessage={setMessage}
      onSubmit={sendMessage}
      loading={loading}
      onStartRecording={toggleRecording}
      recording={recording}
    />
  );

  return (
    <div className={`app-shell ${hasConversation ? 'is-chatting' : 'is-welcome'}`}>
      <header className="site-header">
        <a className="brand" href="/" aria-label="NVVAI — на главную">
          <OrbitLogo />
          <span>NVVAI</span>
        </a>
        <div className="header-meta">
          <span className="status-dot" />
          Работает на OpenAI
        </div>
      </header>

      <main className="main-content">
        {!hasConversation ? (
          <section className="welcome" aria-labelledby="welcome-title">
            <div className="ambient-glow" />
            <div className="welcome-copy">
              <span className="eyebrow">Твой AI-помощник</span>
              <h1 id="welcome-title">Чем я могу помочь?</h1>
              <p>Задай вопрос голосом или текстом — отвечу ясно и по существу.</p>
            </div>

            <div className="welcome-composer">{composer}</div>

            <div className="suggestions" aria-label="Примеры запросов">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  className="suggestion-card"
                  onClick={() => setMessage(suggestion.prompt)}
                >
                  <span className="suggestion-icon" aria-hidden="true">{suggestion.icon}</span>
                  <span>{suggestion.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="conversation" aria-label="Диалог с NVVAI">
            <ChatMessages messages={messages} loading={loading} />
            <div className="chat-composer">{composer}</div>
          </section>
        )}

        {error && <p className="error-message" role="alert">{error}</p>}
      </main>

      <footer className="site-footer">
        NVVAI может ошибаться. Проверяй важную информацию.
      </footer>
    </div>
  );
}

export default App;
