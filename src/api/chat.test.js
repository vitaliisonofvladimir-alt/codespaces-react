import { describe, expect, test, vi } from 'vitest';
import { sendChatMessage } from './chat';

describe('sendChatMessage', () => {
  test('reports when the local API server is unavailable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '',
    });

    await expect(
      sendChatMessage('chat', 'Hello', { fetchImpl })
    ).rejects.toThrow(
      'API server returned an empty response. Start the API server and try again.'
    );
  });
});
