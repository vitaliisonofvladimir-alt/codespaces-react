import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PublicHvacDemo from './PublicHvacDemo';

const api = vi.hoisted(() => ({ submitPublicLead: vi.fn() }));

vi.mock('../api/publicLeads', () => ({
  submitPublicLead: api.submitPublicLead,
}));

vi.mock('./TurnstileWidget', () => ({
  default: ({ onToken }) => (
    <button type="button" onClick={() => onToken('demo-human-token')}>
      Mock human verification
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.submitPublicLead.mockResolvedValue({
    id: 'lead-demo-1',
    status: 'new',
  });
});

test('clearly marks the HVAC page as a demo and keeps intake unavailable without its site key', () => {
  render(<PublicHvacDemo />);
  expect(screen.getByText('ДЕМО-КОМПАНИЯ')).toBeDefined();
  expect(screen.getByText(/не реальная служба обслуживания/i)).toBeDefined();
  expect(screen.getByRole('button', { name: 'Отправить заявку' }).disabled).toBe(true);
  expect(api.submitPublicLead).not.toHaveBeenCalled();
});

test('requires a contact method and verified challenge before submission', async () => {
  vi.stubEnv('VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY', 'sitekey-demo');
  render(<PublicHvacDemo />);
  fireEvent.change(screen.getByLabelText('Как к тебе обращаться'), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText('Что случилось или какая услуга нужна?'), {
    target: { value: 'The unit needs service' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Mock human verification' }));
  fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }));

  expect(screen.getByRole('alert').textContent)
    .toMatch(/телефон или email/i);
  expect(api.submitPublicLead).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});

test('submits an idempotent request and shows demo confirmation', async () => {
  vi.stubEnv('VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY', 'sitekey-demo');
  render(<PublicHvacDemo />);
  fireEvent.change(screen.getByLabelText('Как к тебе обращаться'), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText('Телефон'), {
    target: { value: '+15550100' },
  });
  fireEvent.change(screen.getByLabelText('Что случилось или какая услуга нужна?'), {
    target: { value: 'The unit needs service' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Mock human verification' }));
  fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }));

  await waitFor(() => expect(api.submitPublicLead).toHaveBeenCalledTimes(1));
  const [payload, idempotencyKey] = api.submitPublicLead.mock.calls[0];
  expect(payload).toMatchObject({
    name: 'Alex',
    phone: '+15550100',
    description: 'The unit needs service',
    turnstileToken: 'demo-human-token',
  });
  expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
  expect(await screen.findByRole('status')).toBeDefined();
  vi.unstubAllEnvs();
});
