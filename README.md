# codespaces-react

React + Vite project configured for GitHub Codespaces with automated CI checks and dependency updates.

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

## Cloudflare Workers

The production Worker serves the Vite build from `dist` and handles
`/api/chat`, `/api/agent`, and `/api/transcribe`. The OpenAI key remains a
server-side Cloudflare secret.

Add the secret once from an authenticated terminal:

```bash
npx wrangler secret put OPENAI_API_KEY
```

This command securely uploads the value to Cloudflare; it does not write the
key to the repository. For local Wrangler development, copy
`.dev.vars.example` to `.dev.vars` and replace the placeholder.

Build and deploy:

```bash
npm run deploy
```
