'use strict';
const { calcInvoice } = require('../domain/invoiceCalc');
const { addPeriod, addDays, toDateStr, todayISO } = require('../domain/rules');

const MAX_PERIODS_PER_RUN = 366; // safety valve for very old daily subscriptions

/**
 * Bill ONE subscription for every period that is due up to `asOf`.
 * Runs in a single transaction. Safe to call twice: the UNIQUE(subscription_id, period_start)
 * constraint means a period can never be invoiced twice, and a missed period is picked up next run.
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {number} subscriptionId - Target subscription ID to bill
 * @param {object} [opts] - Billing options
 * @param {string} [opts.asOf] - Cutoff date string (ISO YYYY-MM-DD), defaults to today
 * @param {boolean} [opts.autoConfirm=false] - Whether generated invoices should be confirmed immediately
 * @returns {Promise<{ subscriptionId: number, created: object[], skipped: number }>}
 */
async function billSubscription(pool, subscriptionId, { asOf = todayISO(), autoConfirm = false } = {}) {
  const client = await pool.connect();
  const result = { subscriptionId, created: [], skipped: 0 };
  try {
    await client.query('BEGIN');

    // Row lock: two simultaneous billing runs cannot process the same subscription.
    const { rows: [sub] } = await client.query(
      `SELECT s.id, s.customer_id, s.status, s.start_date, s.expiry_date, s.next_invoice_date,
              s.payment_term_days, p.period, p.auto_close
         FROM subscriptions s JOIN plans p ON p.id = s.plan_id
        WHERE s.id = $1 FOR UPDATE OF s`, [subscriptionId]);
    if (!sub || sub.status !== 'active' || !sub.next_invoice_date) { await client.query('ROLLBACK'); return result; }

    const anchorDay = Number(toDateStr(sub.start_date).slice(8, 10));
    let next = toDateStr(sub.next_invoice_date);
    const expiry = toDateStr(sub.expiry_date);
    let finished = false;
    let guard = 0;

    while (next && next <= asOf && next <= expiry && guard++ < MAX_PERIODS_PER_RUN) {
      const periodStart = next;
      const following = addPeriod(periodStart, sub.period, anchorDay);
      const lastDay = addDays(following, -1);
      const periodEnd = lastDay > expiry ? expiry : lastDay;

      const { rows: lineRows } = await client.query(
        `SELECT l.product_id, l.qty, l.unit_price, pr.name AS product_name, v.value AS variant_value,
                t.kind AS tax_kind, t.rate AS tax_rate
           FROM subscription_lines l
           JOIN products pr ON pr.id = l.product_id
           LEFT JOIN product_variants v ON v.id = l.variant_id
           LEFT JOIN taxes t ON t.id = l.tax_id AND t.is_active
          WHERE l.subscription_id = $1 ORDER BY l.id`, [sub.id]);

      // Live discounts only; locked so used_count cannot be over-incremented by concurrent runs.
      // Consistent ORDER BY id avoids deadlocks.
      const { rows: discounts } = await client.query(
        `SELECT * FROM discounts
          WHERE is_active
            AND (starts_on IS NULL OR starts_on <= $1)
            AND (ends_on   IS NULL OR ends_on   >= $1)
            AND (usage_limit IS NULL OR used_count < usage_limit)
          ORDER BY id FOR UPDATE`, [periodStart]);

      const calc = calcInvoice({
        asOf: periodStart,
        lines: lineRows.map((l) => ({
          product_id: l.product_id,
          description: l.variant_value ? `${l.product_name} - ${l.variant_value}` : l.product_name,
          qty: l.qty,
          unit_price: l.unit_price,
          tax: l.tax_kind ? { kind: l.tax_kind, rate: l.tax_rate } : null,
        })),
        discounts: discounts.map((d) => ({ ...d, starts_on: toDateStr(d.starts_on), ends_on: toDateStr(d.ends_on) })),
      });

      const dueDate = addDays(periodStart, sub.payment_term_days);
      const { rows: inserted } = await client.query(
        `INSERT INTO invoices (subscription_id, customer_id, period_start, period_end, issue_date, due_date,
                               status, subtotal, discount_total, tax_total, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (subscription_id, period_start) DO NOTHING
         RETURNING id, number`,
        [sub.id, sub.customer_id, periodStart, periodEnd, periodStart, dueDate,
         autoConfirm ? 'confirmed' : 'draft', calc.subtotal, calc.discount_total, calc.tax_total, calc.total]);

      if (inserted.length === 0) {
        result.skipped += 1;                    // already billed earlier - just move on
      } else {
        const inv = inserted[0];
        for (const l of calc.lines) {
          await client.query(
            `INSERT INTO invoice_lines (invoice_id, product_id, description, qty, unit_price, discount_amount, tax_amount, line_total)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [inv.id, l.product_id, l.description, l.qty, l.unit_price, l.discount_amount, l.tax_amount, l.line_total]);
        }
        for (const a of calc.applied) {
          await client.query(
            'INSERT INTO discount_redemptions (discount_id, invoice_id, amount) VALUES ($1,$2,$3)',
            [a.discount_id, inv.id, a.amount]);
          await client.query('UPDATE discounts SET used_count = used_count + 1 WHERE id = $1', [a.discount_id]);
        }
        result.created.push({ id: inv.id, number: inv.number, total: calc.total, discount_total: calc.discount_total });
      }

      next = following;
      if (next > expiry) finished = true;
    }

    if (finished) {
      // Nothing left to bill. Plans flagged auto_close close themselves when the subscription ends.
      await client.query(
        `UPDATE subscriptions
            SET next_invoice_date = NULL,
                status    = CASE WHEN $2 THEN 'closed' ELSE status END,
                closed_at = CASE WHEN $2 THEN now() ELSE closed_at END
          WHERE id = $1`, [sub.id, sub.auto_close]);
    } else {
      await client.query('UPDATE subscriptions SET next_invoice_date = $2 WHERE id = $1', [sub.id, next]);
    }

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * The "billing day" button: bill every active subscription that is due.
 * One failing subscription never blocks the others - it is reported in `failed`.
 *
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {object} [opts] - Batch options
 * @param {string} [opts.asOf] - Cutoff date string (ISO YYYY-MM-DD), defaults to today
 * @param {boolean} [opts.autoConfirm=false] - Whether generated invoices should be confirmed immediately
 * @param {number|null} [opts.subscriptionId=null] - Optional single subscription filter
 * @returns {Promise<{ asOf: string, due: number, invoicesCreated: number, periodsSkipped: number, failed: object[], invoices: object[] }>}
 */
async function runBilling(pool, { asOf = todayISO(), autoConfirm = false, subscriptionId = null } = {}) {
  const params = [asOf];
  let filter = '';
  if (subscriptionId) { params.push(subscriptionId); filter = 'AND id = $2'; }
  const { rows: due } = await pool.query(
    `SELECT id FROM subscriptions
      WHERE status = 'active' AND next_invoice_date IS NOT NULL AND next_invoice_date <= $1 ${filter}
      ORDER BY id`, params);

  const summary = { asOf, due: due.length, invoicesCreated: 0, periodsSkipped: 0, failed: [], invoices: [] };
  for (const { id } of due) {
    try {
      const r = await billSubscription(pool, id, { asOf, autoConfirm });
      summary.invoicesCreated += r.created.length;
      summary.periodsSkipped += r.skipped;
      summary.invoices.push(...r.created);
    } catch (err) {
      summary.failed.push({ subscriptionId: id, error: err.message });
    }
  }
  return summary;
}

module.exports = { runBilling, billSubscription };
