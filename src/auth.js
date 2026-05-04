/**
 * Authentication routes — uses the General Auth Service OIDC SDK.
 *
 * GET  /auth/login    → redirect to auth service
 * GET  /auth/callback → exchange code, mint local JWT, redirect to /
 * GET  /auth/me       → return current user info from JWT
 */

import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "./config.js";
import { OIDCClient } from "./oidc-client.js";

const router = Router();
let oidcClient = null;

export function initAuth() {
  oidcClient = new OIDCClient({
    issuerUrl: config.oidcIssuerUrl,
    clientId: config.oidcClientId,
    clientSecret: config.oidcClientSecret,
    redirectUri: config.oidcRedirectUri,
  });
  console.log("[auth] OIDC client initialized");
}

// Redirect user to auth service login
router.get("/login", (_req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  const url = oidcClient.getAuthorizationUrl(state, ["openid", "profile", "email"]);
  res.redirect(url);
});

// Auth service redirects back here with ?code=...&state=...
router.get("/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing authorization code");

    const tokenData = await oidcClient.exchangeCodeForToken(code);
    const userInfo = await oidcClient.getUserInfo(tokenData.access_token);

    // Mint our own short-lived JWT for socket auth
    const token = jwt.sign(
      { sub: userInfo.sub, email: userInfo.email, name: userInfo.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Send token to client via a small page that stores it and redirects HOME
    res.send(`<!DOCTYPE html>
<html><head><title>Logging in...</title></head>
<body>
<script>
  localStorage.setItem("token", ${JSON.stringify(token)});
  window.location.href = "/";
</script>
</body></html>`);
  } catch (err) {
    console.error("[auth] callback error:", err.message);
    res.status(401).send("Authentication failed");
  }
});

// Return current user info (called by frontend)
router.get("/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
  try {
    const user = jwt.verify(auth.slice(7), config.jwtSecret);
    res.json({ sub: user.sub, email: user.email, name: user.name });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
