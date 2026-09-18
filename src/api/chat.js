export async function sendChatMessage(
  mode,
  message,
  { fetchImpl = fetch } = {}
) {
  const endpoint = mode === 'agent'
    ? '/api/agent'
    : '/api/chat';

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  const rawBody = await response.text();

  if (!rawBody) {
    throw new Error(
      'API server returned an empty response. Start the API server and try again.'
    );
  }

  let data;

  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(
      `API server returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data.reply;
}
