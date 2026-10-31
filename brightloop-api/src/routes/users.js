'use strict';
const bcrypt = require('bcryptjs');
const express = require('express');
const { pool } = require('../db');
const S = require('../schemas');
const { wrap } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');
const { withTx, audit } = require('../services/lifecycle');

const router = express.Router();
router.use(requireRole('admin')); // only the admin manages staff

router.post('/staff', validate(S.createStaff), wrap(async (req, res) => {
  const { name, email, password } = req.valid.body;
  const hash = await bcrypt.hash(password, 10);
  const user = await withTx(pool, async (c) => {
    const { rows: [u] } = await c.query(
      `INSERT INTO users (name, email, password_hash, role, created_by) VALUES ($1,$2,$3,'staff',$4) RETURNING id, name, email, role, created_at`,
      [name, email, hash, req.user.id]);
    await audit(c, req.user.id, 'user', u.id, 'staff-created');
    return u;
  });
  res.status(201).json(user);
}));

router.get('/', validate(S.pageOnly, 'query'), wrap(async (req, res) => {
  const { page, limit } = req.valid.query;
  const { rows } = await pool.query(
    `SELECT id, name, email, role, is_active, created_at, count(*) OVER() AS total_rows FROM users ORDER BY id LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]);
  res.json(require('../util').pageResult(rows, { page, limit }));
}));

router.patch('/:id/active', validate(S.active), wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(409).json({ error: 'You cannot deactivate your own account' });
  const { rows: [u] } = await pool.query('UPDATE users SET is_active = $2 WHERE id = $1 RETURNING id, name, email, role, is_active', [id, req.valid.body.is_active]);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(u);
}));

module.exports = router;
