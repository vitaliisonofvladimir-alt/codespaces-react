import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  AuthApiError,
  getCurrentUser,
  login,
  logout,
} from './auth';

describe('Auth API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('bootstraps the session with credentials included', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          displayName: 'Owner',
          role: 'owner',
        },
      }),
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      email: 'owner@example.com',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/auth/me',
      expect.objectContaining({
        credentials: 'include',
        headers: { accept: 'application/json' },
      })
    );
  });

  test('posts login credentials without persisting or returning the password', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          displayName: 'Owner',
          role: 'owner',
        },
        expiresAt: '2026-09-28T00:00:00.000Z',
      }),
    });

    await expect(
      login({
        email: 'OWNER@EXAMPLE.COM',
        password: 'correct horse battery staple',
      })
    ).resolves.toMatchObject({
      user: { role: 'owner' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          email: 'OWNER@EXAMPLE.COM',
          password: 'correct horse battery staple',
        }),
      })
    );
  });

  test('maps invalid credentials and tolerates a non-JSON error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid_credentials' }),
    });

    await expect(login({ email: 'owner@example.com', password: 'wrong password' }))
      .rejects.toMatchObject({
        name: 'AuthApiError',
        status: 401,
        code: 'invalid_credentials',
        message: 'Неверный email или пароль.',
      });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
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
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
    expect(new AuthApiError('test')).toBeInstanceOf(Error);
  });
});
