import { describe, expect, test, vi } from 'vitest';
import { transcribeAudio } from './transcription.js';

describe('audio transcription', () => {
  test('sends audio to OpenAI transcription API and returns text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: 'Привет, это тест.',
      }),
    });

    const audio = new Blob(['fake audio'], {
      type: 'audio/webm',
    });

    const text = await transcribeAudio(audio, {
      apiKey: 'test-key',
      fetchImpl: fetchMock,
    });

    expect(text).toBe('Привет, это тест.');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe(
      'https://api.openai.com/v1/audio/transcriptions'
    );

    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer test-key');
    expect(options.body).toBeInstanceOf(FormData);

    expect(options.body.get('model')).toBe('gpt-4o-mini-transcribe');
  });
});
