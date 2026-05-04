#!/usr/bin/env node

/**
 * Registers the 1M Checkbox app as an OIDC client on the General Auth Service.
 *
 * Usage:
 *   1. Start the General Auth Service on port 3000
 *   2. Login/signup at http://localhost:3000/authorize/login  (get a session)
 *   3. Run:  node scripts/register-client.mjs
 *
 * It will output the client_id and client_secret to paste into your .env
 */

const AUTH_BASE = process.env.AUTH_BASE || "http://localhost:3000";
const CHECKBOX_PORT = process.env.CHECKBOX_PORT || "4000";
const REDIRECT_URI = `http://localhost:${CHECKBOX_PORT}/auth/callback`;

// You need to be logged in first — get a session cookie or a bearer token.
// Easiest: pass a bearer token via AUTH_TOKEN env var.
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error(`
  ┌─────────────────────────────────────────────────────────────┐
  │  You need to provide an AUTH_TOKEN to register a client.   │
  │                                                             │
  │  1. Login at ${AUTH_BASE}/authorize/login                   │
  │  2. Get a token from the dashboard or API                  │
  │  3. Run:                                                    │
  │     AUTH_TOKEN=<your-token> node scripts/register-client.mjs│
  └─────────────────────────────────────────────────────────────┘
  `);
  process.exit(1);
}

const res = await fetch(`${AUTH_BASE}/api/me/clients`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AUTH_TOKEN}`,
  },
  body: JSON.stringify({
    name: "1M Checkbox",
    redirectUris: [REDIRECT_URI],
    pkceRequired: false,
  }),
});

if (!res.ok) {
  console.error("Failed to register client:", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();

console.log(`
✅ Client registered successfully!

Add these to your .env file:

OIDC_ISSUER_URL=${AUTH_BASE}
OIDC_CLIENT_ID=${data.client_id}
OIDC_CLIENT_SECRET=${data.client_secret}
OIDC_REDIRECT_URI=${REDIRECT_URI}
`);
