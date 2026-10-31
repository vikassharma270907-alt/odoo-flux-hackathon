'use strict';
const { HttpError } = require('../domain/rules');

/**
 * Tiny in-memory fixed-window rate limiter. No external dependency, which keeps the
 * stack lean for the hackathon. It is per-process (fine for a single API instance);
 * a multi-instance deployment would move this to Redis.
 *
 *   rateLimit({ windowMs, max, keyName })
 *     windowMs  size of the window in milliseconds
 *     max       requests allowed per key per window
 *     keyName   optional body field to include in the key (e.g. 'email') so one
 *               attacker cannot lock out everyone sharing an IP, and vice versa
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, keyName = null } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  // Periodically drop expired buckets so the map cannot grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, windowMs);
  if (sweep.unref) sweep.unref(); // never keep the process alive just for the sweeper

  return function limiter(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const extra = keyName && req.body && req.body[keyName] ? String(req.body[keyName]).toLowerCase() : '';
    const key = `${ip}|${extra}`;
    const now = Date.now();

    let bucket = hits.get(key);
    if (!bucket || bucket.resetAt <= now) { bucket = { count: 0, resetAt: now + windowMs }; hits.set(key, bucket); }
    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retry = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retry));
      return next(new HttpError(429, `Too many attempts. Please try again in ${retry} second(s).`));
    }
    return next();
  };
}

module.exports = { rateLimit };
