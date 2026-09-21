import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LeadsPage from './LeadsPage';

const api = vi.hoisted(() => ({
  listLeads: vi.fn(),
  createLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
}));

vi.mock('../api/leads', async () => {
  const actual = await vi.importActual('../api/leads');
  return {
    ...actual,
    listLeads: api.listLeads,
    createLead: api.createLead,
    updateLead: api.updateLead,
    deleteLead: api.deleteLead,
  };
});

const sampleLeads = [
  {
    id: 'lead-1',
    name: 'Alex Customer',
    email: 'alex@example.com',
    phone: '+1 555 0100',
    source: 'Website',
    status: 'qualified',
    notes: 'Needs a follow-up',
    createdAt: '2026-09-20T12:00:00.000Z',
    updatedAt: '2026-09-20T12:00:00.000Z',
  },
  {
    id: 'lead-2',
    name: 'Bea Prospect',
    email: 'bea@example.com',
    phone: '',
    source: 'Referral',
    status: 'new',
    notes: '',
    createdAt: '2026-09-18T12:00:00.000Z',
    updatedAt: '2026-09-18T12:00:00.000Z',
  },
];

describe('LeadsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listLeads.mockResolvedValue(sampleLeads);
    api.createLead.mockResolvedValue({
      ...sampleLeads[0],
      id: 'lead-3',
      name: 'New Lead',
      status: 'new',
    });
    api.updateLead.mockResolvedValue({
      ...sampleLeads[0],
      name: 'Alex Updated',
    });
    api.deleteLead.mockResolvedValue(undefined);
  });

  test('loads and filters leads by search and status', async () => {
    render(<LeadsPage />);

    await screen.findByText('Alex Customer');
    expect(screen.getByText('Bea Prospect')).toBeDefined();

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'alex' },
    });
    expect(screen.getByText('Alex Customer')).toBeDefined();
    expect(screen.queryByText('Bea Prospect')).toBeNull();

    fireEvent.change(screen.getByLabelText(/фильтр по статусу/i), {
      target: { value: 'new' },
    });
    expect(screen.getByText('Лиды не найдены')).toBeDefined();
  });

  test('creates a lead from the drawer and updates the list', async () => {
    render(<LeadsPage />);
    await screen.findByText('Alex Customer');

    fireEvent.click(screen.getByRole('button', { name: /добавить лида/i }));
    fireEvent.change(screen.getByLabelText(/^имя/i), {
      target: { value: 'New Lead' },
    });
    fireEvent.click(screen.getByRole('button', { name: /создать лида/i }));

    await waitFor(() => {
      expect(api.createLead).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Lead',
        status: 'new',
      }));
    });
    expect(await screen.findByText('Лид добавлен в воронку')).toBeDefined();
    expect(screen.getByText('New Lead')).toBeDefined();
  });

  test('opens edit form and deletes a lead after confirmation', async () => {
    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<LeadsPage />);
    await screen.findByText('Alex Customer');

    fireEvent.click(screen.getByRole('button', { name: 'Редактировать Alex Customer' }));
    fireEvent.change(screen.getByLabelText(/^имя/i), {
      target: { value: 'Alex Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: /сохранить/i }));

    await waitFor(() => {
      expect(api.updateLead).toHaveBeenCalledWith('lead-1', expect.objectContaining({
        name: 'Alex Updated',
      }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Удалить Bea Prospect' }));
    await waitFor(() => expect(api.deleteLead).toHaveBeenCalledWith('lead-2'));
    expect(confirmMock).toHaveBeenCalledWith(
      'Удалить лида «Bea Prospect»? Это действие нельзя отменить.'
    );
    confirmMock.mockRestore();
  });

  test('renders an API error with retry affordance', async () => {
    api.listLeads.mockRejectedValueOnce(new Error('offline'));
    render(<LeadsPage />);

    expect(
      await screen.findByText('Не удалось загрузить лидов. Попробуй ещё раз.')
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /повторить/i })).toBeDefined();
  });

  test('hands an expired session back to the auth boundary', async () => {
    const onSessionExpired = vi.fn().mockResolvedValue(true);
    api.listLeads.mockRejectedValueOnce({ status: 401 });

    render(<LeadsPage onSessionExpired={onSessionExpired} />);

    await waitFor(() => {
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByText('Не удалось загрузить лидов. Попробуй ещё раз.')
    ).toBeNull();
  });

  test('switches to card view', async () => {
    render(<LeadsPage />);
    await screen.findByText('Alex Customer');

    fireEvent.click(screen.getByRole('button', { name: /карточки/i }));

    expect(screen.getByRole('button', { name: /редактировать alex customer/i })).toBeDefined();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
