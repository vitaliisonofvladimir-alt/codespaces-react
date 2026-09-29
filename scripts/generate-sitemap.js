import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { publicRoutes } from '../src/publicRoutes.js';

const origin = 'https://nvvai.site';
const sitemapPath = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url));

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

const entries = publicRoutes.map((path) => {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('?') || path.includes('#')) {
    throw new Error(`Invalid public route: ${path}`);
  }
  return `  <url><loc>${escapeXml(new URL(path, origin).href)}</loc></url>`;
});

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries,
  '</urlset>',
  '',
].join('\n');

await writeFile(sitemapPath, sitemap);
