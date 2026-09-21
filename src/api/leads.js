const API_BASE_URL = (import.meta.env?.VITE_LEADS_API_BASE_URL ?? '').replace(
  /\/$/,
  ''
);

const LEADS_PATH = '/v1/leads';

export const LEAD_STATUSES = Object.freeze([
  'new',
  'contacted',
  'qualified',
  'won',
  'lost',
]);

export class LeadsApiError extends Error {
  constructor(message, { status, code, cause } = {}) {
    super(message, { cause });
    this.name = 'LeadsApiError';
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path = '') {
  return `${API_BASE_URL}${LEADS_PATH}${path}`;
}

async function request(path = '', options = {}) {
  let response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers: {
        accept: 'application/json',
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new LeadsApiError(
      'Не удалось связаться с сервисом лидов. Проверь соединение и попробуй снова.',
      { cause: error }
    );
  }

  let data = null;
  try {
    data = response.status === 204 ? null : await response.json();
  } catch (error) {
    throw new LeadsApiError('Сервис лидов вернул некорректный ответ.', {
      status: response.status,
      cause: error,
    });
  }

  if (!response.ok) {
    const code = data?.error;
    const messages = {
      tenant_not_found: 'Это рабочее пространство не подключено к активной компании.',
      lead_service_unavailable: 'Сервис лидов временно недоступен.',
      invalid_lead: 'Проверь данные лида и попробуй снова.',
      lead_not_found: 'Этот лид уже не существует.',
    };

    throw new LeadsApiError(
      messages[code] || 'Сервис лидов отклонил запрос.',
      { status: response.status, code }
    );
  }

  return data;
}

export async function listLeads({ signal } = {}) {
  const data = await request('', { signal });
  return Array.isArray(data?.leads) ? data.leads : [];
}

export async function createLead(input) {
  const data = await request('', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.lead;
}

export async function updateLead(id, input) {
  const data = await request(`/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.lead;
}

export async function deleteLead(id) {
  await request(`/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
