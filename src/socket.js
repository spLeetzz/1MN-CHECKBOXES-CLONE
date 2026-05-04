// Socket sync

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import config from "./config.js";
import * as store from "./store/index.js";

// Per-user rate limiting
const updateCounts = new Map();
setInterval(() => updateCounts.clear(), config.socketUpdateWindow);

// Batched broadcasts
const pendingBatch = {};

export function initSocket(httpServer) {
  const io = new Server(httpServer);

  // Redis adapter
  const pub = store.getPub();
  const sub = store.getSub();
  if (pub && sub) {
    io.adapter(createAdapter(pub, sub));
    console.log("[socket] redis adapter attached");
  }

  // JWT auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      socket.user = jwt.verify(token, config.jwtSecret);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    console.log(`[socket] connect: ${socket.user.email}`);

    // Send full state on join
    const full = await store.getAll();
    socket.emit("state:full", full);

    socket.on("checkbox:update", async (id, newState) => {
      const userId = socket.user.sub;
      const count = (updateCounts.get(userId) ?? 0) + 1;
      if (count > config.socketUpdateLimit) return; // silently drop
      updateCounts.set(userId, count);

      const ts = Date.now();

      // Reject stale writes
      const existing = await store.get(id);
      if (existing && ts < existing.ts) return;

      await store.set(id, newState, ts);
      pendingBatch[id] = { state: newState, ts };
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnect: ${socket.user.email}`);
    });
  });

  // Flush batched updates to all clients
  setInterval(() => {
    const keys = Object.keys(pendingBatch);
    if (!keys.length) return;
    const flush = Object.fromEntries(keys.map((k) => [k, pendingBatch[k]]));
    keys.forEach((k) => delete pendingBatch[k]);
    io.emit("batch:update", flush);
  }, config.batchIntervalMs);

  return io;
}
