import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  AuthApiError,
  exchangeMagicLink,
  getCurrentUser,
  logout,
  buildAuthApiUrl,
  requestMagicLink,
  resolveAuthApiBaseUrl,
} from './auth';

describe('Auth API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('bootstraps the session with credentials included', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 'u1', email: 'owner@example.com' } }),
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      email: 'owner@example.com',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/auth/me',
      expect.objectContaining({
        credentials: 'include',
        headers: { accept: 'application/json' },
      }),
    );
  });

  test('staging mode pins auth traffic to the dedicated staging API hostname', async () => {
    expect(resolveAuthApiBaseUrl({ mode: 'staging' }))
      .toBe('https://staging-api.nvvai.site');
    expect(() => resolveAuthApiBaseUrl({
      mode: 'staging',
      configuredOrigin: 'https://api.nvvai.site',
    })).toThrow('Staging auth API origin must match the approved host');
    expect(buildAuthApiUrl('/me', { mode: 'staging' }))
      .toBe('https://staging-api.nvvai.site/v1/auth/me');
  });

  test('requests a magic link with normalized email and an enumeration-safe response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ ok: true }),
    });

    await expect(requestMagicLink({ email: ' owner@example.com ' }))
      .resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/auth/magic-link/request',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'owner@example.com' }),
      }),
    );
  });

  test('exchanges the one-time token without persisting it and receives a session cookie', async () => {
    const token = 't'.repeat(43);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 'u1', email: 'owner@example.com', role: 'owner' },
        expiresAt: '2026-09-28T00:00:00.000Z',
      }),
    });

    await expect(exchangeMagicLink({ token })).resolves.toMatchObject({
      user: { role: 'owner' },
    });
    const [, options] = fetchMock.mock.calls[0];
    expect(fetchMock.mock.calls[0][0]).toBe('/v1/auth/magic-link/exchange');
    expect(options.credentials).toBe('include');
    expect(options.body).toBe(JSON.stringify({ token }));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  test('maps invalid/expired links to safe copy and handles non-JSON errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_or_expired_link' }),
    });

    await expect(exchangeMagicLink({ token: 't'.repeat(43) }))
      .rejects.toMatchObject({
        name: 'AuthApiError',
        status: 400,
        code: 'invalid_or_expired_link',
        message: 'Ссылка недействительна или устарела. Запроси новую ссылку для входа.',
      });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('HTML body');
      },
    });
    await expect(getCurrentUser()).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 503,
      message: 'Сервис авторизации временно недоступен. Попробуй ещё раз.',
    });
  });

  test('logs out with the session cookie and accepts a 204 response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
    });

    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(new AuthApiError('test')).toBeInstanceOf(Error);
  });
});
