import { afterEach, describe, expect, test, vi } from 'vitest';
import { createHttpServer } from './http.js';

describe('HTTP API', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
  });

  async function startServer(options = {}) {
    server = createHttpServer(options);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();

    return `http://127.0.0.1:${address.port}`;
  }

  test('POST /api/transcribe accepts audio/webm and returns text', async () => {
    const transcribeAudio = vi.fn().mockResolvedValue(
      'Привет, это тест.'
    );

    const baseUrl = await startServer({
      transcribeAudio,
    });

    const response = await fetch(`${baseUrl}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/webm',
      },
      body: new Uint8Array([1, 2, 3]),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      text: 'Привет, это тест.',
    });

    expect(transcribeAudio).toHaveBeenCalledTimes(1);
  });

  test('keeps POST /api/chat working', async () => {
    const createChatCompletion = vi.fn().mockResolvedValue(
      'Ответ чата.'
    );

    const baseUrl = await startServer({
      createChatCompletion,
    });

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Привет!',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reply: 'Ответ чата.',
    });

    expect(createChatCompletion).toHaveBeenCalledWith('Привет!');
  });

  test('sets CORS headers for preflight and API responses', async () => {
    const createChatCompletion = vi.fn().mockResolvedValue(
      'Ответ чата.'
    );

    const baseUrl = await startServer({
      createChatCompletion,
      allowedOrigin: 'https://nvvai.site',
    });

    const preflight = await fetch(`${baseUrl}/api/chat`, {
      method: 'OPTIONS',
    });

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin'))
      .toBe('https://nvvai.site');
    expect(preflight.headers.get('Access-Control-Allow-Headers'))
      .toBe('Content-Type');
    expect(preflight.headers.get('Access-Control-Allow-Methods'))
      .toBe('POST, OPTIONS');

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Привет!',
      }),
    });

    expect(response.headers.get('Access-Control-Allow-Origin'))
      .toBe('https://nvvai.site');
  });

  test('rejects audio larger than 10 MB', async () => {
    const transcribeAudio = vi.fn().mockResolvedValue(
      'Этого ответа быть не должно.'
    );

    const baseUrl = await startServer({
      transcribeAudio,
    });

    const largeAudio = new Uint8Array(
      10 * 1024 * 1024 + 1
    );

    const response = await fetch(`${baseUrl}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/webm',
      },
      body: largeAudio,
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: 'Audio file is too large',
    });

    expect(transcribeAudio).not.toHaveBeenCalled();
  });
});
