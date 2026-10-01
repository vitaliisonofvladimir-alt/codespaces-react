import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('negotiates markdown for the public pages without serving the SPA shell', async () => {
    const worker = createWorker();
    const env = { ASSETS: { fetch: () => { throw new Error('Should not fetch HTML'); } } };

    for (const path of ['/', '/demo/hvac']) {
      const response = await worker.fetch(new Request(`https://nvvai.site${path}`, {
        headers: { Accept: 'text/html, text/markdown;q=0.9' },
      }), env);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/markdown');
      expect(response.headers.get('Vary')).toBe('Accept');
      expect(response.headers.get('Content-Signal')).toBe('ai-train=no, search=yes, ai-input=no');
      expect(Number(response.headers.get('x-markdown-tokens'))).toBeGreaterThan(0);
      expect(body).toMatch(/^# /);
      expect(body).not.toContain('<html>');
    }
  });

  it('keeps HTML as the default for browsers and declined markdown', async () => {
    const worker = createWorker();
    const env = { ASSETS: { fetch: async () => new Response('<html>NVVAI</html>', {
      headers: { 'Content-Type': 'text/html' },
    }) } };

    for (const accept of [undefined, 'text/markdown;q=0, text/html']) {
      const response = await worker.fetch(new Request('https://nvvai.site/', {
        headers: accept ? { Accept: accept } : {},
      }), env);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(response.headers.get('Vary')).toBe('Accept');
      expect(await response.text()).toBe('<html>NVVAI</html>');
    }
  });

  it('does not serve public-page markdown to the owner subdomain', async () => {
    const worker = createWorker();
    const env = { ASSETS: { fetch: async () => new Response('<html>Login</html>') } };
    const response = await worker.fetch(new Request('https://app.nvvai.site/', {
      headers: { Accept: 'text/markdown' },
    }), env);
    expect(await response.text()).toBe('<html>Login</html>');
  });

  it('advertises discovery links on HTML and Markdown homepage GET and HEAD responses', async () => {
    const worker = createWorker();
    const env = { ASSETS: { fetch: async (request) => new Response(
      request.method === 'HEAD' ? null : '<html>NVVAI</html>',
      { headers: { 'Content-Type': 'text/html', Link: '</existing>; rel="alternate"' } }
    ) } };
    for (const hostname of ['nvvai.site', 'www.nvvai.site']) {
      for (const method of ['GET', 'HEAD']) {
        for (const accept of ['text/html', 'text/markdown']) {
          const response = await worker.fetch(new Request(`https://${hostname}/`, {
            method, headers: { Accept: accept },
          }), env);
          const link = response.headers.get('Link');
          expect(response.status).toBe(200);
          expect(link).toContain('<https://nvvai.site/.well-known/api-catalog>; rel="api-catalog"');
          expect(link).toContain('<https://nvvai.site/openapi.json>; rel="service-desc"');
          expect(link).toContain('<https://nvvai.site/api-docs>; rel="service-doc"');
          expect(link).toContain('rel="describedby"');
          if (accept === 'text/html') expect(link).toContain('</existing>; rel="alternate"');
          if (method === 'HEAD') expect(await response.text()).toBe('');
        }
      }
    }
  });

  it('publishes an API catalog with working specification and documentation links', async () => {
    const worker = createWorker();
    const request = new Request('https://nvvai.site/.well-known/api-catalog');
    const response = await worker.fetch(request, {});
    const catalog = await response.json();
    const spec = JSON.parse(readFileSync('public/openapi.json', 'utf8'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/linkset+json');
    expect(response.headers.get('Link')).toContain('rel="api-catalog"');
    expect(catalog.linkset).toHaveLength(3);
    for (const entry of catalog.linkset) {
      expect(spec.paths[new URL(entry.anchor).pathname]).toBeDefined();
      expect(entry['service-desc'][0].href).toBe('https://nvvai.site/openapi.json');
      expect(entry['service-doc'][0].href).toBe('https://nvvai.site/api-docs');
    }
    expect(readFileSync('public/api-docs.html', 'utf8')).toContain('NVVAI public site API');

    const head = await worker.fetch(new Request(request.url, { method: 'HEAD' }), {});
    expect(head.status).toBe(200);
    expect(head.headers.get('Link')).toBe(response.headers.get('Link'));
    expect(await head.text()).toBe('');
  });
});
