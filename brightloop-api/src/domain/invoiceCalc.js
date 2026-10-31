'use strict';
// Pure invoice maths. Order of operations: line gross -> discounts -> tax on the discounted amount.
// Dates are 'YYYY-MM-DD' strings. Money is rounded to 2 decimals at every step.

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

function discountIsLive(d, asOf) {
  if (d.is_active === false) return false;
  if (d.starts_on && d.starts_on > asOf) return false;           // not started yet
  if (d.ends_on && d.ends_on < asOf) return false;               // expired
  if (d.usage_limit != null && d.used_count >= d.usage_limit) return false; // ran out
  return true;
}

// Spread `amount` over the given line indexes in proportion to their net value, never exceeding a line's net.
function allocate(amount, idxs, nets) {
  const total = sum(idxs, (i) => nets[i]);
  if (total <= 0) return [];
  let left = amount;
  return idxs.map((i, k) => {
    const share = k === idxs.length - 1 ? left : round2((amount * nets[i]) / total);
    const x = Math.max(0, Math.min(share, nets[i], left));
    left = round2(left - x);
    return [i, x];
  });
}

/**
 * lines:     [{ product_id, description, qty, unit_price, tax: {kind, rate} | null }]
 * discounts: rows from the discounts table (ordered by id)
 * asOf:      'YYYY-MM-DD'
 * returns:   { lines, applied: [{discount_id, amount}], subtotal, discount_total, tax_total, total }
 */
function calcInvoice({ lines, discounts = [], asOf }) {
  const L = lines.map((l) => ({ ...l, gross: round2(l.qty * l.unit_price), disc: 0 }));
  const subtotal = round2(sum(L, (l) => l.gross));
  const applied = [];

  for (const d of discounts) {
    if (!discountIsLive(d, asOf)) continue;

    const idxs = d.scope === 'product'
      ? L.map((l, i) => (l.product_id === d.product_id ? i : -1)).filter((i) => i >= 0)
      : L.map((_, i) => i);
    if (!idxs.length) continue;

    // Thresholds are checked against what the customer buys (gross), the amount against what is still payable.
    const purchase = sum(idxs, (i) => L[i].gross);
    const qty = sum(idxs, (i) => L[i].qty);
    if (purchase < Number(d.min_purchase || 0) || qty < Number(d.min_qty || 0)) continue;

    const nets = L.map((l) => round2(l.gross - l.disc));
    const base = round2(sum(idxs, (i) => nets[i]));
    if (base <= 0) continue;

    const value = Number(d.value);
    const wanted = d.kind === 'percent' ? round2((base * value) / 100) : Math.min(value, base);

    let got = 0;
    for (const [i, x] of allocate(round2(wanted), idxs, nets)) {
      L[i].disc = round2(L[i].disc + x);
      got = round2(got + x);
    }
    if (got > 0) applied.push({ discount_id: d.id, amount: got });
  }

  const out = L.map((l) => {
    const taxable = round2(l.gross - l.disc);
    let tax = 0;
    if (l.tax) {
      tax = l.tax.kind === 'percent' ? round2((taxable * Number(l.tax.rate)) / 100) : round2(Number(l.tax.rate) * l.qty);
    }
    return {
      product_id: l.product_id,
      description: l.description,
      qty: l.qty,
      unit_price: l.unit_price,
      discount_amount: l.disc,
      tax_amount: tax,
      line_total: round2(taxable + tax),
    };
  });

  const discount_total = round2(sum(out, (l) => l.discount_amount));
  const tax_total = round2(sum(out, (l) => l.tax_amount));
  return { lines: out, applied, subtotal, discount_total, tax_total, total: round2(subtotal - discount_total + tax_total) };
}

module.exports = { calcInvoice, round2 };
