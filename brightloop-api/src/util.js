'use strict';
// Small dependency-free helpers (unit tested in test/util.test.js).

/** page/limit -> { page, limit, offset }. limit is clamped to 1..100. */
function paging(q = {}) {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 25, 1), 100);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { page, limit, offset: (page - 1) * limit };
}

/** Parameterised WHERE builder: add('i.status = ?', 'paid') -> "i.status = $1". Values never touch the SQL text. */
function builder() {
  const params = [];
  const conds = [];
  return {
    params,
    add(sql, value) { params.push(value); conds.push(sql.split('?').join('$' + params.length)); },
    raw(sql) { conds.push(sql); },
    ref(value) { params.push(value); return '$' + params.length; },
    where() { return conds.length ? 'WHERE ' + conds.join(' AND ') : ''; },
  };
}

/** Rows were selected with count(*) OVER() AS total_rows. */
function pageResult(rows, { page, limit }) {
  const total = rows.length ? rows[0].total_rows : 0;
  return { data: rows.map(({ total_rows, ...r }) => r), page, limit, total, pages: Math.ceil(total / limit) };
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toCsv(rows, columns) {
  const cell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;            // block spreadsheet formula injection
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n');
}

module.exports = { paging, builder, pageResult, esc, toCsv };
