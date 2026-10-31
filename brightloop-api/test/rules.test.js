'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword, addPeriod, assertTransition, SUB_TRANSITIONS, INVOICE_TRANSITIONS, toDateStr } = require('../src/domain/rules');
const { calcInvoice } = require('../src/domain/invoiceCalc');

test('password rules', () => {
  assert.equal(validatePassword('Admin@12345').length, 0);
  assert.ok(validatePassword('Short@1').length > 0);          // too short
  assert.ok(validatePassword('Abcdefgh@').length === 0);      // exactly 9 chars is fine ("more than eight")
  assert.ok(validatePassword('Abcdefg@').length > 0);         // 8 chars is not
  assert.ok(validatePassword('alllowercase@1').length > 0);   // no uppercase
  assert.ok(validatePassword('ALLUPPERCASE@1').length > 0);   // no lowercase
  assert.ok(validatePassword('NoSpecial12345').length > 0);   // no special char
});

test('billing periods keep their anchor day', () => {
  assert.equal(addPeriod('2026-01-31', 'monthly', 31), '2026-02-28');
  assert.equal(addPeriod('2026-02-28', 'monthly', 31), '2026-03-31');
  assert.equal(addPeriod('2026-12-15', 'monthly', 15), '2027-01-15');
  assert.equal(addPeriod('2028-02-29', 'yearly', 29), '2029-02-28');
  assert.equal(addPeriod('2026-10-31', 'weekly'), '2026-11-07');
  assert.equal(addPeriod('2026-12-31', 'daily'), '2027-01-01');
});

test('state machines', () => {
  assertTransition(SUB_TRANSITIONS, 'draft', 'quotation');
  assertTransition(SUB_TRANSITIONS, 'active', 'paused');
  assert.throws(() => assertTransition(SUB_TRANSITIONS, 'draft', 'active'), /Cannot move/);
  assert.throws(() => assertTransition(SUB_TRANSITIONS, 'closed', 'active'), /Cannot move/);
  assertTransition(INVOICE_TRANSITIONS, 'draft', 'confirmed');
  assert.throws(() => assertTransition(INVOICE_TRANSITIONS, 'paid', 'draft'), /Cannot move/);
});

test('toDateStr handles strings and Dates', () => {
  assert.equal(toDateStr('2026-10-31'), '2026-10-31');
  assert.equal(toDateStr(new Date(2026, 9, 31)), '2026-10-31');
});

const gst18 = { kind: 'percent', rate: 18 };

test('Odoo brand variant (+560), 10% volume discount, tax after discount', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [{ product_id: 1, description: 'ERP - Odoo', qty: 2, unit_price: 1000 + 560, tax: gst18 }],
    discounts: [{ id: 1, kind: 'percent', value: 10, scope: 'subscription', min_qty: 2, min_purchase: 0, used_count: 0 }],
  });
  assert.equal(r.subtotal, 3120);
  assert.equal(r.discount_total, 312);
  assert.equal(r.tax_total, 505.44);       // 18% of 2808
  assert.equal(r.total, 3313.44);
  assert.deepEqual(r.applied, [{ discount_id: 1, amount: 312 }]);
});

test('discount is skipped when expired, not started, exhausted, or thresholds are not met', () => {
  const base = { kind: 'percent', value: 10, scope: 'subscription', min_qty: 0, min_purchase: 0, used_count: 0 };
  const lines = [{ product_id: 1, description: 'x', qty: 1, unit_price: 1000, tax: null }];
  const run = (d) => calcInvoice({ asOf: '2026-10-31', lines, discounts: [{ id: 1, ...base, ...d }] }).discount_total;
  assert.equal(run({}), 100);
  assert.equal(run({ ends_on: '2026-10-30' }), 0);                  // expired
  assert.equal(run({ starts_on: '2026-11-01' }), 0);                // not started
  assert.equal(run({ usage_limit: 3, used_count: 3 }), 0);          // ran out
  assert.equal(run({ usage_limit: 3, used_count: 2 }), 100);        // last use still works
  assert.equal(run({ min_purchase: 5000 }), 0);                     // minimum purchase not met
  assert.equal(run({ min_qty: 5 }), 0);                             // minimum quantity not met
});

test('product-scoped discount only touches that product; fixed discount is capped', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [
      { product_id: 1, description: 'A', qty: 1, unit_price: 1000, tax: gst18 },
      { product_id: 3, description: 'Support', qty: 1, unit_price: 1200, tax: gst18 },
    ],
    discounts: [{ id: 3, kind: 'percent', value: 20, scope: 'product', product_id: 3, min_qty: 0, min_purchase: 0, used_count: 0 }],
  });
  assert.equal(r.lines[0].discount_amount, 0);
  assert.equal(r.lines[1].discount_amount, 240);
  const capped = calcInvoice({
    asOf: '2026-10-31',
    lines: [{ product_id: 1, description: 'A', qty: 1, unit_price: 300, tax: null }],
    discounts: [{ id: 2, kind: 'fixed', value: 500, scope: 'subscription', min_qty: 0, min_purchase: 0, used_count: 0 }],
  });
  assert.equal(capped.discount_total, 300);   // never more than the invoice
  assert.equal(capped.total, 0);
});

test('stacked discounts never push a line below zero and totals add up', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [
      { product_id: 1, description: 'A', qty: 3, unit_price: 333.33, tax: gst18 },
      { product_id: 2, description: 'B', qty: 1, unit_price: 99.99, tax: { kind: 'percent', rate: 5 } },
    ],
    discounts: [
      { id: 1, kind: 'percent', value: 10, scope: 'subscription', min_qty: 0, min_purchase: 0, used_count: 0 },
      { id: 2, kind: 'fixed', value: 50, scope: 'subscription', min_qty: 0, min_purchase: 0, used_count: 0 },
    ],
  });
  const lineSum = Math.round(r.lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  assert.equal(lineSum, r.total);
  assert.ok(r.lines.every((l) => l.line_total >= 0));
});
