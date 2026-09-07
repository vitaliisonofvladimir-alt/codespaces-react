const OPENAI_TRANSCRIPTIONS_URL =
  'https://api.openai.com/v1/audio/transcriptions';

const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';

export async function transcribeAudio(
  audio,
  { apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch } = {}
) {
  if (!audio || audio.size === 0) {
    throw new Error('Audio is required');
  }

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const formData = new FormData();

  formData.append(
    'file',
    audio,
    'recording.webm'
  );

  formData.append(
    'model',
    DEFAULT_TRANSCRIPTION_MODEL
  );

  const response = await fetchImpl(
    OPENAI_TRANSCRIPTIONS_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const detail =
      data?.error?.message ||
      'OpenAI transcription request failed';

    throw new Error(detail);
  }

  if (!data?.text) {
    throw new Error('OpenAI returned no transcription text');
  }

  return data.text;
}

export { DEFAULT_TRANSCRIPTION_MODEL };
