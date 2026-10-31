'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const { pool } = require('../db');
const config = require('../config');
const S = require('../schemas');
const { HttpError } = require('../domain/rules');
const { wrap } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const { sign, authenticate } = require('../middleware/auth');
const { withTx, audit } = require('../services/lifecycle');
const { sendMail } = require('../mailer');

const router = express.Router();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // equalises timing for unknown emails

// Public sign-up always creates a CUSTOMER (never staff/admin) plus its customer profile.
router.post('/signup', validate(S.signup), wrap(async (req, res) => {
  const { name, email, password } = req.valid.body;
  const hash = await bcrypt.hash(password, 10);
  const out = await withTx(pool, async (c) => {
    const { rows: [u] } = await c.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'customer') RETURNING id, name, email, role`, [name, email, hash]);
    const { rows: [cu] } = await c.query('INSERT INTO customers (user_id, name) VALUES ($1,$2) RETURNING id', [u.id, name]);
    await audit(c, u.id, 'user', u.id, 'signup');
    return { user: u, customerId: cu.id };
  });
  res.status(201).json({ token: sign(out.user, out.customerId), user: out.user });
}));

router.post('/login', validate(S.login), wrap(async (req, res) => {
  const { email, password } = req.valid.body;
  const { rows: [u] } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.password_hash, u.is_active, c.id AS customer_id
       FROM users u LEFT JOIN customers c ON c.user_id = u.id WHERE lower(u.email) = $1`, [email]);
  const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);
  if (!u || !ok || !u.is_active) throw new HttpError(401, 'Incorrect email or password');
  res.json({ token: sign(u, u.customer_id), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
}));

// Always answers 200 so the endpoint cannot be used to discover which emails are registered.
router.post('/forgot-password', validate(S.forgot), wrap(async (req, res) => {
  const { email } = req.valid.body;
  const { rows: [u] } = await pool.query('SELECT id FROM users WHERE lower(email) = $1 AND is_active', [email]);
  if (u) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(`UPDATE users SET reset_token_hash = $2, reset_expires = now() + interval '1 hour' WHERE id = $1`, [u.id, sha(token)]);
    await sendMail({ to: email, subject: 'Reset your Brightloop password',
      text: `Use this link within one hour to choose a new password:\n${config.appUrl}/reset-password?token=${token}` });
  }
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
}));

router.post('/reset-password', validate(S.reset), wrap(async (req, res) => {
  const { token, password } = req.valid.body;
  const hash = await bcrypt.hash(password, 10);
  const { rowCount } = await pool.query(
    `UPDATE users SET password_hash = $2, reset_token_hash = NULL, reset_expires = NULL
      WHERE reset_token_hash = $1 AND reset_expires > now()`, [sha(token), hash]);
  if (!rowCount) throw new HttpError(400, 'This reset link is invalid or has expired');
  res.json({ message: 'Password updated. You can now sign in.' });
}));

router.get('/me', authenticate, wrap(async (req, res) => {
  const { rows: [u] } = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: u, customerId: req.user.customerId });
}));

module.exports = router;
