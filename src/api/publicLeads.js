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
  browserHostname = globalThis.location?.hostname?.toLowerCase(),
} = {}) {
  const origin = configuredOrigin.trim().replace(/\/+$/, '');
  if (!origin) {
    throw new PublicLeadApiError('The demo form is not connected yet.');
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new PublicLeadApiError('The demo form is not connected yet.');
  }

  const approvedDemoHosts = new Set([
    'demo.nvvai.site',
    'staging-app.nvvai.site',
    'localhost',
    '127.0.0.1',
  ]);
  const localHttp = ['localhost', '127.0.0.1'].includes(parsed.hostname);
  const allowedStagingApi =
    browserHostname === 'staging-app.nvvai.site' &&
    parsed.origin === 'https://staging-api.nvvai.site';
  if (
    (browserHostname && !approvedDemoHosts.has(browserHostname)) ||
    (!allowedStagingApi &&
      !localHttp &&
      !(
        browserHostname === 'demo.nvvai.site' &&
        parsed.origin === 'https://demo-api.nvvai.site'
      )) ||
    parsed.username ||
    parsed.password ||
    (parsed.protocol !== 'https:' && !(localHttp && parsed.protocol === 'http:'))
  ) {
    throw new PublicLeadApiError('The demo form is not connected yet.');
  }
  return `${origin}${PUBLIC_LEADS_PATH}`;
}

export async function submitPublicLead(input, idempotencyKey, options = {}) {
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16) {
    throw new PublicLeadApiError('Cannot submit the request securely.');
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
      throw new PublicLeadApiError('Could not send the request. Please try again.');
    }
    throw new PublicLeadApiError('Could not reach the demo service. Please try again.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new PublicLeadApiError('The demo service returned an unexpected response.');
  }

  if (!response.ok) {
    const messages = {
      invalid_human_verification: 'Security verification expired. Please complete it again.',
      idempotency_conflict: 'Request details changed. Please submit again.',
      rate_limited: 'Too many requests. Please try again later.',
      tenant_not_found: 'The demo company is temporarily unavailable.',
      public_intake_unavailable: 'The form is temporarily unavailable.',
      invalid_public_lead: 'Please check your name and contact details.',
    };
    throw new PublicLeadApiError(
      messages[data?.error] ?? 'Could not send the request. Please try again later.',
      { status: response.status, code: data?.error }
    );
  }

  if (!data?.lead?.id) {
    throw new PublicLeadApiError('The demo service returned an unexpected response.');
  }
  return data.lead;
}
