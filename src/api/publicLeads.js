const PUBLIC_LEADS_PATH = '/v1/public/leads';

export class PublicLeadApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'PublicLeadApiError';
    this.status = status;
    this.code = code;
  }
}

export function resolvePublicLeadsUrl({
  configuredOrigin = import.meta.env?.VITE_PUBLIC_LEADS_API_BASE_URL ?? '',
} = {}) {
  const origin = configuredOrigin.trim().replace(/\/+$/, '');
  if (!origin) {
    throw new PublicLeadApiError('Форма ещё не подключена к демо-сервису.');
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new PublicLeadApiError('Форма ещё не подключена к демо-сервису.');
  }

  const localHttp = ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if (parsed.username || parsed.password || (parsed.protocol !== 'https:' && !(localHttp && parsed.protocol === 'http:'))) {
    throw new PublicLeadApiError('Форма ещё не подключена к демо-сервису.');
  }
  return `${origin}${PUBLIC_LEADS_PATH}`;
}

export async function submitPublicLead(input, idempotencyKey, options = {}) {
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16) {
    throw new PublicLeadApiError('Не удалось безопасно отправить заявку.');
  }

  let response;
  try {
    response = await (options.fetchImpl ?? globalThis.fetch)(
      resolvePublicLeadsUrl(options),
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(input),
        signal: options.signal,
        credentials: 'omit',
      }
    );
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new PublicLeadApiError('Не удалось отправить заявку. Попробуй ещё раз.');
    }
    throw new PublicLeadApiError('Не удалось связаться с демо-сервисом. Попробуй ещё раз.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new PublicLeadApiError('Демо-сервис вернул неожиданный ответ.');
  }

  if (!response.ok) {
    const messages = {
      invalid_human_verification: 'Проверка безопасности истекла. Подтверди её ещё раз.',
      idempotency_conflict: 'Данные заявки изменились. Отправь форму ещё раз.',
      rate_limited: 'Слишком много заявок. Подожди немного и попробуй снова.',
      tenant_not_found: 'Демо-компания временно недоступна.',
      public_intake_unavailable: 'Форма временно недоступна. Попробуй позже.',
      invalid_public_lead: 'Проверь имя и контактные данные.',
    };
    throw new PublicLeadApiError(
      messages[data?.error] ?? 'Не удалось отправить заявку. Попробуй позже.',
      { status: response.status, code: data?.error }
    );
  }

  if (!data?.lead?.id) {
    throw new PublicLeadApiError('Демо-сервис вернул неожиданный ответ.');
  }
  return data.lead;
}
