import { describe, expect, test, vi } from 'vitest';

const createHttpServer = vi.fn(() => ({
  listen: vi.fn(),
}));

const createChatCompletion = vi.fn();
const runAssistant = vi.fn();
const transcribeAudio = vi.fn();

const getAllowedOrigin = vi.fn(() => 'https://nvvai.site');

vi.mock('./http.js', () => ({
  createHttpServer,
}));

vi.mock('./openai.js', () => ({
  createChatCompletion,
}));

vi.mock('./agents/assistant.js', () => ({
  runAssistant,
}));

vi.mock('./transcription.js', () => ({
  transcribeAudio,
}));

vi.mock('./cors.js', () => ({
  getAllowedOrigin,
}));

describe('production server wiring', () => {
  test('passes real API dependencies into the HTTP server', async () => {
    vi.resetModules();

    await import('./index.js');

    expect(createHttpServer).toHaveBeenCalledTimes(1);

    expect(createHttpServer).toHaveBeenCalledWith({
      createChatCompletion,
      runAssistant,
      transcribeAudio,
      allowedOrigin: 'https://nvvai.site',
    });
  });
});
