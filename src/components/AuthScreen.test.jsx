import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthScreen from './AuthScreen';

describe('AuthScreen', () => {
  test('validates email before requesting a sign-in link', async () => {
    const onRequestMagicLink = vi.fn();
    render(
      <AuthScreen
        actionErrorMessage=""
        errorMessage=""
        isSubmitting={false}
        onRequestMagicLink={onRequestMagicLink}
        onRetry={vi.fn()}
        status="unauthenticated"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }));
    expect(await screen.findByText('Введи корректный email.')).toBeDefined();
    expect(onRequestMagicLink).not.toHaveBeenCalled();
  });

  test('submits the trimmed email and renders the enumeration-safe confirmation', async () => {
    const onRequestMagicLink = vi.fn().mockResolvedValue(true);
    const { rerender } = render(
      <AuthScreen
        actionErrorMessage=""
        errorMessage=""
        isSubmitting={false}
        onRequestMagicLink={onRequestMagicLink}
        onRetry={vi.fn()}
        status="unauthenticated"
      />,
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' owner@example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить ссылку' }));
    await waitFor(() => expect(onRequestMagicLink).toHaveBeenCalledWith('owner@example.com'));
    rerender(
      <AuthScreen
        actionErrorMessage=""
        errorMessage=""
        isSubmitting={false}
        magicLinkSent
        onRequestMagicLink={onRequestMagicLink}
        onRetry={vi.fn()}
        status="unauthenticated"
      />,
    );
    expect(screen.getByRole('status').textContent)
      .toContain('Если этот адрес подключён к компании');
    expect(screen.getByRole('button', { name: 'Отправить ещё раз' })).toBeDefined();
  });

  test('shows safe request errors and keeps retry available', () => {
    render(
      <AuthScreen
        actionErrorMessage="Слишком много попыток. Подожди немного и попробуй ещё раз."
        errorMessage=""
        isSubmitting={false}
        onRequestMagicLink={vi.fn()}
        onRetry={vi.fn()}
        status="unauthenticated"
      />,
    );
    expect(screen.getByRole('alert').textContent)
      .toBe('Слишком много попыток. Подожди немного и попробуй ещё раз.');
  });

  test('renders the unavailable state with a retry action', () => {
    const onRetry = vi.fn();
    render(
      <AuthScreen
        errorMessage="Сервис авторизации временно недоступен."
        isSubmitting={false}
        onRequestMagicLink={vi.fn()}
        onRetry={onRetry}
        status="unavailable"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /повторить проверку/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
