import { createServer } from 'node:http';
import { handleTranscriptionRequest } from './transcription-route.js';

const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:3000';
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

async function readJson(request) {
  let raw = '';

  for await (const chunk of request) {
    raw += chunk;

    if (raw.length > 1_000_000) {
      throw new Error('Request body is too large');
    }
  }

  return JSON.parse(raw || '{}');
}

function setCorsHeaders(response, allowedOrigin) {
  response.setHeader(
    'Access-Control-Allow-Origin',
    allowedOrigin
  );
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );
  response.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );
}

function sendJson(response, statusCode, body, allowedOrigin) {
  setCorsHeaders(response, allowedOrigin);

  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });

  response.end(JSON.stringify(body));
}

export function createHttpServer({
  createChatCompletion,
  runAssistant,
  transcribeAudio,
  allowedOrigin =
    process.env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN,
} = {}) {
  return createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      setCorsHeaders(response, allowedOrigin);

      response.writeHead(204);
      response.end();
      return;
    }

    if (
      request.method === 'POST' &&
      request.url === '/api/transcribe'
    ) {
      const contentLength = Number(
        request.headers['content-length']
      );

      if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_AUDIO_SIZE
      ) {
        request.resume();

        sendJson(
          response,
          413,
          { error: 'Audio file is too large' },
          allowedOrigin
        );

        return;
      }

      const chunks = [];
      let totalSize = 0;

      for await (const chunk of request) {
        totalSize += chunk.length;

        if (totalSize > MAX_AUDIO_SIZE) {
          request.resume();

          sendJson(
            response,
            413,
            { error: 'Audio file is too large' },
            allowedOrigin
          );

          return;
        }

        chunks.push(chunk);
      }

      const audio = new Blob(chunks, {
        type:
          request.headers['content-type'] ||
          'application/octet-stream',
      });

      try {
        const result = await handleTranscriptionRequest(
          audio,
          transcribeAudio
        );

        sendJson(
          response,
          result.statusCode,
          result.body,
          allowedOrigin
        );
      } catch (error) {
        sendJson(
          response,
          500,
          { error: error.message },
          allowedOrigin
        );
      }

      return;
    }

    if (
      request.method === 'POST' &&
      ['/api/chat', '/api/agent'].includes(request.url)
    ) {
      try {
        const { message } = await readJson(request);

        const reply =
          request.url === '/api/agent'
            ? await runAssistant(message)
            : await createChatCompletion(message);

        sendJson(
          response,
          200,
          { reply },
          allowedOrigin
        );
      } catch (error) {
        sendJson(
          response,
          500,
          { error: error.message },
          allowedOrigin
        );
      }

      return;
    }

    sendJson(
      response,
      404,
      { error: 'Not found' },
      allowedOrigin
    );
  });
}
