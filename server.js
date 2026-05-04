import express from "express";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import config from "./src/config.js";
import * as store from "./src/store/index.js";
import authRouter, { initAuth } from "./src/auth.js";
import { initSocket } from "./src/socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Connect store (redis or memory — no-op for memory)
await store.connect();

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(rateLimit({ windowMs: config.httpRateLimitWindow, max: config.httpRateLimitMax }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Auth routes
initAuth();
app.use("/auth", authRouter);

// Socket.IO
const io = initSocket(httpServer);

httpServer.listen(config.port, () =>
  console.log(`[server] http://localhost:${config.port}  (store: ${config.store})`),
);

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down`);
  io.close();
  httpServer.close();
  await store.disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
