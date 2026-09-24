import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Wrangler deployment configuration', () => {
  it('publishes the Vite build as a single-page application', () => {
    expect(existsSync('wrangler.jsonc')).toBe(true);

    const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));

    expect(config.name).toBe('codespaces-react');
    expect(config.env.staging.name).toBe('codespaces-react-staging');
    expect(config.main).toBe('./server/worker.js');
    expect(config.assets).toMatchObject({
      directory: './dist',
      binding: 'ASSETS',
      not_found_handling: 'single-page-application',
      run_worker_first: ['/api/*'],
    });
  });

  it('provides a reproducible Cloudflare deployment command', () => {
    const packageJson = JSON.parse(
      readFileSync('package.json', 'utf8')
    );

    expect(packageJson.scripts.deploy).toBe(
      'npm run build && wrangler deploy'
    );
    expect(packageJson.devDependencies.wrangler).toBeTruthy();
  });
});
