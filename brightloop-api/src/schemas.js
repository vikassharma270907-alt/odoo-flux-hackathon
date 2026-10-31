'use strict';
const { z } = require('zod');
const { validatePassword } = require('./domain/rules');

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((s) => !Number.isNaN(Date.parse(s)), 'Not a real date');
const money = z.coerce.number().nonnegative().max(1e9);
const id = z.coerce.number().int().positive();
const password = z.string().superRefine((pw, ctx) => {
  validatePassword(pw).forEach((message) => ctx.addIssue({ code: 'custom', message }));
});
const email = z.string().trim().toLowerCase().email().max(254);
const name = z.string().trim().min(2).max(120);
const dateOrder = (o) => !o.available_from || !o.available_to || o.available_to >= o.available_from;

const list = { page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) };

module.exports = {
  signup: z.object({ name, email, password }),
  login: z.object({ email, password: z.string().min(1) }),
  forgot: z.object({ email }),
  reset: z.object({ token: z.string().min(20), password }),
  createStaff: z.object({ name, email, password }),

  tax: z.object({ name, kind: z.enum(['percent', 'fixed']), rate: money }),
  product: z.object({
    name, type: z.string().trim().min(2).max(40), sales_price: money, cost_price: money.default(0),
    notes: z.string().max(1000).optional(), tax_id: id.optional(),
    variants: z.array(z.object({ attribute: z.string().min(1).max(40), value: z.string().min(1).max(60), extra_price: z.coerce.number().default(0) })).default([]),
  }),
  plan: z.object({
    name, price: money, period: z.enum(['daily', 'weekly', 'monthly', 'yearly']), min_qty: z.coerce.number().int().min(1).default(1),
    available_from: date.optional(), available_to: date.optional(),
    auto_close: z.boolean().default(false), allow_early_close: z.boolean().default(true),
    allow_pause: z.boolean().default(true), allow_renew: z.boolean().default(true),
  }).refine(dateOrder, { message: 'available_to must not be before available_from', path: ['available_to'] }),
  planPatch: z.object({
    auto_close: z.boolean().optional(), allow_early_close: z.boolean().optional(),
    allow_pause: z.boolean().optional(), allow_renew: z.boolean().optional(), is_active: z.boolean().optional(),
    available_to: date.optional(),
  }).refine((o) => Object.keys(o).length > 0, 'Nothing to update'),
  discount: z.object({
    name, kind: z.enum(['percent', 'fixed']), value: z.coerce.number().positive(),
    min_purchase: money.default(0), min_qty: z.coerce.number().int().min(0).default(0),
    starts_on: date.optional(), ends_on: date.optional(), usage_limit: z.coerce.number().int().positive().optional(),
    scope: z.enum(['product', 'subscription']).default('subscription'), product_id: id.optional(),
  }).superRefine((d, ctx) => {
    if (d.kind === 'percent' && d.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percentage cannot exceed 100' });
    if (d.scope === 'product' && !d.product_id) ctx.addIssue({ code: 'custom', path: ['product_id'], message: 'product_id is required for product-scoped discounts' });
    if (d.starts_on && d.ends_on && d.ends_on < d.starts_on) ctx.addIssue({ code: 'custom', path: ['ends_on'], message: 'ends_on must not be before starts_on' });
  }),
  active: z.object({ is_active: z.boolean() }),
  template: z.object({
    name, plan_id: id, validity_days: z.coerce.number().int().positive().default(30),
    lines: z.array(z.object({ product_id: id, variant_id: id.optional(), qty: z.coerce.number().int().positive().default(1) })).min(1),
  }),

  subscriptionCreate: z.object({
    customer_id: id, plan_id: id.optional(), template_id: id.optional(),
    start_date: date, expiry_date: date, payment_term_days: z.coerce.number().int().min(0).max(365).default(15),
    lines: z.array(z.object({ product_id: id, variant_id: id.optional(), qty: z.coerce.number().int().positive() })).optional(),
  }).superRefine((s, ctx) => {
    if (s.expiry_date < s.start_date) ctx.addIssue({ code: 'custom', path: ['expiry_date'], message: 'expiry_date must not be before start_date' });
    if (!s.plan_id && !s.template_id) ctx.addIssue({ code: 'custom', path: ['plan_id'], message: 'Provide plan_id or template_id' });
    if (!s.template_id && !(s.lines && s.lines.length)) ctx.addIssue({ code: 'custom', path: ['lines'], message: 'Add at least one line (or use a template)' });
  }),
  transition: z.object({ to: z.enum(['quotation', 'confirmed', 'active', 'paused', 'closed']) }),
  runBilling: z.object({ asOf: date.optional(), autoConfirm: z.boolean().default(false), subscriptionId: id.optional() }),
  payment: z.object({
    invoice_id: id, method: z.enum(['cash', 'bank_transfer', 'card', 'upi', 'cheque']),
    amount: z.coerce.number().positive().max(1e9), paid_on: date.optional(), note: z.string().max(500).optional(),
  }),

  subList: z.object({ ...list, status: z.enum(['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed']).optional(), customer_id: id.optional(), plan_id: id.optional(), q: z.string().max(80).optional() }),
  invList: z.object({ ...list, status: z.enum(['draft', 'confirmed', 'paid', 'cancelled']).optional(), overdue: z.enum(['true', 'false']).optional(), customer_id: id.optional(), subscription_id: id.optional(), from: date.optional(), to: date.optional(), q: z.string().max(80).optional() }),
  payList: z.object({ ...list, invoice_id: id.optional(), method: z.enum(['cash', 'bank_transfer', 'card', 'upi', 'cheque']).optional(), from: date.optional(), to: date.optional() }),
  custList: z.object({ ...list, q: z.string().max(80).optional() }),
  customer: z.object({ name, company: z.string().max(120).optional(), phone: z.string().max(30).optional(), address: z.string().max(300).optional(), tax_no: z.string().max(40).optional() }),
  pageOnly: z.object({ ...list }),
  revenue: z.object({ from: date.optional(), to: date.optional(), group: z.enum(['day', 'month']).default('month') }),
  exportQ: z.object({ type: z.enum(['invoices', 'payments']).default('invoices'), from: date.optional(), to: date.optional() }),
};
