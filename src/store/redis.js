/**
 * Redis-backed checkbox store.
 * Uses a single hash key "checkboxes" for all state.
 */

import { createClient } from "ioredis";
import config from "../config.js";

let pub = null;
let sub = null;

export async function connect() {
  pub = new createClient(config.redisUrl);
  sub = pub.duplicate();
  await Promise.all([
    new Promise((res, rej) => { pub.on("ready", res); pub.on("error", rej); }),
    new Promise((res, rej) => { sub.on("ready", res); sub.on("error", rej); }),
  ]);
  console.log("[store:redis] connected");
  return { pub, sub };
}

export async function disconnect() {
  if (pub) pub.disconnect();
  if (sub) sub.disconnect();
}

export function getPub() { return pub; }
export function getSub() { return sub; }

export async function get(id) {
  const raw = await pub.hget("checkboxes", String(id));
  return raw ? JSON.parse(raw) : null;
}

export async function set(id, state, ts) {
  await pub.hset("checkboxes", String(id), JSON.stringify({ state, ts }));
}

export async function getAll() {
  const raw = await pub.hgetall("checkboxes");
  if (!raw) return {};
  return Object.fromEntries(
    Object.entries(raw).map(([id, v]) => [id, JSON.parse(v)])
  );
}
