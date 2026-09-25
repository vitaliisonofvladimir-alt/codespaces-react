# codespaces-react

React + Vite project configured for GitHub Codespaces with automated CI checks and dependency updates.

## Public HVAC demo route

The frontend includes an explicitly labeled public HVAC demonstration at
`/demo/hvac`. This route bypasses owner authentication and is not enabled as a
production or staging hostname by the code change alone.

The form remains unavailable until both public build-time settings are supplied:

- For an approved demo-origin build, `VITE_PUBLIC_LEADS_API_BASE_URL` must be
  exactly `https://demo-api.nvvai.site`. For a staging-origin build, the only
  accepted value is `https://staging-api.nvvai.site`.
- `VITE_PUBLIC_HVAC_TURNSTILE_SITE_KEY`: Cloudflare Turnstile **site key**,
  restricted in Cloudflare to the demo hostname.

The Turnstile **secret key** belongs only in the backend secret store. Never
put it in a `VITE_*` variable, frontend source, Git, or a browser. The backend
must separately have the public-intake flag enabled, migration
`0008_public_lead_preferred_time` applied, and
`NVVAI_CORS_ALLOWED_ORIGINS` restricted to the exact demo origin before this
form can accept requests. This PR does not perform those setup or activation
actions.

## 🚀 Tech Stack

- React 18
- Vite
- JavaScript
- Vitest
- GitHub Codespaces
- GitHub Actions
- Dependabot

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/vitaliisonofvladimir-alt/codespaces-react.git
cd codespaces-react
npm install
cp .env.example .env.local
```

Replace the placeholder in `.env.local` with an OpenAI API key. Do not put the
key in a `VITE_*` variable: Vite exposes those values to the browser.

Start the frontend and the local API server together:

```bash
npm start
```

Then open <http://localhost:3000>. The browser sends `/api/chat` requests to
Vite, which proxies them to the local Node API at `127.0.0.1:8787`; only that
server calls the OpenAI Responses API.

## NVVAI authentication UI

The application shell uses the owner-only, passwordless magic-link flow:

- `GET /v1/auth/me` restores the server-side session on first load;
- `POST /v1/auth/magic-link/request` requests a one-time email link;
- `POST /v1/auth/magic-link/exchange` exchanges its token for a Secure,
  HttpOnly session cookie;
- `POST /v1/auth/logout` ends the session.

For the dedicated staging build, run `npm run build:staging`; both clients use
the fixed `https://staging-api.nvvai.site` origin in staging mode. Staging mode
ignores browser-provided API-origin overrides. The staging API allowlist must contain only
`https://staging-app.nvvai.site` and must support credentialed requests and
preflight. Do not put Cloudflare Access Service Tokens, or any other
credentials, into `VITE_*` variables: those values are shipped to the browser.

The API resolves tenant identity from the server-side `Host`; the staging
Tunnel must preserve the configured staging tenant Host. This code change does
not modify DNS, Cloudflare Access, Tunnel routing, deployment, or production.

## Cloudflare Workers

The production Worker serves the Vite build from `dist` and handles
`/api/chat`, `/api/agent`, and `/api/transcribe`. The OpenAI key remains a
server-side Cloudflare secret.

Add the chat secret once from an authenticated terminal:

```bash
npx wrangler secret put OPENAI_API_KEY
```

This command securely uploads the value to Cloudflare; it does not write the
key to the repository. For local Wrangler development, copy
`.dev.vars.example` to `.dev.vars` and replace the placeholder.

### Public HVAC demo prerequisites

The public route at `/demo/hvac` is independent of owner login. The client
deliberately accepts only these API-origin pairs:

| Browser host | API origin |
| --- | --- |
| `demo.nvvai.site` | `https://demo-api.nvvai.site` |
| `staging-app.nvvai.site` | `https://staging-api.nvvai.site` |
| `localhost` / `127.0.0.1` | Local development API (HTTP allowed) |

The Turnstile **site key** is public and restricted to the chosen demo hostname;
the Turnstile **secret key** is backend-only. Keep the server-side verification
secret out of `VITE_*`, browser bundles, and Git. The server API must separately
have `NVVAI_ENABLE_PUBLIC_LEAD_INTAKE=1`, migration
`0008_public_lead_preferred_time` applied, and
`NVVAI_CORS_ALLOWED_ORIGINS` set to the exact public frontend origin. No flag,
database migration, DNS, Cloudflare, or runtime change is performed by this
frontend PR.

Build and deploy the production Worker (deployment is a separate, explicitly
approved action):

```bash
npm run deploy
```
