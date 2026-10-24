import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const AZURE_ENDPOINT = 'https://agentdock-ai-resource.services.ai.azure.com/openai/v1/responses';
export const AZURE_MODEL = 'gpt-4.1-mini';
const SYSTEM_PROMPT = "Ты приветливый AI-администратор демонстрационной платформы NVVAI для приёма обращений к мастерам разных специальностей. Не ограничивай помощь отоплением или кондиционерами: принимай запросы на сантехнику, электрику, бытовую технику, установку и сборку мебели, ремонт и отделку, отопление и кондиционирование, а также любые другие бытовые и сервисные работы. Твоя задача — понять суть запроса, при необходимости задать не более одного короткого уточняющего вопроса и помочь посетителю оставить заявку, а не отказывать или перенаправлять его к чужим сервисам. Отвечай на языке посетителя кратко, понятно и доброжелательно. Если клиент просит мастера или спрашивает, как оставить заявку, предложи заполнить отдельную форму «Расскажи, чем помочь» ниже чата и нажать кнопку «Оставить заявку». Не вставляй сырой текст #request вместо кнопки: на странице уже есть настоящая ссылка на форму. Честно предупреждай, что NVVAI здесь — демонстрация, заявка тестовая, а наличие специалиста, обратный звонок, стоимость, сроки и выезд не подтверждены. Не заявляй, что компания предоставляет конкретную услугу, пока это не подтверждено человеком. Не утверждай, что заявка уже создана: чат её не отправляет. Не собирай в чате телефон, точный адрес, платёжные данные, документы или пароли — для контакта есть отдельная форма. Не давай опасных пошаговых инструкций по электропроводке, газу, аварийным работам или ремонту; при непосредственной опасности порекомендуй отойти от опасности и обратиться в местные экстренные службы. Не используй Markdown-таблицы.";

export function createHvacAzureHandler({
  apiKey = '',
  secretFile = '',
  fetchImpl = fetch,
  now = () => Date.now(),
  maxRequestsPerMinute = 3,
  maxRequestsPerDay = 200,
} = {}) {
  let key = apiKey.trim();
  if (!key && secretFile) key = readFileSync(secretFile, 'utf8').trim();
  const counts = new Map();
  let daily = { day: '', total: 0 };
  return async function handle(req, res) {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    const respond = (status, payload) => { res.writeHead(status); res.end(JSON.stringify(payload)); };
    if (req.url === '/health' && req.method === 'GET') return respond(200, { ok: true, configured: !!key });
    if (req.url !== '/api/hvac-chat' || req.method !== 'POST') return respond(404, { error: 'not_found' });
    if (!key) return respond(503, { error: 'model_unavailable' });
    if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') return respond(415, { error: 'invalid_content_type' });
    const chunks = [];
    let bytes = 0;
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 6000) return respond(413, { error: 'request_too_large' });
        chunks.push(chunk);
      }
    } catch { return respond(400, { error: 'invalid_request' }); }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return respond(400, { error: 'invalid_json' }); }
    if (typeof body?.message !== 'string' || !body.message.trim() || body.message.length > 600 ||
      !Array.isArray(body.history) || body.history.length > 6 ||
      !body.history.every(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 600)) {
      return respond(400, { error: 'invalid_messages' });
    }
    const nowTime = now();
    const minute = Math.floor(nowTime / 60000);
    const day = new Date(nowTime).toISOString().slice(0, 10);
    const peer = req.socket.remoteAddress || 'unknown';
    for (const [k] of counts) if (!k.startsWith(minute + ':')) counts.delete(k);
    const id = minute + ':' + peer;
    if ((counts.get(id) || 0) >= maxRequestsPerMinute) return respond(429, { error: 'rate_limited' });
    if (daily.day !== day) daily = { day, total: 0 };
    if (daily.total >= maxRequestsPerDay) return respond(429, { error: 'daily_limit_reached' });
    counts.set(id, (counts.get(id) || 0) + 1);
    daily.total++;
    const history = body.history.map(({ role, content }) => ({ role, content }));
    try {
      const response = await fetchImpl(AZURE_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'api-key': key, 'x-ms-client-request-id': randomUUID() },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          model: AZURE_MODEL,
          instructions: SYSTEM_PROMPT,
          input: [...history, { role: 'user', content: body.message.trim() }],
          max_output_tokens: 250,
          store: false,
        }),
      });
      if (!response.ok) return respond(503, { error: 'model_unavailable' });
      const data = await response.json();
      const reply = (data.output || []).flatMap(o => o.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('\n').trim();
      if (!reply) return respond(503, { error: 'model_unavailable' });
      return respond(200, { reply: reply.slice(0, 1600) });
    } catch { return respond(503, { error: 'model_unavailable' }); }
  };
}

export function runHvacAzureServer() {
  const handle = createHvacAzureHandler({ secretFile: process.env.NVVAI_AZURE_KEY_FILE || '' });
  const port = Number(process.env.PORT || 8081);
  createServer(handle).listen(port, '0.0.0.0');
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) runHvacAzureServer();
