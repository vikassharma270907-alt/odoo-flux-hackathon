'use strict';
const { ZodError } = require('zod');
const { HttpError } = require('../domain/rules');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const notFound = (req, res) => res.status(404).json({ error: 'Route not found' });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  if (err.code === '23505') {
    const msg = err.constraint === 'users_email_uq' ? 'This email is already registered' : 'Duplicate value';
    return res.status(409).json({ error: msg });
  }
  if (err.code === '23503' || err.code === '23514') return res.status(400).json({ error: 'Constraint violated', details: err.detail || err.message });
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
module.exports = { wrap, notFound, errorHandler };
