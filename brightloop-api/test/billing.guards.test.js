'use strict';
// Guard-path coverage for the billing engine (src/services/billing.js):
// subscriptions that must NOT be billed yet. Complements billing.test.js (which
// covers catch-up, idempotency, discounts and auto-close) with the "nothing due"
// branches. Uses a minimal fake pool so it runs without PostgreSQL.
const test = require('node:test');
const assert = require('node:assert/strict');
const { billSubscription } = require('../src/services/billing');

// A fake pool that records every write and answers the queries billSubscription makes.
function makeFakePool({ sub, lines = [], discounts = [] }) {
  const state = { invoices: new Map(), subUpdates: [], nextId: 1 };
  const client = {
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(s)) return { rows: [] };
      if (/FROM subscriptions s JOIN plans/.test(s)) return { rows: sub ? [sub] : [] };
      if (/FROM subscription_lines/.test(s)) return { rows: lines };
      if (/FROM discounts/.test(s)) return { rows: discounts };
      if (/^INSERT INTO invoices/.test(s)) {
        const row = { id: state.nextId++, number: `INV-${state.nextId}` };
        state.invoices.set(`${params[0]}|${params[2]}`, row);
        return { rows: [{ id: row.id, number: row.number }] };
      }
      if (/^INSERT INTO/.test(s)) return { rows: [] };
      if (/^UPDATE subscriptions/.test(s)) { state.subUpdates.push({ sql: s, params }); return { rows: [] }; }
      if (/^UPDATE /.test(s)) return { rows: [] };
      throw new Error('Unexpected SQL in test: ' + s);
    },
    release() {},
  };
  return { state, async connect() { return client; }, async query() { return { rows: [] }; } };
}

const activeSub = {
  id: 9, customer_id: 1, status: 'active', start_date: '2026-10-01', expiry_date: '2027-10-01',
  next_invoice_date: '2026-12-01', payment_term_days: 15, period: 'monthly', auto_close: false,
};
const lines = [{ product_id: 1, qty: 1, unit_price: 1000, product_name: 'ERP', variant_value: null, tax_kind: 'percent', tax_rate: 18 }];

test('a subscription whose next period is in the future is not billed yet', async () => {
  // asOf is before next_invoice_date, so nothing is due.
  const pool = makeFakePool({ sub: activeSub, lines });
  const r = await billSubscription(pool, 9, { asOf: '2026-11-15' });
  assert.equal(r.created.length, 0);
  assert.equal(pool.state.invoices.size, 0);
});

test('a subscription with no next_invoice_date is skipped entirely', async () => {
  const pool = makeFakePool({ sub: { ...activeSub, next_invoice_date: null }, lines });
  const r = await billSubscription(pool, 9, { asOf: '2027-01-01' });
  assert.equal(r.created.length, 0);
  assert.equal(pool.state.invoices.size, 0);
});

test('billing stops at the expiry date and does not over-bill past it', async () => {
  // One monthly period is due on 01 Dec; expiry is 15 Dec, so exactly one invoice,
  // never a second period starting after expiry.
  const sub = { ...activeSub, next_invoice_date: '2026-12-01', expiry_date: '2026-12-15' };
  const pool = makeFakePool({ sub, lines });
  const r = await billSubscription(pool, 9, { asOf: '2027-03-01' });
  assert.equal(r.created.length, 1);
  assert.equal(pool.state.invoices.size, 1);
});

test('a missing subscription produces no writes', async () => {
  const pool = makeFakePool({ sub: null, lines });
  const r = await billSubscription(pool, 999, { asOf: '2027-01-01' });
  assert.equal(r.created.length, 0);
  assert.equal(pool.state.subUpdates.length, 0);
});
