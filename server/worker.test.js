import { describe, expect, it } from 'vitest';
import { createWorker } from './worker.js';

describe('Cloudflare Worker entry point', () => {
  it('exports a Worker factory', async () => {
    let workerModule = null;

    try {
      workerModule = await import('./worker.js');
    } catch {
      // The assertion below describes the missing deployment entry point.
    }

    expect(workerModule?.createWorker).toBeTypeOf('function');
  });

  it('sends chat messages through OpenAI with the Worker secret', async () => {
    const calls = [];
    const worker = createWorker({
      createChatCompletionImpl: async (message, options) => {
        calls.push({ message, options });
        return 'Worker reply';
      },
    });
    const request = new Request('https://nvvai.site/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });

    const response = await worker.fetch(request, {
      OPENAI_API_KEY: 'test-key',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      reply: 'Worker reply',
    });
    expect(calls).toEqual([
      {
        message: 'Hello',
        options: { apiKey: 'test-key' },
      },
    ]);
  });

  it('forwards recorded audio to the transcription API', async () => {
    const calls = [];
    const worker = createWorker({
      transcribeAudioImpl: async (audio, options) => {
        calls.push({ audio, options });
        return 'Привет, NVVAI';
      },
    });
    const request = new Request('https://nvvai.site/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'audio/webm' },
      body: new Uint8Array([1, 2, 3]),
    });

    const response = await worker.fetch(request, {
      OPENAI_API_KEY: 'test-key',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      text: 'Привет, NVVAI',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].audio).toBeInstanceOf(Blob);
    expect(calls[0].audio.type).toBe('audio/webm');
    expect(calls[0].options).toEqual({ apiKey: 'test-key' });
  });

  it('rejects audio larger than the configured limit', async () => {
    const worker = createWorker({ maxAudioSize: 2 });
    const request = new Request('https://nvvai.site/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Length': '3',
      },
      body: new Uint8Array([1, 2, 3]),
    });

    const response = await worker.fetch(request, {
      OPENAI_API_KEY: 'test-key',
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: 'Audio file is too large',
    });
  });

  it('answers API preflight requests without a response body', async () => {
    const worker = createWorker();
    const request = new Request('https://nvvai.site/api/chat', {
      method: 'OPTIONS',
    });

    const response = await worker.fetch(request, {});

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(
      response.headers.get('Access-Control-Allow-Methods')
    ).toBe('POST, OPTIONS');
  });

  it('serves non-API requests from the static asset binding', async () => {
    const worker = createWorker();
    const request = new Request('https://nvvai.site/about');
    const assetResponse = new Response('<html>NVVAI</html>');
    const env = {
      ASSETS: {
        fetch: async () => assetResponse,
      },
    };

    const response = await worker.fetch(request, env);

    expect(response).toBe(assetResponse);
  });
});
