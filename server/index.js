import { runAssistant } from './agents/assistant.js';
import { createChatCompletion } from './openai.js';
import { transcribeAudio } from './transcription.js';
import { createHttpServer } from './http.js';
import { getAllowedOrigin } from './cors.js';

const PORT = Number(process.env.API_PORT || 8787);

export function createProductionServer() {
  return createHttpServer({
    createChatCompletion,
    runAssistant,
    transcribeAudio,
    allowedOrigin: getAllowedOrigin(),
  });
}

const server = createProductionServer();

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `OpenAI API server listening on http://127.0.0.1:${PORT}`
  );
});
