import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('sends a message to the API and renders the reply', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ reply: 'Да, работает.' }),
  });

  render(<App />);

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Привет!' },
  });
  fireEvent.click(screen.getByRole('button', { name: /отправить/i }));

  await waitFor(() => {
    expect(screen.getByText('Да, работает.')).toBeDefined();
  });

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/chat',
    expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Привет!' }),
    })
  );

  fetchMock.mockRestore();
});
