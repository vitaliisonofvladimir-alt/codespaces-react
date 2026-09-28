const PRODUCTION_API_ORIGIN = 'https://api.nvvai.site';
const STAGING_API_ORIGIN = 'https://staging-api.nvvai.site';

function apiOrigin() {
  const mode = import.meta.env?.MODE ?? '';
  const configured = (import.meta.env?.VITE_AUTH_API_BASE_URL ?? '').replace(/\/$/, '');
  return mode === 'staging' ? STAGING_API_ORIGIN : configured || PRODUCTION_API_ORIGIN;
}

async function request(path, options = {}) {
  const response = await fetch(`${apiOrigin()}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || 'Не удалось выполнить запрос.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const listServices = () => request('/v1/services').then((data) => data.services || []);
export const createService = (input) => request('/v1/services', { method: 'POST', body: JSON.stringify(input) }).then((data) => data.service);
export const updateService = (id, input) => request(`/v1/services/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }).then((data) => data.service);
export const deleteService = (id) => request(`/v1/services/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const listKnowledge = () => request('/v1/knowledge-base').then((data) => data.items || []);
export const createKnowledge = (input) => request('/v1/knowledge-base', { method: 'POST', body: JSON.stringify(input) }).then((data) => data.item);
export const updateKnowledge = (id, input) => request(`/v1/knowledge-base/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }).then((data) => data.item);
export const deleteKnowledge = (id) => request(`/v1/knowledge-base/${encodeURIComponent(id)}`, { method: 'DELETE' });
