const API_BASE_URL = (import.meta.env?.VITE_AUTH_API_BASE_URL ?? '').replace(
  /\/$/,
  ''
);

const AUTH_PATH = '/v1/auth';

const ERROR_MESSAGES = Object.freeze({
  invalid_or_expired_link:
    'Ссылка недействительна или устарела. Запроси новую ссылку для входа.',
  rate_limited:
    'Слишком много попыток. Подожди немного и попробуй ещё раз.',
  unauthenticated: 'Сессия закончилась. Войди снова.',
  tenant_not_found: 'Этот адрес ещё не подключён к рабочему пространству.',
  tenant_resolution_unavailable:
    'Сервис не смог определить рабочее пространство.',
  authentication_unavailable:
    'Сервис авторизации временно недоступен. Попробуй ещё раз.',
  content_type_must_be_application_json:
    'Сервис авторизации получил неподдерживаемый формат запроса.',
  invalid_auth_input: 'Проверь email и попробуй ещё раз.',
});

export class AuthApiError extends Error {
  constructor(message, { status, code, cause } = {}) {
    super(message, { cause });
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path = '') {
  return `${API_BASE_URL}${AUTH_PATH}${path}`;
}

function messageForResponse(code, status) {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (status === 404) return ERROR_MESSAGES.tenant_not_found;
  if (status >= 500) return ERROR_MESSAGES.authentication_unavailable;
  return 'Не удалось выполнить запрос авторизации.';
}

async function readResponseData(response) {
  if (response.status === 204) return null;

  try {
    if (typeof response.json === 'function') {
      return await response.json();
    }
  } catch {
    // A proxy or an unconfigured origin can return HTML instead of JSON. The
    // caller receives a safe AuthApiError rather than a parser exception.
  }

  return null;
}

async function request(path, options = {}) {
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
    throw new AuthApiError(
      'Не удалось связаться с сервисом авторизации. Проверь соединение.',
      { cause: error }
    );
  }

  const data = await readResponseData(response);
  if (!response.ok) {
    const code = data?.error;
    throw new AuthApiError(messageForResponse(code, response.status), {
      status: response.status,
      code,
    });
  }

  if (data === null && response.status !== 204) {
    throw new AuthApiError('Сервис авторизации вернул некорректный ответ.', {
      status: response.status,
      code: 'invalid_auth_response',
    });
  }

  return data;
}

export async function getCurrentUser({ signal } = {}) {
  const data = await request('/me', { signal });
  return data?.user ?? null;
}

export async function requestMagicLink({ email }) {
  return request('/magic-link/request', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function exchangeMagicLink({ token }) {
  const data = await request('/magic-link/exchange', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  return data;
}

export async function logout() {
  await request('/logout', { method: 'POST' });
}

export function getAuthErrorMessage(error, context = 'generic') {
  if (!error) return '';

  if (!(error instanceof AuthApiError)) {
    return context === 'logout'
      ? 'Не удалось завершить сессию. Попробуй ещё раз.'
      : 'Не удалось выполнить запрос авторизации.';
  }

  if (context === 'bootstrap' && error.status === 401) {
    return '';
  }

  return error.message;
}
