'use strict';
// Usage:  DATABASE_URL=postgresql://user:pass@localhost:5432/subscriptions node db/seed.js --reset
// WARNING: --reset DROPS the public schema, re-applies db/schema.sql and re-seeds everything.
//
// Env: SEED_CUSTOMERS (default 1500), SEED_SUBS (default 5000)
// Demo logins (all satisfy the password rule):
//   admin@brightloop.test    / Admin@12345
//   staff@brightloop.test    / Staff@12345
//   customer@brightloop.test / Customer@123   (linked to customer #1)

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

const N_CUST = Number(process.env.SEED_CUSTOMERS || 1500);
const N_SUBS = Number(process.env.SEED_SUBS || 5000);

async function main() {
  if (!process.argv.includes('--reset')) {
    console.log('This script wipes the database. Re-run with --reset to confirm.');
    process.exit(1);
  }
  const client = await pool.connect();
  const t0 = Date.now();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

    await client.query('BEGIN');
    await client.query('SELECT setseed(0.42)'); // repeatable "random" data

    // ---- users (admin, staff, one portal customer) ----
    const [ha, hs, hc] = await Promise.all([
      bcrypt.hash('Admin@12345', 10), bcrypt.hash('Staff@12345', 10), bcrypt.hash('Customer@123', 10),
    ]);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES
         ('Asha Admin',  'admin@brightloop.test',    $1, 'admin'),
         ('Sam Staff',   'staff@brightloop.test',    $2, 'staff'),
         ('Cora Client', 'customer@brightloop.test', $3, 'customer')`, [ha, hs, hc]);

    // ---- catalogue ----
    await client.query(
      `INSERT INTO taxes (name, kind, rate) VALUES
         ('GST 18%', 'percent', 18), ('GST 5%', 'percent', 5), ('Exempt', 'percent', 0)`);
    await client.query(
      `INSERT INTO products (name, type, sales_price, cost_price, notes, tax_id) VALUES
         ('Business ERP Suite', 'software', 2400, 900, 'Core product, sold in brand variants', 1),
         ('Analytics Add-on',   'addon',     600, 150, 'Switch on or off any time',            1),
         ('Priority Support',   'service',  1200, 400, '24x7 support pack',                    1),
         ('Starter CRM',        'software',  999, 300, 'Entry plan for small shops',           2)`);
    await client.query(
      `INSERT INTO product_variants (product_id, attribute, value, extra_price) VALUES
         (1, 'Brand', 'Odoo', 560), (1, 'Brand', 'Zoho', 320), (1, 'Brand', 'Tally', 0)`);
    await client.query(
      `INSERT INTO plans (name, price, period, min_qty, available_from, available_to,
                          auto_close, allow_early_close, allow_pause, allow_renew) VALUES
         ('Daily Trial',     99,    'daily',   1, '2026-01-01', '2027-12-31', TRUE,  FALSE, FALSE, FALSE),
         ('Weekly Team',     499,   'weekly',  1, '2026-01-01', '2027-12-31', TRUE,  TRUE,  TRUE,  FALSE),
         ('Monthly Pro',     2999,  'monthly', 1, '2026-01-01', '2027-12-31', FALSE, TRUE,  TRUE,  TRUE),
         ('Yearly Business', 29990, 'yearly',  5, '2026-01-01', '2027-12-31', FALSE, TRUE,  FALSE, TRUE)`);
    await client.query(
      `INSERT INTO quotation_templates (name, plan_id, validity_days) VALUES
         ('Starter bundle', 3, 30), ('Enterprise yearly', 4, 30)`);
    await client.query(
      `INSERT INTO quotation_template_lines (template_id, product_id, variant_id, qty) VALUES
         (1, 4, NULL, 1), (2, 1, 1, 10), (2, 3, NULL, 1)`);
    await client.query(
      `INSERT INTO discounts (name, kind, value, min_purchase, min_qty, starts_on, ends_on, usage_limit, used_count, scope, product_id) VALUES
         ('Volume 10% (5+ seats)',  'percent', 10,  0,    5, '2026-01-01', '2027-12-31', NULL, 0, 'subscription', NULL),
         ('Flat 500 off big deals', 'fixed',   500, 5000, 0, '2026-01-01', '2027-12-31', 50,   0, 'subscription', NULL),
         ('Support promo 20%',      'percent', 20,  0,    0, '2026-01-01', '2027-03-31', 100,  0, 'product',      3),
         ('Diwali (expired)',       'percent', 15,  0,    0, '2026-10-01', '2026-10-15', NULL, 0, 'subscription', NULL),
         ('Early bird (used up)',   'fixed',   100, 0,    0, '2026-01-01', '2027-12-31', 5,    5, 'subscription', NULL)`);

    // ---- customers: #1 is the portal demo customer ----
    await client.query(
      `INSERT INTO customers (user_id, name, company, phone, address)
       VALUES (3, 'Cora Client', 'Demo Retail Pvt Ltd', '+91-9000000001', 'Lucknow, UP')`);
    await client.query(
      `INSERT INTO customers (name, company, phone, address)
       SELECT 'Customer ' || lpad(g::text, 4, '0'),
              'Company ' || g || ' Pvt Ltd',
              '+91-9' || lpad((floor(random() * 1e8))::bigint::text, 9, '0'),
              'India'
         FROM generate_series(2, $1::int) g`, [N_CUST]);

    // ---- subscriptions: mostly active, some in every other state ----
    await client.query(
      `WITH base AS MATERIALIZED (
         SELECT g,
                1 + floor(random() * $1::int)::int AS cust,
                (ARRAY[1,2,3,3,3,3,3,4,4,4])[1 + floor(random() * 10)::int] AS plan_id,
                random() AS s,
                random() AS rs
           FROM generate_series(1, $2::int) g
       )
       INSERT INTO subscriptions (customer_id, plan_id, start_date, expiry_date, payment_term_days, status, quote_valid_until)
       SELECT b.cust, b.plan_id, d.sd,
              d.sd + CASE p.period WHEN 'daily' THEN 30 WHEN 'weekly' THEN 90 WHEN 'monthly' THEN 365 ELSE 730 END,
              15, st.status,
              CASE WHEN st.status IN ('draft', 'quotation') THEN current_date + 30 END
         FROM base b
         JOIN plans p ON p.id = b.plan_id
         CROSS JOIN LATERAL (SELECT CASE WHEN b.s < 0.04 THEN 'draft'
                                         WHEN b.s < 0.08 THEN 'quotation'
                                         WHEN b.s < 0.12 THEN 'confirmed'
                                         WHEN b.s < 0.88 THEN 'active'
                                         WHEN b.s < 0.93 THEN 'paused'
                                         ELSE 'closed' END AS status) st
         CROSS JOIN LATERAL (SELECT CASE WHEN st.status IN ('draft', 'quotation', 'confirmed')
                                         THEN current_date + floor(b.rs * 14)::int
                                         ELSE current_date - floor(b.rs * CASE p.period WHEN 'daily' THEN 10
                                                                                        WHEN 'weekly' THEN 56
                                                                                        WHEN 'monthly' THEN 150
                                                                                        ELSE 400 END)::int
                                    END AS raw) r
         CROSS JOIN LATERAL (SELECT CASE WHEN extract(day FROM r.raw) > 28
                                         THEN (date_trunc('month', r.raw)::date + 27)
                                         ELSE r.raw END AS sd) d`, [N_CUST, N_SUBS]);
    await client.query(`UPDATE subscriptions SET paused_at = now() WHERE status = 'paused'`);
    await client.query(`UPDATE subscriptions SET closed_at = now() WHERE status = 'closed'`);

    // ---- subscription lines (1-3 per subscription; product 1 gets a brand variant) ----
    await client.query(
      `INSERT INTO subscription_lines (subscription_id, product_id, variant_id, qty, unit_price, tax_id)
       SELECT s.id, pr.id, v.id, 1 + (s.id % 12), pr.sales_price + COALESCE(v.extra_price, 0), pr.tax_id
         FROM subscriptions s
         JOIN products pr ON pr.id = 1 + (s.id % 4)
         LEFT JOIN product_variants v ON v.product_id = pr.id
              AND v.value = CASE WHEN s.id % 2 = 0 THEN 'Odoo' ELSE 'Zoho' END`);
    await client.query(
      `INSERT INTO subscription_lines (subscription_id, product_id, qty, unit_price, tax_id)
       SELECT s.id, pr.id, 1 + (s.id % 5), pr.sales_price, pr.tax_id
         FROM subscriptions s JOIN products pr ON pr.id = 3
        WHERE s.id % 3 = 0 AND (s.id % 4) + 1 <> 3`);
    await client.query(
      `INSERT INTO subscription_lines (subscription_id, product_id, qty, unit_price, tax_id)
       SELECT s.id, pr.id, 1 + (s.id % 5), pr.sales_price, pr.tax_id
         FROM subscriptions s JOIN products pr ON pr.id = 2
        WHERE s.id % 5 = 0 AND (s.id % 4) + 1 <> 2`);

    // ---- invoice history up to YESTERDAY for active / paused / closed subscriptions ----
    // (Periods that fall due today stay unbilled, so "Run billing" has real work to do in the demo.)
    await client.query(
      `CREATE TEMP TABLE _sub_tot AS
       SELECT s.id AS subscription_id,
              SUM(l.amount) AS subtotal,
              SUM(ROUND(l.amount * COALESCE(t.rate, 0) / 100, 2)) AS tax
         FROM subscriptions s
         JOIN subscription_lines l ON l.subscription_id = s.id
         LEFT JOIN taxes t ON t.id = l.tax_id
        GROUP BY s.id`);
    await client.query(
      `CREATE TEMP TABLE _hist AS
       SELECT s.id AS subscription_id, s.customer_id, s.payment_term_days AS term,
              g::date AS period_start,
              (g + CASE p.period WHEN 'daily' THEN interval '1 day' WHEN 'weekly' THEN interval '7 days'
                                 WHEN 'monthly' THEN interval '1 month' ELSE interval '1 year' END)::date - 1 AS period_end
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         CROSS JOIN LATERAL generate_series(
              s.start_date::timestamp, (current_date - 1)::timestamp,
              CASE p.period WHEN 'daily' THEN interval '1 day' WHEN 'weekly' THEN interval '7 days'
                            WHEN 'monthly' THEN interval '1 month' ELSE interval '1 year' END) g
        WHERE s.status IN ('active', 'paused', 'closed')`);
    await client.query(
      `INSERT INTO invoices (subscription_id, customer_id, period_start, period_end, issue_date, due_date,
                             status, subtotal, discount_total, tax_total, total, amount_paid)
       SELECT h.subscription_id, h.customer_id, h.period_start, h.period_end, h.period_start,
              h.period_start + h.term, 'confirmed', t.subtotal, 0, t.tax, t.subtotal + t.tax, 0
         FROM _hist h JOIN _sub_tot t USING (subscription_id)
        ORDER BY h.period_start, h.subscription_id`);
    await client.query(
      `INSERT INTO invoice_lines (invoice_id, product_id, description, qty, unit_price, discount_amount, tax_amount, line_total)
       SELECT i.id, l.product_id, pr.name || COALESCE(' - ' || v.value, ''), l.qty, l.unit_price, 0,
              ROUND(l.amount * COALESCE(t.rate, 0) / 100, 2),
              l.amount + ROUND(l.amount * COALESCE(t.rate, 0) / 100, 2)
         FROM invoices i
         JOIN subscription_lines l ON l.subscription_id = i.subscription_id
         JOIN products pr ON pr.id = l.product_id
         LEFT JOIN product_variants v ON v.id = l.variant_id
         LEFT JOIN taxes t ON t.id = l.tax_id`);

    // ---- payments: ~72% paid in full, ~10% part-paid, ~18% unpaid (some overdue) ----
    await client.query(
      `CREATE TEMP TABLE _pay AS
       SELECT id AS invoice_id, total, issue_date, random() AS r FROM invoices`);
    await client.query(
      `INSERT INTO payments (invoice_id, method, amount, paid_on, note)
       SELECT invoice_id,
              (ARRAY['card','upi','bank_transfer','cash','cheque'])[1 + floor(random() * 5)::int],
              CASE WHEN r < 0.72 THEN total ELSE ROUND(total * 0.5, 2) END,
              LEAST(issue_date + floor(random() * 10)::int, current_date),
              'Seeded payment'
         FROM _pay WHERE r < 0.82`);
    await client.query(
      `UPDATE invoices i
          SET amount_paid = p.paid,
              status = CASE WHEN p.paid >= i.total THEN 'paid' ELSE 'confirmed' END,
              paid_at = CASE WHEN p.paid >= i.total THEN now() ELSE NULL END
         FROM (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) p
        WHERE p.invoice_id = i.id`);

    // ---- next billing date for live subscriptions ----
    await client.query(
      `UPDATE subscriptions s
          SET next_invoice_date = (m.last_start::timestamp +
                CASE p.period WHEN 'daily' THEN interval '1 day' WHEN 'weekly' THEN interval '7 days'
                              WHEN 'monthly' THEN interval '1 month' ELSE interval '1 year' END)::date
         FROM (SELECT subscription_id, MAX(period_start) AS last_start FROM invoices GROUP BY subscription_id) m,
              plans p
        WHERE m.subscription_id = s.id AND p.id = s.plan_id AND s.status IN ('active', 'paused')`);
    await client.query(
      `UPDATE subscriptions SET next_invoice_date = start_date
        WHERE status IN ('active', 'paused') AND next_invoice_date IS NULL`);

    await client.query('COMMIT');
    await client.query('ANALYZE');

    const { rows: [c] } = await client.query(
      `SELECT (SELECT count(*) FROM customers) AS customers,
              (SELECT count(*) FROM subscriptions) AS subscriptions,
              (SELECT count(*) FROM subscriptions WHERE status = 'active' AND next_invoice_date <= current_date) AS due_today,
              (SELECT count(*) FROM invoices) AS invoices,
              (SELECT count(*) FROM payments) AS payments,
              (SELECT count(*) FROM v_overdue_invoices) AS overdue`);
    console.log('Seeded in', ((Date.now() - t0) / 1000).toFixed(1), 's', c);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
