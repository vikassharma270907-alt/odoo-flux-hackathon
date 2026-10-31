'use strict';
// Shared setup for integration tests.
//
// IMPORTANT: this module sets DATABASE_URL to the TEST database BEFORE anything
// requires src/db (which builds its pool from DATABASE_URL at load time). Test
// files must require this helper before requiring ../src/app.
//
// Point it at your test DB with TEST_DATABASE_URL, otherwise it defaults to the
// local Docker Postgres with the database name `subscriptions_test`.
const fs = require('fs');
const path = require('path');

const TEST_URL = process.env.TEST_DATABASE_URL
  || 'postgresql://postgres:postgres@localhost:5432/subscriptions_test';

// Safety guard: resetSchema() runs a destructive DROP SCHEMA. Refuse to run unless the
// target database name clearly looks like a throwaway test database, so a mis-set
// TEST_DATABASE_URL can never wipe the real `subscriptions` demo data.
const dbName = (TEST_URL.split('/').pop() || '').split('?')[0];
if (!/test/i.test(dbName)) {
  throw new Error(
    `Refusing to run integration tests against database "${dbName}". `
    + 'The database name must contain "test" (e.g. subscriptions_test). '
    + 'Set TEST_DATABASE_URL to a dedicated test database.');
}

process.env.DATABASE_URL = TEST_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret-please-change';

const bcrypt = require('bcryptjs');
const { pool } = require('../../src/db');

const schemaSql = fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8');

// Rebuild a clean schema. Only ever runs against a *_test database (guarded above).
async function resetSchema() {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(schemaSql);
}

/**
 * Insert a small, deterministic fixture:
 *  - admin / staff / customer users (customer #1 linked)
 *  - a second customer (#2) that the portal customer must NOT see
 *  - one taxed product, a monthly plan, one active subscription due today
 *  - one active discount and one already-expired discount
 * Returns the ids the tests need.
 */
async function seedFixture({ today }) {
  const [ha, hs, hc] = await Promise.all([
    bcrypt.hash('Admin@12345', 10), bcrypt.hash('Staff@12345', 10), bcrypt.hash('Customer@123', 10),
  ]);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES
       ('Asha Admin','admin@brightloop.test',$1,'admin'),
       ('Sam Staff','staff@brightloop.test',$2,'staff'),
       ('Cora Client','customer@brightloop.test',$3,'customer')`, [ha, hs, hc]);

  await pool.query(`INSERT INTO taxes (name, kind, rate) VALUES ('GST 18%','percent',18)`);
  await pool.query(
    `INSERT INTO products (name, type, sales_price, cost_price, tax_id) VALUES ('ERP Suite','software',1000,300,1)`);
  await pool.query(
    `INSERT INTO plans (name, price, period, min_qty, auto_close, allow_early_close, allow_pause, allow_renew)
     VALUES ('Monthly Pro',1000,'monthly',1,FALSE,TRUE,TRUE,TRUE)`);

  // customer #1 linked to the portal user; customer #2 belongs to nobody (isolation target)
  await pool.query(`INSERT INTO customers (user_id, name) VALUES (3,'Cora Client')`);
  await pool.query(`INSERT INTO customers (name) VALUES ('Other Co')`);

  // One ACTIVE subscription for customer #1, due today, qty 2 (amount 2000 before tax)
  const { rows: [sub] } = await pool.query(
    `INSERT INTO subscriptions (customer_id, plan_id, start_date, expiry_date, payment_term_days, status, next_invoice_date)
     VALUES (1,1,$1,$2,15,'active',$1) RETURNING id`, [today, addYears(today, 1)]);
  await pool.query(
    `INSERT INTO subscription_lines (subscription_id, product_id, qty, unit_price, tax_id) VALUES ($1,1,2,1000,1)`, [sub.id]);

  // One live discount (10% subscription-wide) and one expired discount (should never apply)
  await pool.query(
    `INSERT INTO discounts (name, kind, value, min_purchase, min_qty, starts_on, ends_on, scope)
     VALUES ('Live 10%','percent',10,0,0,$1,$2,'subscription')`, [addYears(today, -1), addYears(today, 1)]);
  await pool.query(
    `INSERT INTO discounts (name, kind, value, min_purchase, min_qty, starts_on, ends_on, scope)
     VALUES ('Expired 50%','percent',50,0,0,$1,$2,'subscription')`, [addYears(today, -1), addDays(today, -1)]);

  return { subscriptionId: sub.id, customer1: 1, customer2: 2 };
}

// Tiny date helpers so the fixture does not depend on src/domain.
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function addYears(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCFullYear(d.getUTCFullYear() + n); return d.toISOString().slice(0, 10); }

module.exports = { pool, resetSchema, seedFixture, addDays, addYears };
