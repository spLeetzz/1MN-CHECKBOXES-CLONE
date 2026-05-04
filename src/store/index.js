/**
 * Store factory — returns the right backend based on config.store.
 * Both backends expose: connect(), disconnect(), get(id), set(id, state, ts), getAll()
 */

import config from "../config.js";

let store;

if (config.store === "redis") {
  store = await import("./redis.js");
} else {
  store = await import("./memory.js");
}

console.log(`[store] using "${config.store}" backend`);

export const { connect, disconnect, get, set, getAll } = store;

// Redis-only: expose pub/sub clients for socket.io adapter
export const getPub = store.getPub ?? (() => null);
export const getSub = store.getSub ?? (() => null);
