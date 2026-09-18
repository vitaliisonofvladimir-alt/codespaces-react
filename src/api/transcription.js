export async function transcribeRecording(
  audio,
  { fetchImpl = fetch } = {}
) {
  const response = await fetchImpl('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': audio.type || 'application/octet-stream',
    },
    body: audio,
  });

  const rawBody = await response.text();

  if (!rawBody) {
    throw new Error('Transcription API returned an empty response.');
  }

  let data;

  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(
      `Transcription API returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(data.error || 'Transcription request failed');
  }

  if (!data.text) {
    throw new Error('Transcription API returned no text.');
  }

  return data.text;
}
