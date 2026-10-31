'use strict';
const express = require('express');
const { pool } = require('../db');
const S = require('../schemas');
const { HttpError, addDays, todayISO } = require('../domain/rules');
const { wrap } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const { requireRole, ownerScope } = require('../middleware/auth');
const { transitionSubscription, renewSubscription, withTx, audit } = require('../services/lifecycle');
const { paging, builder, pageResult } = require('../util');

const router = express.Router();
const staff = requireRole('admin', 'staff');

router.get('/', validate(S.subList, 'query'), wrap(async (req, res) => {
  const q = req.valid.query;
  const p = paging(q);
  const b = builder();
  const own = ownerScope(req);
  if (own !== null) b.add('s.customer_id = ?', own);
  if (q.status) b.add('s.status = ?', q.status);
  if (q.customer_id && own === null) b.add('s.customer_id = ?', q.customer_id);
  if (q.plan_id) b.add('s.plan_id = ?', q.plan_id);
  if (q.q) { const ref = b.ref(`%${q.q}%`); b.raw(`(s.number ILIKE ${ref} OR c.name ILIKE ${ref})`); }
  const lim = b.ref(p.limit); const off = b.ref(p.offset);
  const { rows } = await pool.query(
    `SELECT s.id, s.number, s.status, s.start_date, s.expiry_date, s.next_invoice_date, s.customer_id,
            c.name AS customer_name, p.name AS plan_name, p.period, count(*) OVER() AS total_rows
       FROM subscriptions s JOIN customers c ON c.id = s.customer_id JOIN plans p ON p.id = s.plan_id
       ${b.where()} ORDER BY s.id DESC LIMIT ${lim} OFFSET ${off}`, b.params);
  res.json(pageResult(rows, p));
}));

async function loadOwned(req, id) {
  const { rows: [s] } = await pool.query(
    `SELECT s.*, c.name AS customer_name, p.name AS plan_name, p.period, p.allow_pause, p.allow_early_close, p.allow_renew
       FROM subscriptions s JOIN customers c ON c.id = s.customer_id JOIN plans p ON p.id = s.plan_id WHERE s.id = $1`, [id]);
  const own = ownerScope(req);
  if (!s || (own !== null && s.customer_id !== own)) throw new HttpError(404, 'Subscription not found'); // 404, not 403: do not reveal other customers' ids
  return s;
}

router.get('/:id', wrap(async (req, res) => {
  const s = await loadOwned(req, Number(req.params.id));
  const { rows: lines } = await pool.query(
    `SELECT l.id, l.product_id, pr.name AS product, v.attribute, v.value AS variant, l.qty, l.unit_price, l.amount, t.name AS tax
       FROM subscription_lines l JOIN products pr ON pr.id = l.product_id
       LEFT JOIN product_variants v ON v.id = l.variant_id LEFT JOIN taxes t ON t.id = l.tax_id
      WHERE l.subscription_id = $1 ORDER BY l.id`, [s.id]);
  res.json({ ...s, lines });
}));

// Create from a quotation template (plan + lines + validity come from it) or from explicit lines.
router.post('/', staff, validate(S.subscriptionCreate), wrap(async (req, res) => {
  const b = req.valid.body;
  const out = await withTx(pool, async (c) => {
    let planId = b.plan_id; let lines = b.lines; let validity = null;
    if (b.template_id) {
      const { rows: [t] } = await c.query('SELECT * FROM quotation_templates WHERE id = $1 AND is_active', [b.template_id]);
      if (!t) throw new HttpError(404, 'Quotation template not found');
      planId = t.plan_id; validity = t.validity_days;
      if (!lines || !lines.length) ({ rows: lines } = await c.query('SELECT product_id, variant_id, qty FROM quotation_template_lines WHERE template_id = $1 ORDER BY id', [t.id]));
    }
    const { rows: [plan] } = await c.query('SELECT * FROM plans WHERE id = $1 AND is_active', [planId]);
    if (!plan) throw new HttpError(404, 'Plan not found');
    if ((plan.available_from && b.start_date < plan.available_from) || (plan.available_to && b.start_date > plan.available_to)) {
      throw new HttpError(409, `This plan is only available between ${plan.available_from || 'the beginning'} and ${plan.available_to || 'no end date'}`);
    }
    const totalQty = lines.reduce((s, l) => s + l.qty, 0);
    if (totalQty < plan.min_qty) throw new HttpError(409, `This plan needs a minimum quantity of ${plan.min_qty} (you have ${totalQty})`);
    const { rows: [cust] } = await c.query('SELECT id FROM customers WHERE id = $1', [b.customer_id]);
    if (!cust) throw new HttpError(404, 'Customer not found');

    const priced = [];
    for (const l of lines) {
      const { rows: [pr] } = await c.query('SELECT id, sales_price, tax_id FROM products WHERE id = $1 AND is_active', [l.product_id]);
      if (!pr) throw new HttpError(404, `Product ${l.product_id} not found`);
      let extra = 0;
      if (l.variant_id) {
        const { rows: [v] } = await c.query('SELECT extra_price FROM product_variants WHERE id = $1 AND product_id = $2', [l.variant_id, l.product_id]);
        if (!v) throw new HttpError(400, `Variant ${l.variant_id} does not belong to product ${l.product_id}`);
        extra = Number(v.extra_price);
      }
      priced.push({ ...l, unit_price: Number(pr.sales_price) + extra, tax_id: pr.tax_id });  // price is snapshotted on the line
    }
    const { rows: [s] } = await c.query(
      `INSERT INTO subscriptions (customer_id, plan_id, template_id, start_date, expiry_date, payment_term_days, quote_valid_until, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [b.customer_id, planId, b.template_id || null, b.start_date, b.expiry_date, b.payment_term_days, validity ? addDays(todayISO(), validity) : null, req.user.id]);
    for (const l of priced) {
      await c.query('INSERT INTO subscription_lines (subscription_id, product_id, variant_id, qty, unit_price, tax_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [s.id, l.product_id, l.variant_id || null, l.qty, l.unit_price, l.tax_id]);
    }
    await audit(c, req.user.id, 'subscription', s.id, 'created', { template_id: b.template_id || null });
    return s;
  });
  res.status(201).json(out);
}));

// Staff drive the full lifecycle. Customers may only pause / resume / close their OWN subscription from the portal.
router.post('/:id/transition', validate(S.transition), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { to } = req.valid.body;
  const s = await loadOwned(req, id);
  if (req.user.role === 'customer') {
    const allowed = to === 'paused' || to === 'closed' || (to === 'active' && s.status === 'paused');
    if (!allowed) throw new HttpError(403, 'Customers can pause, resume or close their own subscription only');
  }
  res.json(await transitionSubscription(pool, id, to, { userId: req.user.id }));
}));

router.post('/:id/renew', wrap(async (req, res) => {
  const id = Number(req.params.id);
  await loadOwned(req, id);
  res.json(await renewSubscription(pool, id, { userId: req.user.id }));
}));

module.exports = router;
