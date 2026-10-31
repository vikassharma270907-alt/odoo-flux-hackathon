import { useState } from 'react';
import { useApi, qs, inr } from '../api.js';
import { Card, Field, inputCls, Table, Pager, Badge } from '../components/ui.jsx';

const METHODS = ['', 'cash', 'bank_transfer', 'card', 'upi', 'cheque'];

export default function Payments() {
  const [filters, setFilters] = useState({ method: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const set = (k) => (e) => {
    setFilters({ ...filters, [k]: e.target.value });
    setPage(1);
  };
  const { data, loading } = useApi('/payments' + qs({ ...filters, page, limit: 25 }), { poll: 0 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Payments</h1>
        <p className="text-xs text-slate-500">Everything received, newest first.</p>
      </div>
      <Card>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Method">
            <select className={inputCls} value={filters.method} onChange={set('method')}>
              {METHODS.map((m) => <option key={m} value={m}>{m || 'All methods'}</option>)}
            </select>
          </Field>
          <Field label="From"><input type="date" className={inputCls} value={filters.from} onChange={set('from')} /></Field>
          <Field label="To"><input type="date" className={inputCls} value={filters.to} onChange={set('to')} /></Field>
        </div>
      </Card>
      <Card>
        <Table
          loading={loading}
          empty="No payments match these filters."
          columns={[
            { label: 'Invoice', key: 'invoice_number' },
            { label: 'Method', render: (r) => <Badge value={r.method === 'cash' ? 'confirmed' : 'quotation'} /> },
            { label: 'Amount', render: (r) => inr(r.amount) },
            { label: 'Paid on', key: 'paid_on' },
            { label: 'Note', render: (r) => r.note || '—' },
          ]}
          rows={data?.data || []}
        />
        <Pager page={page} pages={data?.pages} total={data?.total} onPage={setPage} />
      </Card>
    </div>
  );
}
