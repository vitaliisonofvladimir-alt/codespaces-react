import { useRef, useState } from 'react';
import ChatInput from './components/ChatInput';
import ChatModeSelector from './components/ChatModeSelector';
import { sendChatMessage } from './api/chat';
import { transcribeRecording } from './api/transcription';
import ChatMessages from './components/ChatMessages';

function App({ onAudioReady }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('chat');
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
        onStartRecording={toggleRecording}
        recording={recording}
      />

      <ChatMessages messages={messages} />

      {error && <p>{error}</p>}
    </div>
  );
}

export default App;
