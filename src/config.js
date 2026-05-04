import "dotenv/config";
import { z } from "zod";

/** Define expected environment variables with Zod */
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  STORE: z.enum(["memory", "redis"]).default("memory"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  OIDC_ISSUER_URL: z.string().url().min(1),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_REDIRECT_URI: z.string().url().min(1),
  JWT_SECRET: z.string().min(10).default("change-me"),
  JWT_EXPIRES_IN: z.string().default("1h"),
});

// Parse and validate the environment variables
const env = envSchema.parse(process.env);

/** Central configuration — all env vars read in one place. */
const config = {
  port: env.PORT,
  store: env.STORE,
  redisUrl: env.REDIS_URL,

  // OIDC (General Auth Service)
  oidcIssuerUrl: env.OIDC_ISSUER_URL,
  oidcClientId: env.OIDC_CLIENT_ID,
  oidcClientSecret: env.OIDC_CLIENT_SECRET,
  oidcRedirectUri: env.OIDC_REDIRECT_URI,

  // JWT session signing
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,

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
