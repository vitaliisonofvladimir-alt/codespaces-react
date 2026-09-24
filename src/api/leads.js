const LEADS_PATH = '/v1/leads';
export const STAGING_LEADS_API_ORIGIN = 'https://staging-api.nvvai.site';

export function resolveLeadsApiBaseUrl({
  mode = import.meta.env?.MODE ?? '',
  configuredOrigin = import.meta.env?.VITE_LEADS_API_BASE_URL ?? '',
} = {}) {
  if (mode === 'staging') {
    if (configuredOrigin && configuredOrigin !== STAGING_LEADS_API_ORIGIN) {
      throw new Error('Staging leads API origin must match the approved host');
    }
    return STAGING_LEADS_API_ORIGIN;
  }
  return configuredOrigin.replace(/\/$/, '');
}

export function buildLeadsApiUrl(path = '', options) {
  return `${resolveLeadsApiBaseUrl(options)}${LEADS_PATH}${path}`;
}

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
  return buildLeadsApiUrl(path);
}

async function request(path = '', options = {}) {
  let response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      credentials: 'include',
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
      unauthenticated: 'Сессия закончилась. Войди снова.',
      tenant_not_found: 'Это рабочее пространство не подключено к активной компании.',
      lead_service_unavailable: 'Сервис лидов временно недоступен.',
      invalid_lead: 'Проверь данные лида и попробуй снова.',
      lead_not_found: 'Этот лид уже не существует.',
    };

    throw new LeadsApiError(
      messages[code] ||
        (response.status === 401
          ? messages.unauthenticated
          : response.status >= 500
            ? messages.lead_service_unavailable
            : 'Сервис лидов отклонил запрос.'),
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
