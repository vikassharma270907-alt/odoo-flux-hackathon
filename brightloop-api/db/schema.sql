-- Brightloop Subscription Management System - PostgreSQL schema (PostgreSQL 12+)
-- Text + CHECK constraints are used instead of enum types so any ORM can map them easily.
-- Money is NUMERIC(12,2). Dates are DATE. Integer primary keys everywhere.

CREATE SEQUENCE subscription_seq START 1;
CREATE SEQUENCE invoice_seq START 1;

-- ---------- Auth ----------
CREATE TABLE users (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('admin','staff','customer')),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  reset_token_hash TEXT,
  reset_expires    TIMESTAMPTZ,
  created_by       INT REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One account per email, case-insensitive
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));

CREATE TABLE customers (
  id         SERIAL PRIMARY KEY,
  user_id    INT UNIQUE REFERENCES users(id),   -- portal login (nullable: staff-created customers)
  name       TEXT NOT NULL,
  company    TEXT,
  phone      TEXT,
  address    TEXT,
  tax_no     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customers_name_idx ON customers (name);

-- ---------- Catalogue ----------
CREATE TABLE taxes (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
  rate      NUMERIC(10,4) NOT NULL CHECK (rate >= 0),   -- percent: 18 = 18%; fixed: amount per unit
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,                              -- e.g. software, addon, service
  sales_price NUMERIC(12,2) NOT NULL CHECK (sales_price >= 0),
  cost_price  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  notes       TEXT,
  tax_id      INT REFERENCES taxes(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_variants (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute   TEXT NOT NULL,                              -- e.g. Brand
  value       TEXT NOT NULL,                              -- e.g. Odoo
  extra_price NUMERIC(12,2) NOT NULL DEFAULT 0,           -- Odoo => 560
  UNIQUE (product_id, attribute, value)
);

CREATE TABLE plans (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  price             NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  period            TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly','yearly')),
  min_qty           INT NOT NULL DEFAULT 1 CHECK (min_qty >= 1),
  available_from    DATE,
  available_to      DATE,
  auto_close        BOOLEAN NOT NULL DEFAULT FALSE,   -- closes itself when the subscription expires
  allow_early_close BOOLEAN NOT NULL DEFAULT TRUE,
  allow_pause       BOOLEAN NOT NULL DEFAULT TRUE,
  allow_renew       BOOLEAN NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (available_to IS NULL OR available_from IS NULL OR available_to >= available_from)
);

CREATE TABLE quotation_templates (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  plan_id       INT NOT NULL REFERENCES plans(id),
  validity_days INT NOT NULL DEFAULT 30 CHECK (validity_days > 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE quotation_template_lines (
  id          SERIAL PRIMARY KEY,
  template_id INT NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  variant_id  INT REFERENCES product_variants(id),
  qty         INT NOT NULL DEFAULT 1 CHECK (qty > 0)
);

-- ---------- Subscriptions ----------
CREATE TABLE subscriptions (
  id                SERIAL PRIMARY KEY,
  number            TEXT NOT NULL UNIQUE
                    DEFAULT ('SUB-' || lpad(nextval('subscription_seq')::text, 5, '0')),
  customer_id       INT NOT NULL REFERENCES customers(id),
  plan_id           INT NOT NULL REFERENCES plans(id),
  template_id       INT REFERENCES quotation_templates(id),
  start_date        DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  payment_term_days INT NOT NULL DEFAULT 15 CHECK (payment_term_days >= 0),
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','quotation','confirmed','active','paused','closed')),
  quote_valid_until DATE,
  next_invoice_date DATE,                      -- NULL when nothing is left to bill
  paused_at         TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  created_by        INT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expiry_date >= start_date)
);
CREATE INDEX subs_status_idx   ON subscriptions (status);
CREATE INDEX subs_customer_idx ON subscriptions (customer_id);
CREATE INDEX subs_plan_idx     ON subscriptions (plan_id);
CREATE INDEX subs_due_idx      ON subscriptions (next_invoice_date) WHERE status = 'active';

CREATE TABLE subscription_lines (
  id              SERIAL PRIMARY KEY,
  subscription_id INT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  product_id      INT NOT NULL REFERENCES products(id),
  variant_id      INT REFERENCES product_variants(id),
  qty             INT NOT NULL CHECK (qty > 0),
  unit_price      NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),  -- snapshot: sales_price + variant extra
  tax_id          INT REFERENCES taxes(id),
  amount          NUMERIC(12,2) GENERATED ALWAYS AS (qty * unit_price) STORED  -- before tax
);
CREATE INDEX sub_lines_sub_idx ON subscription_lines (subscription_id);

-- ---------- Discounts ----------
CREATE TABLE discounts (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
  value        NUMERIC(12,2) NOT NULL CHECK (value > 0),
  min_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_qty      INT NOT NULL DEFAULT 0,
  starts_on    DATE,
  ends_on      DATE,
  usage_limit  INT,                                 -- NULL = unlimited
  used_count   INT NOT NULL DEFAULT 0,
  scope        TEXT NOT NULL DEFAULT 'subscription' CHECK (scope IN ('product','subscription')),
  product_id   INT REFERENCES products(id),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (kind <> 'percent' OR value <= 100),
  CHECK (scope <> 'product' OR product_id IS NOT NULL),
  CHECK (usage_limit IS NULL OR used_count <= usage_limit)
);

-- ---------- Invoices & payments ----------
CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  number          TEXT NOT NULL UNIQUE
                  DEFAULT ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 6, '0')),
  subscription_id INT NOT NULL REFERENCES subscriptions(id),
  customer_id     INT NOT NULL REFERENCES customers(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','paid','cancelled')),
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- "Nothing billed twice": one invoice per subscription per billing period
  CONSTRAINT invoices_period_uq UNIQUE (subscription_id, period_start),
  CHECK (amount_paid >= 0 AND amount_paid <= total)
);
CREATE INDEX inv_status_idx   ON invoices (status);
CREATE INDEX inv_customer_idx ON invoices (customer_id);
CREATE INDEX inv_issue_idx    ON invoices (issue_date);
CREATE INDEX inv_overdue_idx  ON invoices (due_date) WHERE status = 'confirmed';

CREATE TABLE invoice_lines (
  id              SERIAL PRIMARY KEY,
  invoice_id      INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id      INT REFERENCES products(id),
  description     TEXT NOT NULL,
  qty             INT NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(12,2) NOT NULL
);
CREATE INDEX inv_lines_inv_idx ON invoice_lines (invoice_id);

CREATE TABLE discount_redemptions (
  id          SERIAL PRIMARY KEY,
  discount_id INT NOT NULL REFERENCES discounts(id),
  invoice_id  INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  UNIQUE (discount_id, invoice_id)
);

CREATE TABLE payments (
  id          SERIAL PRIMARY KEY,
  invoice_id  INT NOT NULL REFERENCES invoices(id),
  method      TEXT NOT NULL CHECK (method IN ('cash','bank_transfer','card','upi','cheque')),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_on     DATE NOT NULL,
  note        TEXT,
  recorded_by INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pay_invoice_idx ON payments (invoice_id);
CREATE INDEX pay_paid_on_idx ON payments (paid_on);

CREATE TABLE audit_log (
  id        BIGSERIAL PRIMARY KEY,
  actor_id  INT REFERENCES users(id),
  entity    TEXT NOT NULL,
  entity_id INT,
  action    TEXT NOT NULL,
  meta      JSONB,
  at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON audit_log (entity, entity_id);

-- ---------- Reporting views ----------
-- Overdue is derived, never stored.
CREATE VIEW v_overdue_invoices AS
SELECT i.id, i.number, i.customer_id, c.name AS customer_name, i.subscription_id,
       i.due_date, i.total, i.amount_paid, (i.total - i.amount_paid) AS balance,
       (current_date - i.due_date) AS days_overdue
FROM invoices i
JOIN customers c ON c.id = i.customer_id
WHERE i.status = 'confirmed' AND i.due_date < current_date AND i.total > i.amount_paid;

-- Monthly recurring revenue (before tax), normalised to a month
CREATE VIEW v_mrr AS
SELECT COALESCE(SUM(l.amount * CASE p.period
         WHEN 'daily'   THEN 365.0 / 12
         WHEN 'weekly'  THEN 52.0 / 12
         WHEN 'monthly' THEN 1
         ELSE 1.0 / 12 END), 0)::NUMERIC(14,2) AS mrr
FROM subscription_lines l
JOIN subscriptions s ON s.id = l.subscription_id AND s.status = 'active'
JOIN plans p ON p.id = s.plan_id;

CREATE VIEW v_dashboard_summary AS
SELECT
  (SELECT count(*) FROM subscriptions WHERE status = 'active')                            AS active_subscriptions,
  (SELECT COALESCE(sum(amount), 0) FROM payments)                                         AS revenue_collected,
  (SELECT COALESCE(sum(total - amount_paid), 0) FROM invoices WHERE status = 'confirmed') AS outstanding,
  (SELECT count(*) FROM v_overdue_invoices)                                               AS overdue_invoices,
  (SELECT COALESCE(sum(balance), 0) FROM v_overdue_invoices)                              AS overdue_amount,
  (SELECT mrr FROM v_mrr)                                                                 AS mrr;
