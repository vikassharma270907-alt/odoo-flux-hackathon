'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../db');
const { HttpError } = require('../domain/rules');

const sign = (user, customerId = null) =>
  jwt.sign({ sub: user.id, role: user.role, cid: customerId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Verifies the JWT, then confirms the account still exists and is active on every request,
// so deactivating a user takes effect immediately instead of waiting for the token to expire.
// The lookup is a single primary-key read (sub-millisecond) so it does not affect list timings.
async function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next(new HttpError(401, 'Authentication required'));
  let p;
  try {
    p = jwt.verify(h.slice(7), config.jwtSecret);
  } catch { return next(new HttpError(401, 'Invalid or expired token')); }
  try {
    const { rows: [u] } = await pool.query('SELECT is_active FROM users WHERE id = $1', [p.sub]);
    if (!u || !u.is_active) return next(new HttpError(401, 'This account is no longer active'));
    req.user = { id: p.sub, role: p.role, customerId: p.cid };
    return next();
  } catch (err) { return next(err); }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role) ? next() : next(new HttpError(403, 'You do not have permission to do this'));

/** Customers are pinned to their own customer id; admin/staff see everything (null = no restriction). */
const ownerScope = (req) => (req.user.role === 'customer' ? (req.user.customerId || -1) : null);

module.exports = { sign, authenticate, requireRole, ownerScope };
