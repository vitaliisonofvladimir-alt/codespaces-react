export async function sendChatMessage(mode, message) {
  const endpoint = mode === 'agent'
    ? '/api/agent'
    : '/api/chat';

  const response = await fetch(endpoint, {
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

  return data.reply;
}
