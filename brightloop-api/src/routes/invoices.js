'use strict';
const express = require('express');
const { pool } = require('../db');
const S = require('../schemas');
const { HttpError } = require('../domain/rules');
const { wrap } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const { requireRole, ownerScope } = require('../middleware/auth');
const { transitionInvoice } = require('../services/lifecycle');
const { runBilling } = require('../services/billing');
const { paging, builder, pageResult, esc } = require('../util');

const router = express.Router();
const staff = requireRole('admin', 'staff');
const inr = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

router.get('/', validate(S.invList, 'query'), wrap(async (req, res) => {
  const q = req.valid.query;
  const p = paging(q);
  const b = builder();
  const own = ownerScope(req);
  if (own !== null) b.add('i.customer_id = ?', own);
  if (q.status) b.add('i.status = ?', q.status);
  if (q.customer_id && own === null) b.add('i.customer_id = ?', q.customer_id);
  if (q.subscription_id) b.add('i.subscription_id = ?', q.subscription_id);
  if (q.from) b.add('i.issue_date >= ?', q.from);
  if (q.to) b.add('i.issue_date <= ?', q.to);
  if (q.overdue === 'true') b.raw(`i.status = 'confirmed' AND i.due_date < current_date AND i.total > i.amount_paid`);
  if (q.q) { const ref = b.ref(`%${q.q}%`); b.raw(`(i.number ILIKE ${ref} OR c.name ILIKE ${ref})`); }
  const lim = b.ref(p.limit); const off = b.ref(p.offset);
  const { rows } = await pool.query(
    `SELECT i.id, i.number, i.status, i.customer_id, c.name AS customer_name, i.subscription_id, i.period_start, i.period_end,
            i.issue_date, i.due_date, i.subtotal, i.discount_total, i.tax_total, i.total, i.amount_paid,
            (i.total - i.amount_paid) AS balance,
            (i.status = 'confirmed' AND i.due_date < current_date AND i.total > i.amount_paid) AS is_overdue,
            count(*) OVER() AS total_rows
       FROM invoices i JOIN customers c ON c.id = i.customer_id
       ${b.where()} ORDER BY i.id DESC LIMIT ${lim} OFFSET ${off}`, b.params);
  res.json(pageResult(rows, p));
}));

async function loadOwned(req, id) {
  const { rows: [inv] } = await pool.query(
    `SELECT i.*, c.name AS customer_name, c.company, c.address, c.tax_no, s.number AS subscription_number
       FROM invoices i JOIN customers c ON c.id = i.customer_id JOIN subscriptions s ON s.id = i.subscription_id WHERE i.id = $1`, [id]);
  const own = ownerScope(req);
  if (!inv || (own !== null && inv.customer_id !== own)) throw new HttpError(404, 'Invoice not found');
  return inv;
}

router.get('/:id', wrap(async (req, res) => {
  const inv = await loadOwned(req, Number(req.params.id));
  const [{ rows: lines }, { rows: payments }, { rows: discounts }] = await Promise.all([
    pool.query('SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY id', [inv.id]),
    pool.query('SELECT id, method, amount, paid_on, note FROM payments WHERE invoice_id = $1 ORDER BY paid_on, id', [inv.id]),
    pool.query('SELECT d.name, r.amount FROM discount_redemptions r JOIN discounts d ON d.id = r.discount_id WHERE r.invoice_id = $1', [inv.id]),
  ]);
  res.json({ ...inv, lines, payments, discounts });
}));

// "Print": a clean, self-contained HTML page the browser can print or save as PDF.
router.get('/:id/print', wrap(async (req, res) => {
  const inv = await loadOwned(req, Number(req.params.id));
  const { rows: lines } = await pool.query('SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY id', [inv.id]);
  const rows = lines.map((l) => `<tr><td>${esc(l.description)}</td><td>${l.qty}</td><td>${inr(l.unit_price)}</td><td>${inr(l.discount_amount)}</td><td>${inr(l.tax_amount)}</td><td>${inr(l.line_total)}</td></tr>`).join('');
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>${esc(inv.number)}</title>
<style>body{font:14px system-ui;margin:40px;color:#111}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}h1{margin:0}</style>
<h1>Invoice ${esc(inv.number)}</h1><p>Status: <b>${esc(inv.status)}</b> · Issued ${esc(inv.issue_date)} · Due ${esc(inv.due_date)}<br>
Subscription ${esc(inv.subscription_number)} · Period ${esc(inv.period_start)} to ${esc(inv.period_end)}</p>
<p><b>${esc(inv.customer_name)}</b>${inv.company ? '<br>' + esc(inv.company) : ''}${inv.address ? '<br>' + esc(inv.address) : ''}${inv.tax_no ? '<br>Tax no. ' + esc(inv.tax_no) : ''}</p>
<table><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Discount</th><th>Tax</th><th>Amount</th></tr>${rows}</table>
<p class="r">Subtotal ${inr(inv.subtotal)}<br>Discount −${inr(inv.discount_total)}<br>Tax ${inr(inv.tax_total)}<br><b>Total ${inr(inv.total)}</b><br>Paid ${inr(inv.amount_paid)}<br><b>Balance ${inr(inv.total - inv.amount_paid)}</b></p>
<script>window.onload=()=>window.print()</script>`);
}));

// Billing day: one call creates every due invoice. Safe to run repeatedly (UNIQUE period constraint).
router.post('/run-billing', staff, validate(S.runBilling), wrap(async (req, res) => {
  res.json(await runBilling(pool, req.valid.body));
}));

router.post('/:id/confirm', staff, wrap(async (req, res) => res.json(await transitionInvoice(pool, Number(req.params.id), 'confirmed', { userId: req.user.id }))));
router.post('/:id/cancel', staff, wrap(async (req, res) => res.json(await transitionInvoice(pool, Number(req.params.id), 'cancelled', { userId: req.user.id }))));

// "Send": stamps sent_at on a confirmed invoice (plug a mailer in here to e-mail the PDF).
router.post('/:id/send', staff, wrap(async (req, res) => {
  const { rows: [inv] } = await pool.query(
    `UPDATE invoices SET sent_at = now() WHERE id = $1 AND status IN ('confirmed','paid') RETURNING id, number, status, sent_at`, [Number(req.params.id)]);
  if (!inv) throw new HttpError(409, 'Only confirmed invoices can be sent');
  res.json(inv);
}));

module.exports = router;
