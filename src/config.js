/** Central configuration — all env vars read in one place. */

const config = {
  port: Number(process.env.PORT) || 3000,

  // Which storage backend: "redis" or "memory"
  store: (process.env.STORE || "memory").toLowerCase(),

  // Redis (only needed when STORE=redis)
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // OIDC (General Auth Service)
  oidcIssuerUrl: process.env.OIDC_ISSUER_URL || "",
  oidcClientId: process.env.OIDC_CLIENT_ID || "",
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET || "",
  oidcRedirectUri: process.env.OIDC_REDIRECT_URI || "",

  // JWT session signing
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h",

  // Rate limits
  httpRateLimitWindow: 60_000,
  httpRateLimitMax: 100,
  socketUpdateLimit: 50,       // max checkbox updates per user per 10s
  socketUpdateWindow: 10_000,

  // Grid
  totalCheckboxes: 1_000_000,
  batchIntervalMs: 100,
};

export default config;
