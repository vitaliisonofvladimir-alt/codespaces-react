import { describe, expect, it, vi } from 'vitest';
import { createChatCompletion } from './openai.js';

describe('createChatCompletion', () => {
  it('sends the user message to the OpenAI Responses API and returns output text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'Hello from OpenAI' }),
    });

    const result = await createChatCompletion('Hello', {
      apiKey: 'test-key',
      fetchImpl,
    });

    expect(result).toBe('Hello from OpenAI');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      })
    );

    const request = fetchImpl.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual({
      model: 'gpt-5.6-luna',
      input: 'Hello',
    });
  });

  it('rejects an empty message before calling OpenAI', async () => {
    const fetchImpl = vi.fn();

    await expect(
      createChatCompletion('   ', { apiKey: 'test-key', fetchImpl })
    ).rejects.toThrow('Message is required');

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
