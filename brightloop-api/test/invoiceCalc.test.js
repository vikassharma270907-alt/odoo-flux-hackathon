'use strict';
// Focused coverage for the pure invoice maths (src/domain/invoiceCalc.js):
// multi-line subtotals, proportional allocation of a subscription-wide discount
// across lines, mixed/absent taxes, and the "tax after discount" ordering.
// Complements rules.test.js (which covers single-line and threshold cases).
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcInvoice, round2 } = require('../src/domain/invoiceCalc');

const gst18 = { kind: 'percent', rate: 18 };

test('round2 rounds half away from zero to two places', () => {
  assert.equal(round2(2808 * 0.18), 505.44);
  assert.equal(round2(0.1 + 0.2), 0.3);           // classic float case
  assert.equal(round2(99.995), 100);
});

test('no discounts: subtotal, tax and total are the plain sums', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [
      { product_id: 1, description: 'A', qty: 2, unit_price: 500, tax: gst18 },
      { product_id: 2, description: 'B', qty: 1, unit_price: 1000, tax: gst18 },
    ],
    discounts: [],
  });
  assert.equal(r.subtotal, 2000);
  assert.equal(r.discount_total, 0);
  assert.equal(r.tax_total, 360);                 // 18% of 2000
  assert.equal(r.total, 2360);
  assert.deepEqual(r.applied, []);
});

test('a line with no tax contributes zero tax', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [{ product_id: 1, description: 'Untaxed', qty: 4, unit_price: 25, tax: null }],
    discounts: [],
  });
  assert.equal(r.subtotal, 100);
  assert.equal(r.tax_total, 0);
  assert.equal(r.total, 100);
});

test('subscription-wide discount is allocated across every line, tax applied after', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [
      { product_id: 1, description: 'A', qty: 1, unit_price: 1000, tax: gst18 },
      { product_id: 2, description: 'B', qty: 1, unit_price: 3000, tax: gst18 },
    ],
    discounts: [{ id: 1, kind: 'percent', value: 10, scope: 'subscription', min_qty: 0, min_purchase: 0, used_count: 0 }],
  });
  assert.equal(r.subtotal, 4000);
  assert.equal(r.discount_total, 400);            // 10% of 4000
  assert.equal(r.lines[0].discount_amount, 100);  // proportional: 100 to A
  assert.equal(r.lines[1].discount_amount, 300);  // 300 to B
  assert.equal(r.tax_total, 648);                 // 18% of 900 + 18% of 2700
  assert.equal(r.total, 4248);
});

test('discount never exceeds the invoice and no line goes negative', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [
      { product_id: 1, description: 'A', qty: 1, unit_price: 200, tax: null },
      { product_id: 2, description: 'B', qty: 1, unit_price: 100, tax: null },
    ],
    discounts: [{ id: 1, kind: 'fixed', value: 10000, scope: 'subscription', min_qty: 0, min_purchase: 0, used_count: 0 }],
  });
  assert.equal(r.discount_total, 300);            // capped at the 300 subtotal
  assert.equal(r.total, 0);
  assert.ok(r.lines.every((l) => l.line_total >= 0 && l.discount_amount <= l.qty * l.unit_price));
});

test('mixed percent and fixed-per-unit taxes on separate lines', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [
      { product_id: 1, description: 'Percent-taxed', qty: 2, unit_price: 100, tax: { kind: 'percent', rate: 10 } },
      { product_id: 2, description: 'Unit-taxed', qty: 5, unit_price: 40, tax: { kind: 'fixed', rate: 2 } },
    ],
    discounts: [],
  });
  assert.equal(r.subtotal, 400);
  assert.equal(r.tax_total, 30);                  // 20 + 10
  assert.equal(r.lines[0].line_total, 220);
  assert.equal(r.lines[1].line_total, 210);
  assert.equal(r.total, 430);
});

test('invariant: invoice total always equals the sum of its line totals', () => {
  const r = calcInvoice({
    asOf: '2026-10-31',
    lines: [
      { product_id: 1, description: 'A', qty: 7, unit_price: 142.86, tax: gst18 },
      { product_id: 2, description: 'B', qty: 2, unit_price: 33.33, tax: { kind: 'percent', rate: 5 } },
      { product_id: 3, description: 'C', qty: 1, unit_price: 999.99, tax: null },
    ],
    discounts: [{ id: 1, kind: 'percent', value: 15, scope: 'subscription', min_qty: 0, min_purchase: 0, used_count: 0 }],
  });
  const lineSum = round2(r.lines.reduce((s, l) => s + l.line_total, 0));
  assert.equal(lineSum, r.total);
  assert.ok(r.lines.every((l) => l.line_total >= 0));
});
