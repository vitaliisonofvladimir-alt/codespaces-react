# NVVAI auth.md

## Audience and supported access methods

This document is for agents discovering the public NVVAI APIs and agents assisting an existing workspace member with owner-app access.

- Public site APIs: anonymous access without registration or credentials.
- Owner app: human-assisted email magic-link sign-in, issuing a server-side session cookie for an existing member.

NVVAI does not currently offer automated agent account registration, agent API keys, OAuth bearer tokens, ID-JAG exchange, or an anonymous registration-and-claim flow. Workspace membership is provisioned by the service operator; there is no public account-provisioning endpoint.

## Discover the public APIs

Read the [API catalog](https://nvvai.site/.well-known/api-catalog), [OpenAPI specification](https://nvvai.site/openapi.json), and [API documentation](https://nvvai.site/api-docs).

The public endpoints are `POST https://nvvai.site/api/chat`, `POST https://nvvai.site/api/agent`, and `POST https://nvvai.site/api/transcribe`. They do not issue credentials. Do not send an Authorization header or owner-session cookie to these endpoints.

## Owner-session credential provisioning

The user must already be an active member of the intended workspace. Use the [owner app](https://app.nvvai.site/) for the user-assisted sign-in flow. The application uses these endpoints on `https://api.nvvai.site`:

1. `POST /v1/auth/magic-link/request` with `Content-Type: application/json` and `{"email":"member@example.com"}` requests a one-time sign-in link. This may send email; perform it only when the user asks to sign in, never during passive discovery.
2. The user opens their email link. `POST /v1/auth/magic-link/exchange` with `{"token":"<one-time-token>"}` exchanges its token for a Secure, HttpOnly session cookie. The token is a secret and must not be logged or shared.
3. `GET /v1/auth/me` with the session cookie checks the current user. HTTP 401 means a valid owner session is required.
4. `POST /v1/auth/logout` with the session cookie ends the session.

These endpoints authenticate existing members; requesting a magic link does not register an agent or create a workspace membership.

## Credential use and recovery

The owner app sends credentialed requests with `credentials: include`. Its HttpOnly cookie is managed by the browser; it is not a bearer access token or an API key. Preserve the authorized user session and intended workspace context. Do not copy cookies into public API requests or attempt to access another workspace.

If the session expires, return to the user-assisted sign-in flow. If the user has no workspace membership, operator provisioning is required before sign-in can grant access. No public credential-claim, token-exchange, or agent-revocation endpoint is advertised.

## OAuth discovery

OAuth Protected Resource Metadata and OAuth Authorization Server metadata are not available for these access methods. No OAuth issuer, authorization server, or scopes are advertised by this document.
