'use strict';
// Exercises the billing control flow (catch-up, idempotency, auto-close, discount usage)
// against a tiny fake pool, so it runs without PostgreSQL. Use a real DB for integration tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const { billSubscription, runBilling } = require('../src/services/billing');

function makeFakePool({ sub, lines, discounts = [] }) {
  const state = { invoices: new Map(), invoiceLines: [], redemptions: [], discountUpdates: [], subUpdates: [], nextId: 1, log: [] };
  const client = {
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      state.log.push(s.split(' ')[0]);
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(s)) return { rows: [] };
      if (/FROM subscriptions s JOIN plans/.test(s)) return { rows: [sub] };
      if (/FROM subscription_lines/.test(s)) return { rows: lines };
      if (/FROM discounts/.test(s)) return { rows: discounts };
      if (/^INSERT INTO invoices/.test(s)) {
        const key = `${params[0]}|${params[2]}`;
        if (state.invoices.has(key)) return { rows: [] };                  // ON CONFLICT DO NOTHING
        const row = { id: state.nextId++, number: `INV-${state.nextId}`, params };
        state.invoices.set(key, row);
        return { rows: [{ id: row.id, number: row.number }] };
      }
      if (/^INSERT INTO invoice_lines/.test(s)) { state.invoiceLines.push(params); return { rows: [] }; }
      if (/^INSERT INTO discount_redemptions/.test(s)) { state.redemptions.push(params); return { rows: [] }; }
      if (/^UPDATE discounts/.test(s)) { state.discountUpdates.push(params); return { rows: [] }; }
      if (/^UPDATE subscriptions/.test(s)) { state.subUpdates.push({ sql: s, params }); return { rows: [] }; }
      throw new Error('Unexpected SQL in test: ' + s);
    },
    release() {},
  };
  return {
    state,
    async connect() { return client; },
    async query(sql) { return { rows: [{ id: sub.id }] }; },
  };
}

const baseSub = {
  id: 7, customer_id: 1, status: 'active', start_date: '2026-08-30', expiry_date: '2027-08-30',
  next_invoice_date: '2026-09-30', payment_term_days: 15, period: 'monthly', auto_close: false,
};
const lines = [{ product_id: 1, qty: 2, unit_price: 1560, product_name: 'ERP', variant_value: 'Odoo', tax_kind: 'percent', tax_rate: 18 }];

test('catches up every missed period, once each, and advances next_invoice_date', async () => {
  const pool = makeFakePool({ sub: baseSub, lines });
  const r = await billSubscription(pool, 7, { asOf: '2026-10-31' });
  assert.equal(r.created.length, 2);                    // 30 Sep and 30 Oct (anchor day 30)
  assert.equal(r.created[0].total, 3681.6);             // 3120 + 18% tax
  const last = pool.state.subUpdates.at(-1);
  assert.equal(last.params[1], '2026-11-30');
});

test('running twice never bills the same period again', async () => {
  const pool = makeFakePool({ sub: baseSub, lines });
  await billSubscription(pool, 7, { asOf: '2026-10-31' });
  const again = await billSubscription(pool, 7, { asOf: '2026-10-31' });   // fake DB still says next = 30 Sep
  assert.equal(again.created.length, 0);
  assert.equal(again.skipped, 2);
  assert.equal(pool.state.invoices.size, 2);
});

test('applies a live discount, records the redemption and bumps used_count', async () => {
  const disc = { id: 1, kind: 'percent', value: '10', scope: 'subscription', min_qty: 2, min_purchase: 0, used_count: 0,
                 usage_limit: null, starts_on: '2026-01-01', ends_on: '2027-12-31', is_active: true };
  const pool = makeFakePool({ sub: { ...baseSub, next_invoice_date: '2026-10-30' }, lines, discounts: [disc] });
  const r = await billSubscription(pool, 7, { asOf: '2026-10-31' });
  assert.equal(r.created.length, 1);
  assert.equal(r.created[0].discount_total, 312);
  assert.equal(r.created[0].total, 3313.44);
  assert.equal(pool.state.redemptions.length, 1);
  assert.equal(pool.state.discountUpdates.length, 1);
});

test('subscription that has run its course is closed when the plan auto-closes', async () => {
  const sub = { ...baseSub, start_date: '2026-10-01', expiry_date: '2026-10-31', next_invoice_date: '2026-10-31',
                period: 'daily', auto_close: true };
  const pool = makeFakePool({ sub, lines });
  await billSubscription(pool, 7, { asOf: '2026-10-31' });
  const last = pool.state.subUpdates.at(-1);
  assert.match(last.sql, /next_invoice_date = NULL/);
  assert.equal(last.params[1], true);                   // auto_close flag -> status becomes closed
});

test('not-active subscriptions are left alone', async () => {
  const pool = makeFakePool({ sub: { ...baseSub, status: 'paused' }, lines });
  const r = await billSubscription(pool, 7, { asOf: '2026-10-31' });
  assert.equal(r.created.length, 0);
  assert.equal(pool.state.invoices.size, 0);
});

test('runBilling reports a failure without stopping the batch', async () => {
  const pool = makeFakePool({ sub: baseSub, lines });
  const realConnect = pool.connect.bind(pool);
  let calls = 0;
  pool.connect = async () => { calls += 1; if (calls === 1) throw new Error('boom'); return realConnect(); };
  pool.query = async () => ({ rows: [{ id: 7 }, { id: 7 }] });
  const s = await runBilling(pool, { asOf: '2026-10-31' });
  assert.equal(s.due, 2);
  assert.equal(s.failed.length, 1);
  assert.equal(s.invoicesCreated, 2);
});
