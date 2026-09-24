import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildLeadsApiUrl,
  createLead,
  deleteLead,
  listLeads,
  LeadsApiError,
  resolveLeadsApiBaseUrl,
  updateLead,
} from './leads';

describe('Leads API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('lists leads and sends JSON headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ leads: [{ id: 'lead-1', name: 'Alex' }] }),
    });

    await expect(listLeads()).resolves.toEqual([
      { id: 'lead-1', name: 'Alex' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/leads',
      expect.objectContaining({
        headers: { accept: 'application/json' },
      })
    );
  });

  test('staging mode pins leads traffic to the dedicated staging API hostname', async () => {
    expect(resolveLeadsApiBaseUrl({ mode: 'staging' }))
      .toBe('https://staging-api.nvvai.site');
    expect(() => resolveLeadsApiBaseUrl({
      mode: 'staging',
      configuredOrigin: 'https://api.nvvai.site',
    })).toThrow('Staging leads API origin must match the approved host');
    expect(buildLeadsApiUrl('', { mode: 'staging' }))
      .toBe('https://staging-api.nvvai.site/v1/leads');
  });

  test('creates, updates, and deletes a lead using the API contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ lead: { id: 'lead-1', name: 'Alex' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ lead: { id: 'lead-1', name: 'Alex Updated' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      });

    await expect(createLead({ name: 'Alex' })).resolves.toEqual({
      id: 'lead-1',
      name: 'Alex',
    });
    await expect(updateLead('lead-1', { name: 'Alex Updated' })).resolves.toEqual({
      id: 'lead-1',
      name: 'Alex Updated',
    });
    await expect(deleteLead('lead-1')).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
      ['/v1/leads', 'POST'],
      ['/v1/leads/lead-1', 'PATCH'],
      ['/v1/leads/lead-1', 'DELETE'],
    ]);
  });

  test('maps API errors and preserves cancelled requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'tenant_not_found' }),
    });

    await expect(listLeads()).rejects.toMatchObject({
      name: 'LeadsApiError',
      status: 404,
      code: 'tenant_not_found',
      message: 'Это рабочее пространство не подключено к активной компании.',
    });

    const abortError = new DOMException('Aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);
    await expect(listLeads()).rejects.toBe(abortError);
    expect(new LeadsApiError('test')).toBeInstanceOf(Error);
  });

  test('URL-encodes lead identifiers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
    });

    await deleteLead('lead/with spaces');
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/leads/lead%2Fwith%20spaces',
      expect.anything()
    );
  });
});
