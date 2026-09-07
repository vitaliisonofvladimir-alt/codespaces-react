import { describe, expect, test, vi } from 'vitest';
import { handleTranscriptionRequest } from './transcription-route.js';

describe('POST /api/transcribe', () => {
  test('accepts audio/webm and returns transcription text', async () => {
    const audio = new Blob(['fake audio'], {
      type: 'audio/webm',
    });

    const transcribeAudioMock = vi.fn().mockResolvedValue(
      'Привет, это тест.'
    );

    const result = await handleTranscriptionRequest(
      audio,
      transcribeAudioMock
    );

    expect(transcribeAudioMock).toHaveBeenCalledWith(audio);

    expect(result).toEqual({
      statusCode: 200,
      body: {
        text: 'Привет, это тест.',
      },
    });
  });
});
