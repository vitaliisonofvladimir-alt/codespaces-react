import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  PublicLeadApiError,
  resolvePublicLeadsUrl,
  submitPublicLead,
} from './publicLeads';

describe('public lead intake API', () => {
  beforeEach(() => vi.restoreAllMocks());

  test('requires an explicit HTTPS API origin and builds the public route', () => {
    expect(() => resolvePublicLeadsUrl({ configuredOrigin: '' }))
      .toThrow('Форма ещё не подключена к демо-сервису.');
    expect(resolvePublicLeadsUrl({
      configuredOrigin: 'https://demo-api.nvvai.site/',
      browserHostname: 'demo.nvvai.site',
    })).toBe('https://demo-api.nvvai.site/v1/public/leads');
    expect(() => resolvePublicLeadsUrl({
      configuredOrigin: 'http://public-api.example.test',
    })).toThrow(PublicLeadApiError);
  });

  test('does not accept the production API host or a cross-environment staging origin', () => {
    expect(() => resolvePublicLeadsUrl({
      configuredOrigin: 'https://api.nvvai.site',
      browserHostname: 'demo.nvvai.site',
    })).toThrow(PublicLeadApiError);
    expect(() => resolvePublicLeadsUrl({
      configuredOrigin: 'https://staging-api.nvvai.site',
      browserHostname: 'demo.nvvai.site',
    })).toThrow(PublicLeadApiError);
    expect(resolvePublicLeadsUrl({
      configuredOrigin: 'https://staging-api.nvvai.site',
      browserHostname: 'staging-app.nvvai.site',
    })).toBe('https://staging-api.nvvai.site/v1/public/leads');
  });

  test('sends tenant-neutral form data with an idempotency key and no cookies', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        lead: { id: 'lead-1', status: 'new', deduplicated: false },
      }),
    });

    await expect(submitPublicLead(
      { name: 'Alex', phone: '+15550100', turnstileToken: 'turnstile-token' },
      'a-valid-idempotency-key',
      {
        configuredOrigin: 'https://demo-api.nvvai.site',
        browserHostname: 'demo.nvvai.site',
        fetchImpl,
      }
    )).resolves.toMatchObject({ id: 'lead-1', status: 'new' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://demo-api.nvvai.site/v1/public/leads',
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        headers: expect.objectContaining({
          'idempotency-key': 'a-valid-idempotency-key',
        }),
      })
    );
  });

  test('maps server rejection to a safe user message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_human_verification' }),
    });

    await expect(submitPublicLead(
      { name: 'Alex' },
      'a-valid-idempotency-key',
      {
        configuredOrigin: 'https://demo-api.nvvai.site',
        browserHostname: 'demo.nvvai.site',
        fetchImpl,
      }
    )).rejects.toMatchObject({
      name: 'PublicLeadApiError',
      status: 400,
      code: 'invalid_human_verification',
      message: 'Проверка безопасности истекла. Подтверди её ещё раз.',
    });
  });
});
