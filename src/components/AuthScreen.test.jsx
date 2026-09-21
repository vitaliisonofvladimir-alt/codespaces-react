import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthScreen from './AuthScreen';

const validCredentials = {
  email: 'owner@example.com',
  password: 'correct horse battery staple',
};

describe('AuthScreen', () => {
  test('validates email and password before submitting', async () => {
    const onLogin = vi.fn();
    render(
      <AuthScreen
        errorMessage=""
        isSubmitting={false}
        onLogin={onLogin}
        onRetry={vi.fn()}
        status="unauthenticated"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Введи корректный email.')).toBeDefined();
    expect(
      screen.getByText('Пароль должен содержать от 12 до 128 символов.')
    ).toBeDefined();
    expect(onLogin).not.toHaveBeenCalled();
  });

  test('submits valid credentials and clears the password after failure', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('invalid'));
    render(
      <AuthScreen
        errorMessage="Неверный email или пароль."
        isSubmitting={false}
        onLogin={onLogin}
        onRetry={vi.fn()}
        status="unauthenticated"
      />
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: validCredentials.email },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: validCredentials.password },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(validCredentials);
    });
    expect(screen.getByLabelText('Пароль').value).toBe('');
  });

  test('renders the unavailable state with a retry action', () => {
    const onRetry = vi.fn();
    render(
      <AuthScreen
        errorMessage="Сервис авторизации временно недоступен."
        isSubmitting={false}
        onLogin={vi.fn()}
        onRetry={onRetry}
        status="unavailable"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /повторить проверку/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
