const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const clients = new Map();

export function csvLookupRateLimit(req, res, next) {
  // Do not trust X-Forwarded-For; req.ip uses Express's configured proxy policy.
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  if (clients.size > 1000) {
    for (const [k, v] of clients) {
      if (now >= v.resetAt) clients.delete(k);
    }
  }
  let entry = clients.get(key);
  if (!entry || now >= entry.resetAt) entry = { count: 0, resetAt: now + WINDOW_MS };
  entry.count += 1;
  clients.set(key, entry);
  if (entry.count > MAX_REQUESTS) return res.status(429).json({ success: false, message: 'Too many lookup requests. Try again shortly.' });
  return next();
}
