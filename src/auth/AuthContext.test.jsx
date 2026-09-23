import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { AuthApiError } from '../api/auth';

const api = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requestMagicLink: vi.fn(),
  exchangeMagicLink: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual('../api/auth');
  return {
    ...actual,
    getCurrentUser: api.getCurrentUser,
    requestMagicLink: api.requestMagicLink,
    exchangeMagicLink: api.exchangeMagicLink,
    logout: api.logout,
  };
});

function Harness() {
  const auth = useAuth();
  return (
    <div>
      <output data-testid="status">{auth.status}</output>
      <output data-testid="user">{auth.user?.email || 'none'}</output>
      <output data-testid="error">{auth.authActionErrorMessage}</output>
      <output data-testid="sent">{String(auth.magicLinkSent)}</output>
      <button onClick={() => auth.requestMagicLink('owner@example.com')} type="button">
        Request link
      </button>
      <button onClick={() => auth.logout()} type="button">Logout</button>
    </div>
  );
}

function renderHarness() {
  return render(<AuthProvider><Harness /></AuthProvider>);
}

describe('AuthContext', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
    api.getCurrentUser.mockResolvedValue(null);
    api.requestMagicLink.mockResolvedValue({ ok: true });
    api.exchangeMagicLink.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        displayName: 'Owner',
        role: 'owner',
      },
    });
    api.logout.mockResolvedValue(undefined);
  });

  test('restores an authenticated session from /me', async () => {
    api.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner',
      role: 'owner',
    });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user').textContent).toBe('owner@example.com');
  });

  test('shows unauthenticated state after a 401 bootstrap response', async () => {
    api.getCurrentUser.mockRejectedValue(new AuthApiError('Unauthenticated', { status: 401 }));
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  test('requests an enumeration-safe magic link', async () => {
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    fireEvent.click(screen.getByRole('button', { name: 'Request link' }));
    await waitFor(() => expect(screen.getByTestId('sent').textContent).toBe('true'));
    expect(api.requestMagicLink).toHaveBeenCalledWith({ email: 'owner@example.com' });
    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
  });

  test('exchanges one valid URL token once and removes it from browser history', async () => {
    const token = 'token_'.repeat(8);
    window.history.replaceState({}, '', `/?token=${token}&keep=1`);
    render(<React.StrictMode><AuthProvider><Harness /></AuthProvider></React.StrictMode>);

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(api.getCurrentUser).not.toHaveBeenCalled();
    expect(api.exchangeMagicLink).toHaveBeenCalledTimes(1);
    expect(api.exchangeMagicLink).toHaveBeenCalledWith({ token });
    expect(window.location.search).toBe('?keep=1');
  });

  test('does not send malformed or duplicate URL tokens and scrubs them', async () => {
    window.history.replaceState({}, '', '/?token=bad&token=duplicate');
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(api.exchangeMagicLink).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(screen.getByTestId('error').textContent)
      .toBe('Ссылка недействительна или устарела. Запроси новую ссылку для входа.');
  });

  test('scrubs an expired token after failed exchange and shows generic copy', async () => {
    window.history.replaceState({}, '', `/?token=${'x'.repeat(43)}`);
    api.exchangeMagicLink.mockRejectedValue(new AuthApiError(
      'Ссылка недействительна или устарела.',
      { status: 400, code: 'invalid_or_expired_link' },
    ));
    renderHarness();
    await waitFor(() => expect(api.exchangeMagicLink).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(screen.getByTestId('error').textContent)
      .toBe('Ссылка недействительна или устарела.');
    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
  });

  test('clears session after logout', async () => {
    api.getCurrentUser.mockResolvedValue({ id: 'u1', email: 'owner@example.com' });
    renderHarness();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('unauthenticated'));
    expect(api.logout).toHaveBeenCalledTimes(1);
  });
});
