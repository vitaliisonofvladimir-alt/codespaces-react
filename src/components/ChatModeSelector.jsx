export default function ChatModeSelector({ mode, setMode }) {
  return (
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
  );
}
