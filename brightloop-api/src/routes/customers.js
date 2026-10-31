'use strict';
const express = require('express');
const { pool } = require('../db');
const S = require('../schemas');
const { wrap } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');
const { paging, builder, pageResult } = require('../util');

const router = express.Router();
router.use(requireRole('admin', 'staff'));

router.get('/', validate(S.custList, 'query'), wrap(async (req, res) => {
  const q = req.valid.query; const p = paging(q); const b = builder();
  if (q.q) { const ref = b.ref(`%${q.q}%`); b.raw(`(name ILIKE ${ref} OR company ILIKE ${ref})`); }
  const lim = b.ref(p.limit); const off = b.ref(p.offset);
  const { rows } = await pool.query(
    `SELECT id, name, company, phone, count(*) OVER() AS total_rows FROM customers ${b.where()} ORDER BY name LIMIT ${lim} OFFSET ${off}`, b.params);
  res.json(pageResult(rows, p));
}));

router.post('/', validate(S.customer), wrap(async (req, res) => {
  const c = req.valid.body;
  const { rows: [r] } = await pool.query(
    'INSERT INTO customers (name, company, phone, address, tax_no) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [c.name, c.company || null, c.phone || null, c.address || null, c.tax_no || null]);
  res.status(201).json(r);
}));

module.exports = router;
