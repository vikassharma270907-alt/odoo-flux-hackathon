'use strict';
// Integration tests: real Express app + real PostgreSQL (the `subscriptions_test` database).
// Covers auth, role scoping, is_active revocation, login rate-limiting, billing idempotency,
// payments (partial -> full -> paid, overpayment) and discount expiry.
//
// Run with the test DB available (Docker Postgres):
//   docker compose up -d db
//   docker exec brightloop-api-db-1 psql -U postgres -c "CREATE DATABASE subscriptions_test;"
//   node --test test/integration.test.js
//
// These tests are skipped automatically if the test database is unreachable, so the
// pure unit suite still runs anywhere.
const test = require('node:test');
const assert = require('node:assert/strict');

const { pool, resetSchema, seedFixture, addDays } = require('./helpers/testdb');
const request = require('supertest');
const app = require('../src/app');

const today = new Date().toISOString().slice(0, 10);
let fixture;
let dbUp = true;
// Log the shared roles in ONCE and reuse their tokens, so the module-level login
// rate-limiter (10 per IP+email per window) is not tripped by the test suite itself.
const tokens = {};

const login = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
};
const bearer = (t) => ({ Authorization: `Bearer ${t}` });

// --- lifecycle -------------------------------------------------------------
test.before(async () => {
  try {
    await resetSchema();
    fixture = await seedFixture({ today });
    tokens.admin = await login('admin@brightloop.test', 'Admin@12345');
    tokens.staff = await login('staff@brightloop.test', 'Staff@12345');
    tokens.customer = await login('customer@brightloop.test', 'Customer@123');
  } catch (err) {
    dbUp = false;
    // eslint-disable-next-line no-console
    console.error('\n[integration] test database unreachable, skipping integration tests:\n ', err.message, '\n');
  }
});
test.after(async () => { await pool.end().catch(() => {}); });

const skip = () => !dbUp;

// --- auth ------------------------------------------------------------------
test('signup rejects a weak password with 400 and field details', { skip: skip() }, async () => {
  const res = await request(app).post('/api/auth/signup').send({ name: 'Weak', email: `weak${Date.now()}@t.test`, password: 'weak' });
  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.details) && res.body.details.length > 0);
});

test('signup then login issues a working customer token', { skip: skip() }, async () => {
  const email = `new${Date.now()}@t.test`;
  const up = await request(app).post('/api/auth/signup').send({ name: 'New Co', email, password: 'Strong@Pass1' });
  assert.equal(up.status, 201);
  assert.equal(up.body.user.role, 'customer');
  const me = await request(app).get('/api/auth/me').set(bearer(up.body.token));
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, email);
});

test('login with a wrong password returns 401', { skip: skip() }, async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@brightloop.test', password: 'nope' });
  assert.equal(res.status, 401);
});

// --- role scoping ----------------------------------------------------------
test('a customer sees only their own subscriptions', { skip: skip() }, async () => {
  const res = await request(app).get('/api/subscriptions?limit=100').set(bearer(tokens.customer));
  assert.equal(res.status, 200);
  assert.ok(res.body.data.every((s) => s.customer_id === fixture.customer1));
});

test('a customer gets 404 (not 403) for another customer\'s subscription', { skip: skip() }, async () => {
  // Make a subscription that belongs to customer #2 using the staff token.
  const created = await request(app).post('/api/subscriptions').set(bearer(tokens.staff)).send({
    customer_id: fixture.customer2, plan_id: 1, start_date: today, expiry_date: addDays(today, 365),
    lines: [{ product_id: 1, qty: 1 }],
  });
  assert.equal(created.status, 201);
  const otherId = created.body.id;
  const res = await request(app).get(`/api/subscriptions/${otherId}`).set(bearer(tokens.customer));
  assert.equal(res.status, 404); // 404 so we never confirm the record exists
});

test('a customer cannot reach admin-only routes (403)', { skip: skip() }, async () => {
  assert.equal((await request(app).get('/api/users').set(bearer(tokens.customer))).status, 403);
  assert.equal((await request(app).post('/api/users/staff').set(bearer(tokens.customer)).send({ name: 'x', email: 'x@y.z', password: 'Abcdef@12' })).status, 403);
});

test('staff cannot create products (admin only)', { skip: skip() }, async () => {
  const res = await request(app).post('/api/products').set(bearer(tokens.staff)).send({ name: 'Nope', type: 'software', sales_price: 100 });
  assert.equal(res.status, 403);
});

// --- is_active revocation --------------------------------------------------
test('deactivating a user invalidates their existing token immediately', { skip: skip() }, async () => {
  const email = `temp${Date.now()}@brightloop.test`;
  const made = await request(app).post('/api/users/staff').set(bearer(tokens.admin)).send({ name: 'Temp', email, password: 'TempPass@12' });
  assert.equal(made.status, 201);
  const token = await login(email, 'TempPass@12');
  assert.equal((await request(app).get('/api/reports/summary').set(bearer(token))).status, 200);
  const off = await request(app).patch(`/api/users/${made.body.id}/active`).set(bearer(tokens.admin)).send({ is_active: false });
  assert.equal(off.status, 200);
  assert.equal((await request(app).get('/api/reports/summary').set(bearer(token))).status, 401);
});

// --- login rate-limiting ---------------------------------------------------
test('repeated bad logins are throttled with 429', { skip: skip() }, async () => {
  const email = `brute${Date.now()}@t.test`;
  let got429 = false;
  for (let i = 0; i < 12; i += 1) {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass@1' });
    if (res.status === 429) { got429 = true; assert.ok(res.headers['retry-after']); break; }
  }
  assert.ok(got429, 'expected a 429 within the attempt window');
});

// --- billing idempotency + discounts --------------------------------------
test('run-billing creates invoices once; a second run creates none', { skip: skip() }, async () => {
  const first = await request(app).post('/api/invoices/run-billing').set(bearer(tokens.staff)).send({ asOf: today, autoConfirm: true, subscriptionId: fixture.subscriptionId });
  assert.equal(first.status, 200);
  assert.equal(first.body.invoicesCreated, 1);

  const second = await request(app).post('/api/invoices/run-billing').set(bearer(tokens.staff)).send({ asOf: today, autoConfirm: true, subscriptionId: fixture.subscriptionId });
  assert.equal(second.body.invoicesCreated, 0); // nothing billed twice

  // The live 10% discount applied; the expired 50% discount did NOT.
  // Lines: qty 2 x 1000 = 2000; -10% = 1800; +18% tax = 2124.00
  const inv = first.body.invoices[0];
  assert.equal(inv.discount_total, 200);
  assert.equal(inv.total, 2124);
});

// --- payments --------------------------------------------------------------
test('partial then final payment moves an invoice to paid; overpayment is 409', { skip: skip() }, async () => {
  // Find the confirmed invoice for our fixture subscription.
  const list = await request(app).get(`/api/invoices?subscription_id=${fixture.subscriptionId}&limit=1`).set(bearer(tokens.staff));
  const invoice = list.body.data[0];
  assert.equal(invoice.status, 'confirmed');
  const total = Number(invoice.total);

  // Overpay immediately -> 409
  const over = await request(app).post('/api/payments').set(bearer(tokens.staff)).send({ invoice_id: invoice.id, method: 'card', amount: total + 100 });
  assert.equal(over.status, 409);

  // Pay half -> still confirmed
  const half = await request(app).post('/api/payments').set(bearer(tokens.staff)).send({ invoice_id: invoice.id, method: 'upi', amount: Math.round(total * 50) / 100 });
  assert.equal(half.status, 201);
  assert.equal(half.body.invoice.status, 'confirmed');

  // Pay the remaining balance -> paid
  const rest = await request(app).post('/api/payments').set(bearer(tokens.staff)).send({ invoice_id: invoice.id, method: 'cash', amount: total - Number(half.body.payment.amount) });
  assert.equal(rest.status, 201);
  assert.equal(rest.body.invoice.status, 'paid');

  // No further payment allowed on a paid invoice -> 409
  const after = await request(app).post('/api/payments').set(bearer(tokens.staff)).send({ invoice_id: invoice.id, method: 'cash', amount: 1 });
  assert.equal(after.status, 409);
});
