'use strict';
const express = require('express');
const { pool } = require('../db');
const S = require('../schemas');
const { HttpError } = require('../domain/rules');
const { wrap } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');
const { withTx, audit } = require('../services/lifecycle');

const router = express.Router();
const staff = requireRole('admin', 'staff');
const admin = requireRole('admin');

// ---- taxes ----
router.get('/taxes', staff, wrap(async (req, res) => res.json((await pool.query('SELECT * FROM taxes WHERE is_active ORDER BY id')).rows)));
router.post('/taxes', admin, validate(S.tax), wrap(async (req, res) => {
  const { name, kind, rate } = req.valid.body;
  if (kind === 'percent' && rate > 100) throw new HttpError(400, 'A percentage tax cannot exceed 100');
  res.status(201).json((await pool.query('INSERT INTO taxes (name, kind, rate) VALUES ($1,$2,$3) RETURNING *', [name, kind, rate])).rows[0]);
}));

// ---- products (+ variants, e.g. Brand = Odoo adds 560) ----
router.get('/products', wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.type, p.sales_price, ${req.user.role === 'customer' ? '' : 'p.cost_price, p.notes,'} p.tax_id,
            COALESCE(json_agg(json_build_object('id', v.id, 'attribute', v.attribute, 'value', v.value, 'extra_price', v.extra_price))
                     FILTER (WHERE v.id IS NOT NULL), '[]') AS variants
       FROM products p LEFT JOIN product_variants v ON v.product_id = p.id
      WHERE p.is_active GROUP BY p.id ORDER BY p.id`);
  res.json(rows);
}));
router.post('/products', admin, validate(S.product), wrap(async (req, res) => {
  const b = req.valid.body;
  const out = await withTx(pool, async (c) => {
    const { rows: [p] } = await c.query(
      'INSERT INTO products (name, type, sales_price, cost_price, notes, tax_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [b.name, b.type, b.sales_price, b.cost_price, b.notes || null, b.tax_id || null]);
    for (const v of b.variants) {
      await c.query('INSERT INTO product_variants (product_id, attribute, value, extra_price) VALUES ($1,$2,$3,$4)', [p.id, v.attribute, v.value, v.extra_price]);
    }
    await audit(c, req.user.id, 'product', p.id, 'created');
    return p;
  });
  res.status(201).json(out);
}));

// ---- plans ----
router.get('/plans', wrap(async (req, res) => res.json((await pool.query('SELECT * FROM plans WHERE is_active ORDER BY id')).rows)));
router.post('/plans', admin, validate(S.plan), wrap(async (req, res) => {
  const b = req.valid.body;
  const { rows: [p] } = await pool.query(
    `INSERT INTO plans (name, price, period, min_qty, available_from, available_to, auto_close, allow_early_close, allow_pause, allow_renew)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [b.name, b.price, b.period, b.min_qty, b.available_from || null, b.available_to || null, b.auto_close, b.allow_early_close, b.allow_pause, b.allow_renew]);
  res.status(201).json(p);
}));
router.patch('/plans/:id', admin, validate(S.planPatch), wrap(async (req, res) => {
  const entries = Object.entries(req.valid.body);                       // keys are whitelisted by the Zod schema
  const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const { rows: [p] } = await pool.query(`UPDATE plans SET ${sets} WHERE id = $1 RETURNING *`, [Number(req.params.id), ...entries.map(([, v]) => v)]);
  if (!p) throw new HttpError(404, 'Plan not found');
  res.json(p);
}));

// ---- discounts (admin only) ----
router.get('/discounts', staff, wrap(async (req, res) => res.json((await pool.query('SELECT * FROM discounts ORDER BY id')).rows)));
router.post('/discounts', admin, validate(S.discount), wrap(async (req, res) => {
  const d = req.valid.body;
  const { rows: [r] } = await pool.query(
    `INSERT INTO discounts (name, kind, value, min_purchase, min_qty, starts_on, ends_on, usage_limit, scope, product_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [d.name, d.kind, d.value, d.min_purchase, d.min_qty, d.starts_on || null, d.ends_on || null, d.usage_limit || null, d.scope, d.product_id || null]);
  await pool.query('INSERT INTO audit_log (actor_id, entity, entity_id, action) VALUES ($1,$2,$3,$4)', [req.user.id, 'discount', r.id, 'created']);
  res.status(201).json(r);
}));
router.patch('/discounts/:id/active', admin, validate(S.active), wrap(async (req, res) => {
  const { rows: [r] } = await pool.query('UPDATE discounts SET is_active = $2 WHERE id = $1 RETURNING *', [Number(req.params.id), req.valid.body.is_active]);
  if (!r) throw new HttpError(404, 'Discount not found');
  res.json(r);
}));

// ---- quotation templates ----
router.get('/templates', staff, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT t.*, COALESCE(json_agg(json_build_object('product_id', l.product_id, 'variant_id', l.variant_id, 'qty', l.qty) ORDER BY l.id)
                     FILTER (WHERE l.id IS NOT NULL), '[]') AS lines
       FROM quotation_templates t LEFT JOIN quotation_template_lines l ON l.template_id = t.id WHERE t.is_active GROUP BY t.id ORDER BY t.id`);
  res.json(rows);
}));
router.post('/templates', admin, validate(S.template), wrap(async (req, res) => {
  const b = req.valid.body;
  const out = await withTx(pool, async (c) => {
    const { rows: [t] } = await c.query('INSERT INTO quotation_templates (name, plan_id, validity_days) VALUES ($1,$2,$3) RETURNING *', [b.name, b.plan_id, b.validity_days]);
    for (const l of b.lines) {
      await c.query('INSERT INTO quotation_template_lines (template_id, product_id, variant_id, qty) VALUES ($1,$2,$3,$4)', [t.id, l.product_id, l.variant_id || null, l.qty]);
    }
    return t;
  });
  res.status(201).json(out);
}));

module.exports = router;
