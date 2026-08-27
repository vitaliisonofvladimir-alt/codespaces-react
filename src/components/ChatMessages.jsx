export default function ChatMessages({ messages }) {
  return (
    <div>
      {messages.map((message, index) => (
        <p key={index}>
          <strong>
            {message.role === 'user' ? 'Вы:' : 'AI:'}
          </strong>{' '}
          {message.content}
        </p>
      ))}
    </div>
  );
}
