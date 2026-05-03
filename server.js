import express from "express";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import config from "./src/config.js";
import { connectRedis, disconnectRedis } from "./src/redis.js";
import authRouter, { initAuth } from "./src/auth.js";
import { initSocket } from "./src/socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { pub, sub } = await connectRedis();

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(rateLimit({ windowMs: config.httpRateLimitWindow, max: config.httpRateLimitMax }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

await initAuth();
app.use("/auth", authRouter);

const io = initSocket(httpServer, pub, sub);

httpServer.listen(config.port, () =>
  console.log(`[server] http://localhost:${config.port}`),
);

async function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down`);
  io.close();
  httpServer.close();
  await disconnectRedis();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
