export async function handleTranscriptionRequest(
  audio,
  transcribeAudio
) {
  const text = await transcribeAudio(audio);

  return {
    statusCode: 200,
    body: {
      text,
    },
  };
}
