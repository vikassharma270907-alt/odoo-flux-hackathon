import { useState } from 'react';
import { getToken, inr, qs, useApi } from '../api.js';
import { Btn, Card, ErrorBox, Field, Loading, Pager, Table, inputCls } from '../components/ui.jsx';

const METHODS = ['cash', 'bank_transfer', 'card', 'upi', 'cheque'];

async function downloadCsv() {
  const res = await fetch('/api/reports/export.csv?type=payments', { headers: { Authorization: `Bearer ${getToken()}` } });
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement('a'), { href: url, download: 'payments.csv' }).click();
}

export default function Payments() {
  const [filters, setFilters] = useState({ method: '', from: '', to: '', page: 1 });
  const { data, error, loading } = useApi(`/payments${qs({ ...filters, limit: 20 })}`);
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value, page: 1 });
  const clear = () => setFilters({ method: '', from: '', to: '', page: 1 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Payments</h1>
        <Btn kind="ghost" onClick={downloadCsv}>Export CSV</Btn>
      </div>
      <Card>
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <Field label="Method">
            <select className={`${inputCls} max-w-[11rem]`} value={filters.method} onChange={set('method')}>
              <option value="">All methods</option>{METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="From"><input type="date" className={inputCls} value={filters.from} onChange={set('from')} /></Field>
          <Field label="To"><input type="date" className={inputCls} value={filters.to} onChange={set('to')} /></Field>
          <Btn kind="ghost" onClick={clear}>Clear</Btn>
        </div>
        <ErrorBox error={error} /><Loading loading={loading && !data} />
        <Table rows={data?.data} empty="No payments match these filters." columns={[
          { label: 'Invoice', key: 'invoice_number' },
          { label: 'Method', render: (r) => <span className="capitalize">{r.method.replace('_', ' ')}</span> },
          { label: 'Amount', render: (r) => inr(r.amount) },
          { label: 'Paid on', key: 'paid_on' },
          { label: 'Note', render: (r) => r.note || '—' },
        ]} />
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(page) => setFilters({ ...filters, page })} />}
      </Card>
    </div>
  );
}
