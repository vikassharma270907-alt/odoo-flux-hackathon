'use strict';
const express = require('express');
const { pool } = require('../db');
const S = require('../schemas');
const { wrap } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');
const { recordPayment } = require('../services/lifecycle');
const { paging, builder, pageResult } = require('../util');

const router = express.Router();
router.use(requireRole('admin', 'staff'));

router.post('/', validate(S.payment), wrap(async (req, res) => {
  const b = req.valid.body;
  const out = await recordPayment(pool, { invoiceId: b.invoice_id, method: b.method, amount: b.amount, paidOn: b.paid_on, note: b.note, userId: req.user.id });
  res.status(201).json(out);
}));

router.get('/', validate(S.payList, 'query'), wrap(async (req, res) => {
  const q = req.valid.query; const p = paging(q); const b = builder();
  if (q.invoice_id) b.add('p.invoice_id = ?', q.invoice_id);
  if (q.method) b.add('p.method = ?', q.method);
  if (q.from) b.add('p.paid_on >= ?', q.from);
  if (q.to) b.add('p.paid_on <= ?', q.to);
  const lim = b.ref(p.limit); const off = b.ref(p.offset);
  const { rows } = await pool.query(
    `SELECT p.id, p.invoice_id, i.number AS invoice_number, p.method, p.amount, p.paid_on, p.note, count(*) OVER() AS total_rows
       FROM payments p JOIN invoices i ON i.id = p.invoice_id ${b.where()} ORDER BY p.paid_on DESC, p.id DESC LIMIT ${lim} OFFSET ${off}`, b.params);
  res.json(pageResult(rows, p));
}));

module.exports = router;
