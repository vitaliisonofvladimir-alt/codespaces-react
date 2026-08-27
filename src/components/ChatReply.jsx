export default function ChatReply({ reply, error }) {
  return (
    <>
      {reply && <p>{reply}</p>}
      {error && <p>{error}</p>}
    </>
  );
}
