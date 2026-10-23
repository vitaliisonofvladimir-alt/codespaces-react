import { test, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { createHvacAzureHandler, AZURE_ENDPOINT } from './azure-hvac.js';

async function request(handler, body, options = {}) {
  const srv = createServer(handler);
  await new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
  try {
    return await fetch('http://127.0.0.1:' + srv.address().port + '/api/hvac-chat', {
      method: 'POST', headers: { 'content-type': 'application/json', ...options.headers },
      body: JSON.stringify(body),
    });
  } finally { srv.closeAllConnections(); await new Promise(resolve => srv.close(resolve)); }
}

test('unconfigured Azure returns unavailable without network calls', async () => {
  const fetchImpl = vi.fn();
  const r = await request(createHvacAzureHandler({ fetchImpl }), { message: 'HVAC', history: [] });
  expect(r.status).toBe(503);
  expect(fetchImpl).not.toHaveBeenCalled();
});
test('rejects oversized messages', async () => {
  const fetchImpl = vi.fn();
  const r = await request(createHvacAzureHandler({ apiKey: 'test', fetchImpl }), { message: 'x'.repeat(601), history: [] });
  expect(r.status).toBe(400);
  expect(fetchImpl).not.toHaveBeenCalled();
});
test('forwards valid HVAC chat only to pinned Azure endpoint with token budget', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'Сколько лет системе?' }] }] }) });
  const r = await request(createHvacAzureHandler({ apiKey: 'test', fetchImpl }), { message: 'Не холодит', history: [] });
  expect(r.status).toBe(200);
  expect((await r.json()).reply).toBe('Сколько лет системе?');
  expect(fetchImpl.mock.calls[0][0]).toBe(AZURE_ENDPOINT);
  const forwarded = JSON.parse(fetchImpl.mock.calls[0][1].body);
  expect(forwarded.max_output_tokens).toBe(250);
  expect(forwarded.store).toBe(false);
});
test('enforces per-minute request ceiling before calling model', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'Хорошо' }] }] }) });
  const handler = createHvacAzureHandler({ apiKey: 'test', fetchImpl, maxRequestsPerMinute: 1 });
  const body = { message: 'Тест', history: [] };
  expect((await request(handler, body)).status).toBe(200);
  expect((await request(handler, body)).status).toBe(429);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
