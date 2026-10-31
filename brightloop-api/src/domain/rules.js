'use strict';
// Pure business rules - no database access, so they are easy to unit test.

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;       // 400 validation, 403 forbidden, 404 missing, 409 conflict
    this.details = details;
  }
}

// ---------- Password: more than 8 chars, upper, lower, special ----------
function validatePassword(pw) {
  const errors = [];
  if (typeof pw !== 'string' || pw.length <= 8) errors.push('Password must be more than 8 characters');
  if (!/[A-Z]/.test(pw || '')) errors.push('Password needs an uppercase letter');
  if (!/[a-z]/.test(pw || '')) errors.push('Password needs a lowercase letter');
  if (!/[^A-Za-z0-9\s]/.test(pw || '')) errors.push('Password needs a special character');
  return errors; // empty array = valid
}

// ---------- State machines ----------
const SUB_TRANSITIONS = {
  draft:     ['quotation'],
  quotation: ['confirmed'],
  confirmed: ['active'],
  active:    ['paused', 'closed'],
  paused:    ['active', 'closed'],
  closed:    [],
};
const INVOICE_TRANSITIONS = {
  draft:     ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid:      [],
  cancelled: [],
};

function assertTransition(map, from, to, label = 'record') {
  if (!(map[from] || []).includes(to)) {
    throw new HttpError(409, `Cannot move ${label} from "${from}" to "${to}"`, { allowed: map[from] || [] });
  }
}

// ---------- Dates as 'YYYY-MM-DD' strings (avoids timezone surprises) ----------
const pad = (n) => String(n).padStart(2, '0');
const toISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; };
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based

// Accepts a 'YYYY-MM-DD' string, an ISO timestamp string or a JS Date (node-pg returns local-midnight Dates for DATE).
function toDateStr(v) {
  if (v == null) return null;
  if (v instanceof Date) return toISO(v.getFullYear(), v.getMonth() + 1, v.getDate());
  return String(v).slice(0, 10);
}
const todayISO = () => toDateStr(new Date());

function addDays(iso, n) {
  const { y, m, d } = parseISO(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

// anchorDay keeps month-end subscriptions stable: Jan 31 -> Feb 28 -> Mar 31 (not Mar 28)
function addMonths(iso, n, anchorDay) {
  const { y, m, d } = parseISO(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toISO(ny, nm, Math.min(anchorDay || d, daysInMonth(ny, nm)));
}

function addPeriod(iso, period, anchorDay) {
  switch (period) {
    case 'daily':   return addDays(iso, 1);
    case 'weekly':  return addDays(iso, 7);
    case 'monthly': return addMonths(iso, 1, anchorDay);
    case 'yearly':  return addMonths(iso, 12, anchorDay);
    default: throw new HttpError(400, `Unknown billing period "${period}"`);
  }
}

module.exports = {
  HttpError, validatePassword, SUB_TRANSITIONS, INVOICE_TRANSITIONS, assertTransition,
  toDateStr, todayISO, addDays, addMonths, addPeriod,
};
