// Simple fixed-window rate limiter, keyed per user + route.
// NOTE: this is in-memory, so it only limits per server instance. That's
// fine for a single-server / single-region deployment (e.g. one Vercel
// serverless region without heavy concurrency) but for a high-traffic,
// multi-instance deployment swap this for a shared store such as Upstash
// Redis (`@upstash/ratelimit`) — the call sites below don't need to change.
const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

export function rateLimit(key) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return { ok: true };
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return { ok: false };
  }
  return { ok: true };
}
