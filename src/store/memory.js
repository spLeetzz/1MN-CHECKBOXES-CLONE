/**
 * In-memory checkbox store.
 * Simple Map-backed storage — no external dependencies.
 */

const data = new Map(); // id → { state, ts }

export function get(id) {
  return data.get(id) ?? null;
}

export function set(id, state, ts) {
  data.set(id, { state, ts });
}

export function getAll() {
  const out = {};
  for (const [id, val] of data) out[id] = val;
  return out;
}

export async function connect() {}
export async function disconnect() {}
