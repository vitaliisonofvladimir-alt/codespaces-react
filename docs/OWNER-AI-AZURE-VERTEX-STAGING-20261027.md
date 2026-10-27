# NVVAI Owner assistant provider migration

Scope: only Cloudflare staging Worker owner chat/agent API, not public HVAC demo, production or Factory.

- Default provider Microsoft Azure AI Foundry. Secret binding `AZURE_AI_API_KEY`. Optional `AZURE_AI_ENDPOINT` and `AZURE_AI_MODEL`; default verified Azure resource is
  `https://agentdock-ai-resource.services.ai.azure.com/openai/v1/responses`, model `gpt-4.1-mini`.
- Optional Google Vertex AI path through NVVAI's private VPS LiteLLM gateway, keeping Google ADC on the VPS: `VERTEX_AI_GATEWAY_URL`, `VERTEX_AI_GATEWAY_KEY` (secret), `VERTEX_AI_MODEL`. Optional `AI_PROVIDER=vertex`; automatic fallback requires all three bindings and only occurs for Azure HTTP 429 or 5xx.
- Current verified Cloudflare staging Worker bindings are **ASSETS only**. No provider secrets are configured or copied.
- Before staging deploy, authorize and install the Azure secret binding securely, record current Worker deployment ID as rollback target, then test under Cloudflare Access as Owner with a non-sensitive question.
- Do not add provider keys to repository, public `VITE_*` variables, logs or chat. Do not merge to production automatically.
- Existing audio transcription and local Node server still use a separate legacy path, not covered by this isolated Worker chat PR; do not claim they have been migrated.
- Tenant isolation and production E2E gates remain independent.
