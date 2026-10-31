'use strict';
const {
  HttpError, SUB_TRANSITIONS, INVOICE_TRANSITIONS, assertTransition, toDateStr, todayISO, addDays,
} = require('../domain/rules');

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'upi', 'cheque'];

async function withTx(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const audit = (client, actorId, entity, id, action, meta = null) =>
  client.query('INSERT INTO audit_log (actor_id, entity, entity_id, action, meta) VALUES ($1,$2,$3,$4,$5)',
    [actorId || null, entity, id, action, meta ? JSON.stringify(meta) : null]);

/** Move a subscription: draft -> quotation -> confirmed -> active -> (paused) -> closed. */
function transitionSubscription(pool, id, to, { userId } = {}) {
  return withTx(pool, async (client) => {
    const { rows: [s] } = await client.query(
      `SELECT s.*, p.allow_pause, p.allow_early_close, p.available_from, p.available_to
         FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.id = $1 FOR UPDATE OF s`, [id]);
    if (!s) throw new HttpError(404, 'Subscription not found');
    assertTransition(SUB_TRANSITIONS, s.status, to, 'subscription');
    const today = todayISO();

    if (to === 'confirmed' && s.quote_valid_until && toDateStr(s.quote_valid_until) < today) {
      throw new HttpError(409, 'This quotation has expired');
    }
    if (to === 'confirmed' && s.available_to && toDateStr(s.available_to) < today) {
      throw new HttpError(409, 'The plan is no longer available');
    }
    if (to === 'paused' && !s.allow_pause) throw new HttpError(409, 'This plan cannot be paused');
    if (to === 'closed' && toDateStr(s.expiry_date) >= today && !s.allow_early_close) {
      throw new HttpError(409, 'This plan cannot be closed before its expiry date');
    }

    let sql; let params;
    if (to === 'active' && s.status === 'confirmed') {
      sql = `UPDATE subscriptions SET status='active', next_invoice_date = COALESCE(next_invoice_date, start_date) WHERE id=$1 RETURNING *`;
    } else if (to === 'active') {
      // Resume from pause: skip the periods spent paused rather than billing them retroactively,
      // BUT never drop a period that was already due (next_invoice_date in the past) before the
      // pause - that invoice is genuinely owed, so keep the earlier anchor and let billing catch up.
      sql = `UPDATE subscriptions SET status='active', paused_at=NULL,
                    next_invoice_date = CASE
                      WHEN next_invoice_date < COALESCE(paused_at::date, CURRENT_DATE)
                        THEN next_invoice_date
                      ELSE GREATEST(next_invoice_date, CURRENT_DATE)
                    END WHERE id=$1 RETURNING *`;
    } else if (to === 'paused') {
      sql = `UPDATE subscriptions SET status='paused', paused_at=now() WHERE id=$1 RETURNING *`;
    } else if (to === 'closed') {
      sql = `UPDATE subscriptions SET status='closed', closed_at=now(), next_invoice_date=NULL WHERE id=$1 RETURNING *`;
    } else {
      sql = `UPDATE subscriptions SET status=$2 WHERE id=$1 RETURNING *`;
    }
    params = to === 'quotation' || to === 'confirmed' ? [id, to] : [id];
    const { rows: [updated] } = await client.query(sql, params);
    await audit(client, userId, 'subscription', id, `status:${s.status}->${to}`);
    return updated;
  });
}

/** Invoice actions: confirm, cancel. (Paid is reached only by recording payments.) */
function transitionInvoice(pool, id, to, { userId } = {}) {
  return withTx(pool, async (client) => {
    const { rows: [inv] } = await client.query('SELECT * FROM invoices WHERE id = $1 FOR UPDATE', [id]);
    if (!inv) throw new HttpError(404, 'Invoice not found');
    assertTransition(INVOICE_TRANSITIONS, inv.status, to, 'invoice');
    if (to === 'paid' && inv.amount_paid < inv.total) throw new HttpError(409, 'Invoice is not fully paid yet');
    if (to === 'cancelled' && inv.amount_paid > 0) throw new HttpError(409, 'Cannot cancel an invoice that has payments');
    const { rows: [updated] } = await client.query('UPDATE invoices SET status = $2 WHERE id = $1 RETURNING *', [id, to]);
    await audit(client, userId, 'invoice', id, `status:${inv.status}->${to}`);
    return updated;
  });
}

/** Record a payment (method, amount, date, note) against one invoice; flips it to Paid when settled. */
function recordPayment(pool, { invoiceId, method, amount, paidOn, note, userId }) {
  const amt = Number(amount);
  if (!PAYMENT_METHODS.includes(method)) throw new HttpError(400, `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`);
  if (!Number.isFinite(amt) || amt <= 0) throw new HttpError(400, 'Amount must be greater than zero');
  const date = paidOn ? toDateStr(paidOn) : todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'Payment date must be YYYY-MM-DD');

  return withTx(pool, async (client) => {
    const { rows: [inv] } = await client.query('SELECT * FROM invoices WHERE id = $1 FOR UPDATE', [invoiceId]);
    if (!inv) throw new HttpError(404, 'Invoice not found');
    if (inv.status !== 'confirmed') throw new HttpError(409, `Payments can only be recorded on confirmed invoices (this one is ${inv.status})`);

    const balance = Math.round((inv.total - inv.amount_paid) * 100) / 100;
    if (amt > balance + 0.001) throw new HttpError(409, `Payment exceeds the outstanding balance of ${balance.toFixed(2)}`);

    const { rows: [payment] } = await client.query(
      'INSERT INTO payments (invoice_id, method, amount, paid_on, note, recorded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [invoiceId, method, amt, date, note || null, userId || null]);
    const paid = Math.round((inv.amount_paid + amt) * 100) / 100;
    const settled = paid >= inv.total;
    const { rows: [invoice] } = await client.query(
      `UPDATE invoices SET amount_paid = $2, status = CASE WHEN $3 THEN 'paid' ELSE status END,
              paid_at = CASE WHEN $3 THEN now() ELSE paid_at END WHERE id = $1 RETURNING *`,
      [invoiceId, paid, settled]);
    await audit(client, userId, 'payment', payment.id, 'recorded', { invoiceId, amount: amt, method });
    return { payment, invoice };
  });
}


/** Renew an active subscription: extend expiry by its original length and restart billing from the day after the old expiry. */
function renewSubscription(pool, id, { userId } = {}) {
  return withTx(pool, async (client) => {
    const { rows: [s] } = await client.query(
      `SELECT s.*, p.allow_renew FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.id = $1 FOR UPDATE OF s`, [id]);
    if (!s) throw new HttpError(404, 'Subscription not found');
    if (!s.allow_renew) throw new HttpError(409, 'This plan cannot be renewed');
    if (s.status !== 'active') throw new HttpError(409, `Only active subscriptions can be renewed (this one is ${s.status})`);
    const start = toDateStr(s.start_date);
    const oldExpiry = toDateStr(s.expiry_date);
    const span = Math.round((Date.parse(oldExpiry) - Date.parse(start)) / 86400000) || 1;
    const newExpiry = addDays(oldExpiry, span);
    const { rows: [updated] } = await client.query(
      `UPDATE subscriptions SET expiry_date = $2, next_invoice_date = COALESCE(next_invoice_date, $3) WHERE id = $1 RETURNING *`,
      [id, newExpiry, addDays(oldExpiry, 1)]);
    await audit(client, userId, 'subscription', id, 'renewed', { from: oldExpiry, to: newExpiry });
    return updated;
  });
}

module.exports = { transitionSubscription, transitionInvoice, recordPayment, renewSubscription, withTx, audit, PAYMENT_METHODS };
