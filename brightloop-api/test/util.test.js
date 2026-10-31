'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { paging, builder, pageResult, toCsv, esc } = require('../src/util');
const { spec, ROUTES } = require('../src/openapi');

test('paging clamps limit and page', () => {
  assert.deepEqual(paging({}), { page: 1, limit: 25, offset: 0 });
  assert.deepEqual(paging({ page: '3', limit: '500' }), { page: 3, limit: 100, offset: 200 });
  assert.equal(paging({ page: '-4', limit: '0' }).page, 1);
});

test('builder keeps values out of the SQL text', () => {
  const b = builder();
  b.add('i.status = ?', "paid'; DROP TABLE invoices;--");
  b.add('i.total > ?', 10);
  assert.equal(b.where(), 'WHERE i.status = $1 AND i.total > $2');
  assert.equal(b.params[0], "paid'; DROP TABLE invoices;--");
});

test('pageResult strips the window count and computes pages', () => {
  const r = pageResult([{ id: 1, total_rows: 51 }], { page: 1, limit: 25 });
  assert.deepEqual(r, { data: [{ id: 1 }], page: 1, limit: 25, total: 51, pages: 3 });
});

test('csv escapes quotes and blocks formula injection', () => {
  const out = toCsv([{ a: 'x,"y"', b: '=SUM(A1)' }], ['a', 'b']);
  assert.equal(out, `a,b\n"x,""y""",'=SUM(A1)`);
});

test('html escaping', () => assert.equal(esc('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;'));

test('openapi lists every route with auth requirements', () => {
  const s = spec();
  assert.equal(Object.keys(s.paths).length > 25, true);
  assert.equal(s.paths['/auth/login'].post.security.length, 0);
  assert.equal(s.paths['/users/staff'].post.description, 'Access: admin');
  assert.equal(ROUTES.length >= 38, true);
});
