import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HvacAiChat from './HvacAiChat';

afterEach(() => { vi.unstubAllGlobals(); });

describe('HVAC Azure chat', () => {
  test('starts with an HVAC greeting and sends only validated user content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ reply: 'Когда началась проблема?' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<HvacAiChat />);
    fireEvent.change(screen.getByLabelText('Вопрос о кондиционере или отоплении'), { target: { value: '  Кондиционер не охлаждает  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await waitFor(() => expect(screen.getByText('Когда началась проблема?')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/hvac-chat', expect.objectContaining({
      method: 'POST', credentials: 'omit',
      body: JSON.stringify({ message: 'Кондиционер не охлаждает', history: [] }),
    }));
  });

  test('reports unavailable Azure without affecting the lead form', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'model_unavailable' }) }));
    render(<HvacAiChat />);
    fireEvent.change(screen.getByLabelText('Вопрос о кондиционере или отоплении'), { target: { value: 'Нужна диагностика' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('не подключён к Azure'));
  });
});
