import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "ioredis";
import { Issuer } from "openid-client";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- CONFIG ----

const {
  PORT          = 3000,
  OIDC_ISSUER,        // e.g. https://accounts.google.com
  OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET,
  OIDC_REDIRECT_URI,  // e.g. http://localhost:3000/auth/callback
  JWT_SECRET,         // sign your own session tokens
  REDIS_URL = "redis://localhost:6379",
} = process.env;

// ---- REDIS ----

const pub = createClient({ lazyConnect: true, enableOfflineQueue: false });
const sub = pub.duplicate();
await pub.connect();
await sub.connect();

// ---- EXPRESS ----

const app        = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // index.html lives here

// basic rate limit on all HTTP routes
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// ---- OIDC ----

const issuer = await Issuer.discover(OIDC_ISSUER);
const oidcClient = new issuer.Client({
  client_id:                OIDC_CLIENT_ID,
  client_secret:            OIDC_CLIENT_SECRET,
  redirect_uris:            [OIDC_REDIRECT_URI],
  response_types:           ["code"],
});

// redirect to provider
app.get("/auth/login", (req, res) => {
  const url = oidcClient.authorizationUrl({
    scope: "openid email profile",
    state: crypto.randomUUID(),
  });
  res.redirect(url);
});

// provider redirects back here
app.get("/auth/callback", async (req, res) => {
  try {
    const params      = oidcClient.callbackParams(req);
    const tokenSet    = await oidcClient.callback(OIDC_REDIRECT_URI, params);
    const userinfo    = await oidcClient.userinfo(tokenSet.access_token);

    // mint a short-lived JWT the client will use for socket auth
    const token = jwt.sign(
      { sub: userinfo.sub, email: userinfo.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // send token to client — store in localStorage then redirect
    res.send(`
      <script>
        localStorage.setItem("token", ${JSON.stringify(token)});
        window.location.href = "/";
      </script>
    `);
  } catch (err) {
    console.error("Auth callback error:", err.message);
    res.status(401).send("Auth failed");
  }
});

// ---- SOCKET.IO ----

const io = new Server(httpServer);
io.adapter(createAdapter(pub, sub));

// auth middleware — runs before every connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token"));
  try {
    socket.user = jwt.verify(token, JWT_SECRET); // { sub, email }
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

// per-user rate limit for checkbox updates (server-side enforcement)
const updateCounts = new Map(); // userId → count this window
setInterval(() => updateCounts.clear(), 10_000); // reset every 10s
const UPDATE_LIMIT = 50; // max updates per user per 10s window

const pendingBatch = {}; // { checkboxId: { state, ts } }

io.on("connection", async (socket) => {
  console.log(`connect: ${socket.user.email}`);

  // send full state on join
  const raw = await pub.hgetall("checkboxes");
  const full = raw
    ? Object.fromEntries(Object.entries(raw).map(([id, v]) => [id, JSON.parse(v)]))
    : {};
  socket.emit("state:full", full);

  socket.on("checkbox:update", async (id, state) => {
    // rate limit
    const userId = socket.user.sub;
    const count  = (updateCounts.get(userId) ?? 0) + 1;
    if (count > UPDATE_LIMIT) return; // silently drop
    updateCounts.set(userId, count);

    const ts = Date.now();

    // reject stale writes
    const existing = await pub.hget("checkboxes", String(id));
    if (existing) {
      const parsed = JSON.parse(existing);
      if (ts < parsed.ts) return;
    }

    // persist to redis
    await pub.hset("checkboxes", String(id), JSON.stringify({ state, ts }));

    // accumulate in batch
    pendingBatch[id] = { state, ts };
  });

  socket.on("disconnect", () => {
    console.log(`disconnect: ${socket.user.email}`);
  });
});

// flush batch to all clients across all servers every 100ms
setInterval(() => {
  const keys = Object.keys(pendingBatch);
  if (!keys.length) return;
  const flush = Object.fromEntries(keys.map(k => [k, pendingBatch[k]]));
  keys.forEach(k => delete pendingBatch[k]);
  io.emit("batch:update", flush);
}, 100);

// ---- START ----

httpServer.listen(PORT, () => console.log(`http://localhost:${PORT}`));
