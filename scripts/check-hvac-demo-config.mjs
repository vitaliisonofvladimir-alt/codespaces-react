import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_API_ORIGIN = 'https://demo-api.nvvai.site';

export function validateHvacDemoBuildEnv(env) {
  const errors = [];
  if (env.VITE_PUBLIC_LEADS_API_BASE_URL !== DEMO_API_ORIGIN) {
    errors.push('VITE_PUBLIC_LEADS_API_BASE_URL must be the approved demo API origin');
  }

  const siteKey = String(env.VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY ?? '').trim();
  if (
    !siteKey ||
    siteKey === 'sitekey-demo' ||
    /^[123]x00000000000000000000/.test(siteKey)
  ) {
    errors.push('VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY must be a real public Turnstile site key, not a placeholder or test key');
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateHvacDemoBuildEnv(process.env);
  if (errors.length) {
    for (const error of errors) console.error('HVAC demo build blocked: ' + error);
    process.exitCode = 1;
  } else {
    console.log('HVAC demo public build configuration validated.');
  }
}
