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

import "dotenv/config";
import fetch from "node-fetch";

// We read these from your .env file now!
const AUTH_BASE = process.env.OIDC_ISSUER_URL || "http://localhost:3000";
const REDIRECT_URI = process.env.OIDC_REDIRECT_URI || "http://localhost:4000/auth/callback";

// You need to be logged in first — get a session cookie or a bearer token.
// Easiest: pass a bearer token via AUTH_TOKEN env var.
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error(`
❌ ERROR: Missing AUTH_TOKEN.

How to run:
1. Login to your auth service in the browser
2. Go to /api/me and copy the 'id'
3. Or generate a token from your auth dashboard if you have one.
4. Run: AUTH_TOKEN=<your-token> node scripts/register-client.mjs
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
