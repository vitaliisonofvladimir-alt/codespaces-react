import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { AuthApiError } from '../api/auth';

const api = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual('../api/auth');
  return {
    ...actual,
    getCurrentUser: api.getCurrentUser,
    login: api.login,
    logout: api.logout,
  };
});

function Harness() {
  const auth = useAuth();

  return (
    <div>
      <output data-testid="status">{auth.status}</output>
      <output data-testid="user">{auth.user?.email || 'none'}</output>
      <output data-testid="error">{auth.authErrorMessage}</output>
      <button
        onClick={() => auth.login({
          email: 'owner@example.com',
          password: 'correct horse battery staple',
        })}
        type="button"
      >
        Login
      </button>
      <button onClick={() => auth.logout()} type="button">
        Logout
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <AuthProvider>
      <Harness />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCurrentUser.mockResolvedValue(null);
    api.login.mockResolvedValue({
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

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated');
    });
    expect(screen.getByTestId('user').textContent).toBe('owner@example.com');
  });

  test('shows unauthenticated state after a 401 bootstrap response', async () => {
    const error = new AuthApiError('Unauthenticated', {
      status: 401,
    });
    api.getCurrentUser.mockRejectedValue(error);

    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  test('transitions into the protected state after login and clears on logout', async () => {
    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated');
    });
    expect(api.login).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'correct horse battery staple',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    });
    expect(api.logout).toHaveBeenCalledTimes(1);
  });
});
