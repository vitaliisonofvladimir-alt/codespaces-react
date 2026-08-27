const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5-mini';

function extractOutputText(data) {
  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  return (data.output || [])
    .filter((item) => item?.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((content) => content?.type === 'output_text' && typeof content.text === 'string')
    .map((content) => content.text)
    .join('');
}

export async function createChatCompletion(
  message,
  { apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch } = {}
) {
  if (!message || !message.trim()) {
    throw new Error('Message is required');
  }

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetchImpl(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: message.trim(),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data?.error?.message || 'OpenAI request failed';
    throw new Error(detail);
  }

  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new Error('OpenAI returned no output text');
  }

  return outputText;
}

export { DEFAULT_MODEL };
