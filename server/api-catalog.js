const origin = 'https://nvvai.site';
const spec = `${origin}/openapi.json`;
const docs = `${origin}/api-docs.html`;

export const apiCatalog = {
  linkset: ['/api/chat', '/api/agent', '/api/transcribe'].map((path) => ({
    anchor: `${origin}${path}`,
    'service-desc': [{ href: spec, type: 'application/json' }],
    'service-doc': [{ href: docs, type: 'text/html' }],
  })),
};

export function catalogResponse({ head = false } = {}) {
  return new Response(head ? null : JSON.stringify(apiCatalog), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
      'Cache-Control': 'public, max-age=300',
      'Link': `<${origin}/.well-known/api-catalog>; rel="api-catalog"`,
    },
  });
}
