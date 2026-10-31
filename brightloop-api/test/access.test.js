'use strict';
// Access-control & validation guard tests.
// These exercise the auth middleware and domain rules directly (no DB/HTTP needed),
// covering RBAC, owner-scoping, state-machine guards and the password policy -
// the areas the existing pure-unit suite did not reach.
const test = require('node:test');
const assert = require('node:assert/strict');

const { requireRole, ownerScope } = require('../src/middleware/auth');
const {
  validatePassword,
  assertTransition,
  SUB_TRANSITIONS,
  INVOICE_TRANSITIONS,
  HttpError,
} = require('../src/domain/rules');

// --- tiny helpers to drive the Express-style middleware -------------------
function runRole(roles, userRole) {
  const req = { user: userRole ? { role: userRole } : null };
  let captured;
  const next = (err) => { captured = err; };
  requireRole(...roles)(req, {}, next);
  return captured; // undefined = allowed, HttpError = blocked
}

// --- requireRole ----------------------------------------------------------
test('requireRole allows a matching role', () => {
  assert.equal(runRole(['admin'], 'admin'), undefined);
});

test('requireRole allows any of several roles', () => {
  assert.equal(runRole(['admin', 'staff'], 'staff'), undefined);
});

test('requireRole blocks a non-matching role with 403', () => {
  const err = runRole(['admin'], 'customer');
  assert.ok(err instanceof HttpError);
  assert.equal(err.status, 403);
});

test('requireRole blocks an unauthenticated request', () => {
  const err = runRole(['staff'], null);
  assert.ok(err instanceof HttpError);
  assert.equal(err.status, 403);
});

test('only admin can reach a staff-management route', () => {
  assert.equal(runRole(['admin'], 'admin'), undefined);
  assert.ok(runRole(['admin'], 'staff') instanceof HttpError);
  assert.ok(runRole(['admin'], 'customer') instanceof HttpError);
});

// --- ownerScope -----------------------------------------------------------
test('ownerScope pins a customer to their own id', () => {
  assert.equal(ownerScope({ user: { role: 'customer', customerId: 42 } }), 42);
});

test('ownerScope returns -1 for a customer with no linked customer row', () => {
  // -1 can never match a real id, so such a user sees nothing rather than everything.
  assert.equal(ownerScope({ user: { role: 'customer', customerId: null } }), -1);
});

test('ownerScope does not restrict admin or staff', () => {
  assert.equal(ownerScope({ user: { role: 'admin', customerId: null } }), null);
  assert.equal(ownerScope({ user: { role: 'staff', customerId: 7 } }), null);
});

// --- password policy ------------------------------------------------------
test('password policy accepts a compliant password', () => {
  assert.deepEqual(validatePassword('Abcdefg@1'), []);
});

test('password policy rejects each missing requirement', () => {
  assert.ok(validatePassword('Ab@1').some((m) => /more than 8/.test(m)));        // too short
  assert.ok(validatePassword('abcdefg@1').some((m) => /uppercase/.test(m)));      // no upper
  assert.ok(validatePassword('ABCDEFG@1').some((m) => /lowercase/.test(m)));      // no lower
  assert.ok(validatePassword('Abcdefgh1').some((m) => /special/.test(m)));        // no special
});

test('password policy treats exactly 8 characters as too short', () => {
  // The rule is "more than eight characters", so an 8-char password must fail.
  assert.ok(validatePassword('Abcdef@1').some((m) => /more than 8/.test(m)));
});

// --- subscription state machine guards -----------------------------------
test('subscription lifecycle allows the documented path', () => {
  assert.doesNotThrow(() => assertTransition(SUB_TRANSITIONS, 'draft', 'quotation'));
  assert.doesNotThrow(() => assertTransition(SUB_TRANSITIONS, 'quotation', 'confirmed'));
  assert.doesNotThrow(() => assertTransition(SUB_TRANSITIONS, 'confirmed', 'active'));
  assert.doesNotThrow(() => assertTransition(SUB_TRANSITIONS, 'active', 'closed'));
});

test('subscription lifecycle rejects illegal jumps', () => {
  assert.throws(() => assertTransition(SUB_TRANSITIONS, 'draft', 'active'), /Cannot move/);
  assert.throws(() => assertTransition(SUB_TRANSITIONS, 'closed', 'active'), /Cannot move/);
});

// --- invoice state machine guards ----------------------------------------
test('invoice lifecycle allows confirm then paid, and cancel from draft/confirmed', () => {
  assert.doesNotThrow(() => assertTransition(INVOICE_TRANSITIONS, 'draft', 'confirmed'));
  assert.doesNotThrow(() => assertTransition(INVOICE_TRANSITIONS, 'confirmed', 'paid'));
  assert.doesNotThrow(() => assertTransition(INVOICE_TRANSITIONS, 'draft', 'cancelled'));
  assert.doesNotThrow(() => assertTransition(INVOICE_TRANSITIONS, 'confirmed', 'cancelled'));
});

test('invoice lifecycle rejects paying a draft or changing a paid invoice', () => {
  assert.throws(() => assertTransition(INVOICE_TRANSITIONS, 'draft', 'paid'), /Cannot move/);
  assert.throws(() => assertTransition(INVOICE_TRANSITIONS, 'paid', 'cancelled'), /Cannot move/);
});
