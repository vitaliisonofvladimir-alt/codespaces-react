import { createChatCompletion } from './openai.js';
import { transcribeAudio } from './transcription.js';
import { acceptsMarkdown, markdownResponse, publicMarkdown } from './public-markdown.js';
import { catalogResponse } from './api-catalog.js';

const DEFAULT_MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const API_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: API_HEADERS,
  });
}

export function createWorker({
  createChatCompletionImpl = createChatCompletion,
  transcribeAudioImpl = transcribeAudio,
  maxAudioSize = DEFAULT_MAX_AUDIO_SIZE,
} = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: API_HEADERS,
        });
      }

      if (
        ['nvvai.site', 'www.nvvai.site'].includes(url.hostname) &&
        url.pathname === '/.well-known/api-catalog' &&
        ['GET', 'HEAD'].includes(request.method)
      ) {
        return catalogResponse({ head: request.method === 'HEAD' });
      }

      if (
        request.method === 'POST' &&
        ['/api/chat', '/api/agent'].includes(url.pathname)
      ) {
        try {
          const { message } = await request.json();
          const reply = await createChatCompletionImpl(message, {
            apiKey: env.OPENAI_API_KEY,
          });

          return jsonResponse({ reply });
        } catch (error) {
          return jsonResponse({ error: error.message }, 500);
        }
      }

      if (
        request.method === 'POST' &&
        url.pathname === '/api/transcribe'
      ) {
        const contentLength = Number(
          request.headers.get('content-length')
        );

        if (
          Number.isFinite(contentLength) &&
          contentLength > maxAudioSize
        ) {
          return jsonResponse(
            { error: 'Audio file is too large' },
            413
          );
        }

        try {
          const audioBytes = await request.arrayBuffer();

          if (audioBytes.byteLength > maxAudioSize) {
            return jsonResponse(
              { error: 'Audio file is too large' },
              413
            );
          }

          const audio = new Blob([audioBytes], {
            type:
              request.headers.get('content-type') ||
              'application/octet-stream',
          });
          const text = await transcribeAudioImpl(audio, {
            apiKey: env.OPENAI_API_KEY,
          });

          return jsonResponse({ text });
        } catch (error) {
          return jsonResponse({ error: error.message }, 500);
        }
      }

      if (url.pathname.startsWith('/api/')) {
        return jsonResponse({ error: 'Not found' }, 404);
      }

      const publicPage = ['nvvai.site', 'www.nvvai.site'].includes(url.hostname)
        ? publicMarkdown.get(url.pathname)
        : null;
      if (publicPage && ['GET', 'HEAD'].includes(request.method)) {
        if (acceptsMarkdown(request.headers.get('Accept') || '')) {
          return markdownResponse(publicPage, { head: request.method === 'HEAD' });
        }
        if (env.ASSETS) {
          const asset = await env.ASSETS.fetch(request);
          const headers = new Headers(asset.headers);
          if (!headers.get('Vary')?.split(',').some((value) => value.trim().toLowerCase() === 'accept')) {
            headers.append('Vary', 'Accept');
          }
          return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
        }
      }

      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    },
  };
}

export default createWorker();
