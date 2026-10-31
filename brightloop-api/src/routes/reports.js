'use strict';
const express = require('express');
const { pool } = require('../db');
const S = require('../schemas');
const { wrap } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');
const { paging, pageResult, toCsv } = require('../util');

const router = express.Router();
router.use(requireRole('admin', 'staff'));

// Active subscriptions, revenue collected, outstanding, overdue and MRR in one cheap query (views in schema.sql).
router.get('/summary', wrap(async (req, res) => res.json((await pool.query('SELECT * FROM v_dashboard_summary')).rows[0])));

router.get('/status-breakdown', wrap(async (req, res) => {
  const [subs, invs] = await Promise.all([
    pool.query('SELECT status, count(*) AS count FROM subscriptions GROUP BY status ORDER BY status'),
    pool.query('SELECT status, count(*) AS count, COALESCE(sum(total), 0) AS total FROM invoices GROUP BY status ORDER BY status'),
  ]);
  res.json({ subscriptions: subs.rows, invoices: invs.rows });
}));

// Cash actually received, grouped by day or month (the chart on the finance dashboard).
router.get('/revenue', validate(S.revenue, 'query'), wrap(async (req, res) => {
  const { from, to, group } = req.valid.query;
  const { rows } = await pool.query(
    `SELECT to_char(date_trunc($1::text, paid_on), $2::text) AS period, sum(amount) AS revenue, count(*) AS payments
       FROM payments WHERE ($3::date IS NULL OR paid_on >= $3) AND ($4::date IS NULL OR paid_on <= $4)
      GROUP BY 1 ORDER BY 1`, [group, group === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM', from || null, to || null]);
  res.json(rows);
}));

router.get('/overdue', validate(S.pageOnly, 'query'), wrap(async (req, res) => {
  const p = paging(req.valid.query);
  const { rows } = await pool.query(
    'SELECT *, count(*) OVER() AS total_rows FROM v_overdue_invoices ORDER BY days_overdue DESC, id LIMIT $1 OFFSET $2', [p.limit, p.offset]);
  res.json(pageResult(rows, p));
}));

router.get('/export.csv', validate(S.exportQ, 'query'), wrap(async (req, res) => {
  const { type, from, to } = req.valid.query;
  const sql = type === 'payments'
    ? { text: `SELECT p.id, i.number AS invoice, p.method, p.amount, p.paid_on, p.note FROM payments p JOIN invoices i ON i.id = p.invoice_id
                WHERE ($1::date IS NULL OR p.paid_on >= $1) AND ($2::date IS NULL OR p.paid_on <= $2) ORDER BY p.id LIMIT 50000`,
        cols: ['id', 'invoice', 'method', 'amount', 'paid_on', 'note'] }
    : { text: `SELECT i.number, c.name AS customer, i.status, i.issue_date, i.due_date, i.total, i.amount_paid FROM invoices i JOIN customers c ON c.id = i.customer_id
                WHERE ($1::date IS NULL OR i.issue_date >= $1) AND ($2::date IS NULL OR i.issue_date <= $2) ORDER BY i.id LIMIT 50000`,
        cols: ['number', 'customer', 'status', 'issue_date', 'due_date', 'total', 'amount_paid'] };
  const { rows } = await pool.query(sql.text, [from || null, to || null]);
  res.type('text/csv').attachment(`${type}.csv`).send(toCsv(rows, sql.cols));
}));

module.exports = router;
