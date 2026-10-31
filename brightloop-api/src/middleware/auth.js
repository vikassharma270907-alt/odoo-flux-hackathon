'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../domain/rules');

const sign = (user, customerId = null) =>
  jwt.sign({ sub: user.id, role: user.role, cid: customerId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

function authenticate(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next(new HttpError(401, 'Authentication required'));
  try {
    const p = jwt.verify(h.slice(7), config.jwtSecret);
    req.user = { id: p.sub, role: p.role, customerId: p.cid };
    return next();
  } catch { return next(new HttpError(401, 'Invalid or expired token')); }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role) ? next() : next(new HttpError(403, 'You do not have permission to do this'));

/** Customers are pinned to their own customer id; admin/staff see everything (null = no restriction). */
const ownerScope = (req) => (req.user.role === 'customer' ? (req.user.customerId || -1) : null);

module.exports = { sign, authenticate, requireRole, ownerScope };
