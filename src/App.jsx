import { useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ChatInput from './components/ChatInput';
import ChatModeSelector from './components/ChatModeSelector';
import { sendChatMessage } from './api/chat';
import { transcribeRecording } from './api/transcription';
import ChatMessages from './components/ChatMessages';
import AuthScreen from './components/AuthScreen';
import LeadsPage from './components/LeadsPage';
import OrbitLogo from './components/OrbitLogo';

const suggestions = [
  { label: 'Объясни сложную тему', prompt: 'Объясни сложную тему простыми словами', icon: '✦' },
  { label: 'Помоги с текстом', prompt: 'Помоги мне написать и улучшить текст', icon: 'Aa' },
  { label: 'Придумай идеи', prompt: 'Предложи несколько свежих идей для моего проекта', icon: '◎' },
];

function ProtectedApp({ onAudioReady }) {
  const { user, logout, logoutErrorMessage } = useAuth();
  const [view, setView] = useState(() =>
    window.location.hash === '#leads' ? 'leads' : 'chat'
  );
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('chat');
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    function syncView() {
      setView(window.location.hash === '#leads' ? 'leads' : 'chat');
    }

    window.addEventListener('hashchange', syncView);
    return () => window.removeEventListener('hashchange', syncView);
  }, []);

  function navigate(nextView) {
    const nextHash = nextView === 'leads' ? '#leads' : '#chat';
    if (window.location.hash !== nextHash) {
      window.history.pushState({}, '', nextHash);
    }
    setView(nextView);
  }

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
    <div className="App app-shell">
      <header className="app-nav">
        <button
          aria-label="Открыть главную NVVAI"
          className="app-brand"
          onClick={() => navigate('chat')}
          type="button"
        >
          <OrbitLogo />
          <span className="app-brand__name">NVVAI</span>
        </button>
        <nav aria-label="Основная навигация" className="app-nav__links">
          <button
            className={view === 'chat' ? 'is-active' : ''}
            onClick={() => navigate('chat')}
            type="button"
          >
            <span className="nav-link__indicator" />
            Ассистент
          </button>
          <button
            className={view === 'leads' ? 'is-active' : ''}
            onClick={() => navigate('leads')}
            type="button"
          >
            <span className="nav-link__indicator" />
            Лиды
          </button>
        </nav>
        <div className="app-nav__meta">
          <span className="workspace-chip">
            <span className="workspace-chip__dot" />
            Рабочее пространство
          </span>
          <div className="account-menu">
            <span className="account-name" title={user?.email}>
              {user?.displayName || user?.email || 'Участник'}
            </span>
            <span className="user-avatar">
              {(user?.displayName || user?.email || 'U')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </span>
            <button
              className="logout-button"
              onClick={() => logout()}
              type="button"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {view === 'leads' ? (
        <LeadsPage onSessionExpired={logout} />
      ) : (
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
              <div className="chat-mode-toolbar">
                <ChatModeSelector mode={mode} setMode={setMode} />
                <span>Mode: <strong>{mode === 'chat' ? 'Chat' : 'Agent'}</strong></span>
              </div>
              <ChatMessages messages={messages} loading={loading} />
              <div className="chat-composer">{composer}</div>
            </section>
          )}
        </main>
      )}
      {error && <p className="error-message" role="alert">{error}</p>}
      {logoutErrorMessage && (
        <p className="error-message" role="alert">{logoutErrorMessage}</p>
      )}
      {view === 'chat' && !hasConversation && (
        <footer className="site-footer">
          NVVAI может ошибаться. Проверяй важную информацию.
        </footer>
      )}
    </div>
  );
}

function AppGate({ onAudioReady }) {
  const {
    status,
    authErrorMessage,
    isSubmitting,
    login,
    refreshSession,
  } = useAuth();

  if (status !== 'authenticated') {
    return (
      <AuthScreen
        errorMessage={authErrorMessage}
        isSubmitting={isSubmitting}
        onLogin={login}
        onRetry={() => refreshSession()}
        status={status}
      />
    );
  }

  return <ProtectedApp onAudioReady={onAudioReady} />;
}

function App({ onAudioReady }) {
  return (
    <AuthProvider>
      <AppGate onAudioReady={onAudioReady} />
    </AuthProvider>
  );
}

export default App;
