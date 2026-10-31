import { useState } from 'react';
import { api, inr, printInvoice, qs, today, useApi } from '../api.js';
import { Badge, Btn, Card, ErrorBox, Field, Loading, Pager, Table, inputCls } from '../components/ui.jsx';

function PayForm({ invoice, onDone }) {
  const [f, setF] = useState({ method: 'bank_transfer', amount: invoice.balance, paid_on: today(), note: '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError(null);
    try { await api('/payments', { method: 'POST', body: { invoice_id: invoice.id, ...f, amount: Number(f.amount), note: f.note || undefined } }); onDone(); }
    catch (err) { setError(err); }
  };
  return (
    <form onSubmit={submit} className="grid sm:grid-cols-5 gap-2 items-end bg-slate-50 rounded-lg p-3">
      <Field label="Method"><select className={inputCls} value={f.method} onChange={set('method')}>
        {['cash', 'bank_transfer', 'card', 'upi', 'cheque'].map((m) => <option key={m}>{m}</option>)}</select></Field>
      <Field label={`Amount (due ${inr(invoice.balance)})`}><input type="number" step="0.01" className={inputCls} value={f.amount} onChange={set('amount')} /></Field>
      <Field label="Date"><input type="date" className={inputCls} value={f.paid_on} onChange={set('paid_on')} /></Field>
      <Field label="Note"><input className={inputCls} value={f.note} onChange={set('note')} /></Field>
      <Btn type="submit">Record payment</Btn>
      <div className="sm:col-span-5"><ErrorBox error={error} /></div>
    </form>
  );
}

export default function Invoices() {
  const [filters, setFilters] = useState({ status: '', overdue: '', q: '', page: 1 });
  const [payFor, setPayFor] = useState(null);
  const [run, setRun] = useState(null);
  const [err, setErr] = useState(null);
  const { data, error, loading, reload } = useApi(`/invoices${qs({ ...filters, overdue: filters.overdue ? 'true' : '', limit: 15 })}`);
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value, page: 1 });

  const guard = async (fn) => { setErr(null); try { await fn(); reload(); } catch (e) { setErr(e); } };
  const runBilling = () => guard(async () => setRun(await api('/invoices/run-billing', { method: 'POST', body: {} })));
  const doAct = (id, a) => guard(() => api(`/invoices/${id}/${a}`, { method: 'POST' }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-lg font-bold">Invoices</h1><Btn onClick={runBilling}>Run billing for today</Btn></div>
      {run && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900">
          {run.due} subscription(s) due · <b>{run.invoicesCreated}</b> invoice(s) created · {run.periodsSkipped} period(s) already billed
          {run.failed.length > 0 && <span className="text-red-700"> · {run.failed.length} failed</span>}
        </div>
      )}
      <ErrorBox error={err || error} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input className={`${inputCls} max-w-xs`} placeholder="Search invoice or customer" value={filters.q} onChange={set('q')} />
          <select className={`${inputCls} max-w-[11rem]`} value={filters.status} onChange={set('status')}>
            <option value="">All statuses</option>{['draft', 'confirmed', 'paid', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select>
          <label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={!!filters.overdue} onChange={set('overdue')} /> Overdue only</label>
        </div>
        <Loading loading={loading && !data} />
        <Table rows={data?.data} columns={[
          { label: 'Invoice', key: 'number' }, { label: 'Customer', key: 'customer_name' }, { label: 'Due', key: 'due_date' },
          { label: 'Total', render: (r) => inr(r.total) }, { label: 'Balance', render: (r) => inr(r.balance) },
          { label: 'Status', render: (r) => <Badge value={r.is_overdue ? 'overdue' : r.status} /> },
          { label: 'Actions', render: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.status === 'draft' && <><Btn kind="ghost" onClick={() => doAct(r.id, 'confirm')}>Confirm</Btn><Btn kind="danger" onClick={() => doAct(r.id, 'cancel')}>Cancel</Btn></>}
              {r.status === 'confirmed' && <><Btn onClick={() => setPayFor(payFor === r.id ? null : r.id)}>Pay</Btn><Btn kind="ghost" onClick={() => doAct(r.id, 'send')}>Send</Btn>
                {Number(r.amount_paid) === 0 && <Btn kind="danger" onClick={() => doAct(r.id, 'cancel')}>Cancel</Btn>}</>}
              <Btn kind="ghost" onClick={() => guard(() => printInvoice(r.id))}>Print</Btn>
            </div>) },
        ]} />
        {payFor && data?.data.find((i) => i.id === payFor) && (
          <div className="mt-3"><PayForm invoice={data.data.find((i) => i.id === payFor)} onDone={() => { setPayFor(null); reload(); }} /></div>
        )}
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(page) => setFilters({ ...filters, page })} />}
      </Card>
    </div>
  );
}
