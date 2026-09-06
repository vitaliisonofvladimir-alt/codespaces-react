import { runAssistant } from './agents/assistant.js';
import { createServer } from 'node:http';
import { createChatCompletion } from './openai.js';
import { getAllowedOrigin } from './cors.js';

const PORT = Number(process.env.API_PORT || 8787);
const ALLOWED_ORIGIN = getAllowedOrigin();

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

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

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    });
    response.end();
    return;
  }

  if (
    request.method !== 'POST' ||
    !['/api/chat', '/api/agent'].includes(request.url)
  ) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  response.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);

  try {
    const { message } = await readJson(request);

    const reply =
      request.url === '/api/agent'
        ? await runAssistant(message)
        : await createChatCompletion(message);

    sendJson(response, 200, { reply });
  } catch (error) {
    const statusCode =
      error.message === 'Message is required' ? 400 : 500;

    sendJson(response, statusCode, {
      error: error.message,
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`OpenAI API server listening on http://localhost:${PORT}`);
});
