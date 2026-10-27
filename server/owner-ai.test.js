import { describe, it, expect, vi } from 'vitest';
import { createOwnerChatCompletion } from './owner-ai.js';

const azure = {
  azureKey: 'redacted-test-secret',
  azureModel: 'gpt-4.1-mini',
};
const vertex = {
  vertexKey: 'redacted-vertex-secret',
  vertexEndpoint: 'https://litellm.nvvai.site/v1/chat/completions',
  vertexModel: 'vertex-gemini',
};

describe('NVVAI owner AI routing', () => {
  it('uses Azure Foundry only; no direct OpenAI API or web search', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ output: [{ type: 'message', content: [
        { type: 'output_text', text: 'Сервис Azure отвечает' },
      ] }] }),
    }));
    const reply = await createOwnerChatCompletion('Здравствуйте', { ...azure, fetchImpl });
    expect(reply).toBe('Сервис Azure отвечает');
    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/^https:\/\/agentdock-ai-resource\.services\.ai\.azure\.com\/openai\/v1\/responses$/);
    expect(request.headers['api-key']).toBe(azure.azureKey);
    expect(request.headers.Authorization).toBeUndefined();
    const body = JSON.parse(request.body);
    expect(body.model).toBe('gpt-4.1-mini');
    expect(body.input).toBe('Здравствуйте');
    expect(body.tools).toBeUndefined();
  });

  it('does not call any provider without an Azure secret', async () => {
    const fetchImpl = vi.fn();
    await expect(createOwnerChatCompletion('Hello', { fetchImpl }))
      .rejects.toThrow('Azure AI is not configured');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails over to the private Vertex gateway on Azure 429', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true, json: async () => ({
          choices: [{ message: { content: 'Hello from Vertex' } }],
        }),
      });
    const reply = await createOwnerChatCompletion('Hello', {
      ...azure, ...vertex, fetchImpl,
    });
    expect(reply).toBe('Hello from Vertex');
    expect(fetchImpl.mock.calls).toHaveLength(2);
    expect(fetchImpl.mock.calls[1][0]).toBe(vertex.vertexEndpoint);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).model)
      .toBe(vertex.vertexModel);
  });

  it('does not switch providers on invalid Azure key 401', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401 }));
    await expect(createOwnerChatCompletion('Hello', {
      ...azure, ...vertex, fetchImpl,
    })).rejects.toThrow('Azure AI request failed');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects untrusted endpoint hosts without sending credentials', async () => {
    const fetchImpl = vi.fn();
    await expect(createOwnerChatCompletion('Hello', {
      ...azure, azureEndpoint: 'https://attacker.example/openai/v1/responses',
      fetchImpl,
    })).rejects.toThrow('Azure AI endpoint configuration is invalid');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not permit an arbitrary Vertex fallback destination', async () => {
    const fetchImpl = vi.fn();
    await expect(createOwnerChatCompletion('Hi', {
      ...vertex, provider: 'vertex',
      vertexEndpoint: 'https://attacker.example/v1/chat/completions',
      fetchImpl,
    })).rejects.toThrow('Vertex AI gateway endpoint configuration is invalid');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects oversized messages before network access', async () => {
    const fetchImpl = vi.fn();
    await expect(createOwnerChatCompletion('x'.repeat(6001), {
      ...azure, fetchImpl,
    })).rejects.toThrow('Message too long');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
