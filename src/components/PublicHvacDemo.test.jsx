import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PublicHvacDemo from './PublicHvacDemo';

const api = vi.hoisted(() => ({ submitPublicLead: vi.fn() }));
const intakeConfig = vi.hoisted(() => ({ enabled: false }));

vi.mock('../api/publicLeads', () => ({
  resolvePublicLeadsUrl: vi.fn(() => {
    if (!intakeConfig.enabled) throw new Error('API URL is not configured');
    return 'https://demo-api.nvvai.site/v1/public/leads';
  }),
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
  intakeConfig.enabled = false;
  api.submitPublicLead.mockResolvedValue({
    id: 'lead-demo-1',
    status: 'new',
  });
});

test('clearly marks the multi-service page as a demo and keeps intake unavailable without its site key', () => {
  render(<PublicHvacDemo />);
  expect(screen.getByText('DEMO COMPANY')).toBeDefined();
  expect(screen.getByText(/No real service appointment/i)).toBeDefined();
  expect(screen.getByText('Heating and cooling')).toBeDefined();
  expect(screen.getByText('Installation and repair')).toBeDefined();
  expect(screen.getByText('Other home services')).toBeDefined();
  expect(screen.getByRole('heading', { name: /Make service requests easier/i })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Submit sample request' }).disabled).toBe(true);
  expect(api.submitPublicLead).not.toHaveBeenCalled();
});

test('keeps submission disabled when the Turnstile site key exists but the API origin does not', () => {
  vi.stubEnv('VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY', 'sitekey-demo');
  vi.stubEnv('VITE_PUBLIC_LEADS_API_BASE_URL', '');
  render(<PublicHvacDemo />);
  expect(screen.getByRole('button', { name: 'Submit sample request' }).disabled).toBe(true);
  expect(screen.getByRole('status').textContent)
    .toMatch(/security verification and the demo API/i);
  vi.unstubAllEnvs();
});

test('requires a contact method and verified challenge before submission', async () => {
  vi.stubEnv('VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY', 'sitekey-demo');
  vi.stubEnv('VITE_PUBLIC_LEADS_API_BASE_URL', 'https://demo-api.nvvai.site');
  intakeConfig.enabled = true;
  render(<PublicHvacDemo />);
  fireEvent.change(screen.getByLabelText('Your name'), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText('Describe your service request'), {
    target: { value: 'The unit needs service' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Mock human verification' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit sample request' }));

  expect(screen.getByRole('alert').textContent)
    .toMatch(/phone number or email/i);
  expect(api.submitPublicLead).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});

test('keeps the idempotency key for a retry of the same submitted payload', async () => {
  vi.stubEnv('VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY', 'sitekey-demo');
  vi.stubEnv('VITE_PUBLIC_LEADS_API_BASE_URL', 'https://demo-api.nvvai.site');
  intakeConfig.enabled = true;
  api.submitPublicLead
    .mockRejectedValueOnce(new Error('Temporary network failure'))
    .mockResolvedValueOnce({ id: 'lead-demo-2', status: 'new' });
  render(<PublicHvacDemo />);

  fireEvent.change(screen.getByLabelText('Your name'), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText('Phone'), {
    target: { value: '+15550100' },
  });
  fireEvent.change(screen.getByLabelText('Describe your service request'), {
    target: { value: 'The unit needs service' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Mock human verification' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit sample request' }));

  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Mock human verification' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit sample request' }));

  await waitFor(() => expect(api.submitPublicLead).toHaveBeenCalledTimes(2));
  expect(api.submitPublicLead.mock.calls[0][1])
    .toBe(api.submitPublicLead.mock.calls[1][1]);
  expect(await screen.findByText(/Sample request received/i)).toBeDefined();
  vi.unstubAllEnvs();
});

test('submits an idempotent request and shows demo confirmation', async () => {
  vi.stubEnv('VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY', 'sitekey-demo');
  vi.stubEnv('VITE_PUBLIC_LEADS_API_BASE_URL', 'https://demo-api.nvvai.site');
  intakeConfig.enabled = true;
  render(<PublicHvacDemo />);
  fireEvent.change(screen.getByLabelText('Your name'), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText('Phone'), {
    target: { value: '+15550100' },
  });
  fireEvent.change(screen.getByLabelText('Describe your service request'), {
    target: { value: 'The unit needs service' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Mock human verification' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit sample request' }));

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
