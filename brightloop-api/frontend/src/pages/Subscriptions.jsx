import { useState } from 'react';
import { api, inr, qs, today, useApi } from '../api.js';
import { Badge, Btn, Card, ErrorBox, Field, Loading, Pager, Table, inputCls } from '../components/ui.jsx';

// Mirrors the server state machine so only legal moves are offered (the API still enforces it with a 409).
export const NEXT = { draft: ['quotation'], quotation: ['confirmed'], confirmed: ['active'], active: ['paused', 'closed'], paused: ['active', 'closed'], closed: [] };
const LABEL = { quotation: 'Send as quotation', confirmed: 'Confirm', active: 'Activate / resume', paused: 'Pause', closed: 'Close' };
const yearLater = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

function Detail({ id, onChanged }) {
  const { data: s, error, reload } = useApi(`/subscriptions/${id}`);
  const [err, setErr] = useState(null);
  const act = async (fn) => { setErr(null); try { await fn(); await reload(); onChanged(); } catch (e) { setErr(e); } };
  if (!s) return <ErrorBox error={error} />;
  return (
    <Card title={`${s.number} · ${s.customer_name}`} action={<Badge value={s.status} />}>
      <p className="text-xs text-slate-500 mb-3">{s.plan_name} ({s.period}) · {s.start_date} to {s.expiry_date} · terms {s.payment_term_days} days · next invoice {s.next_invoice_date || 'none'}</p>
      <Table rows={s.lines} columns={[
        { label: 'Product', render: (l) => `${l.product}${l.variant ? ` – ${l.variant}` : ''}` }, { label: 'Qty', key: 'qty' },
        { label: 'Unit price', render: (l) => inr(l.unit_price) }, { label: 'Tax', render: (l) => l.tax || '—' }, { label: 'Amount', render: (l) => inr(l.amount) },
      ]} />
      <div className="flex flex-wrap gap-2 mt-4">
        {NEXT[s.status].map((to) => <Btn key={to} onClick={() => act(() => api(`/subscriptions/${id}/transition`, { method: 'POST', body: { to } }))}>{LABEL[to]}</Btn>)}
        {s.status === 'active' && s.allow_renew && <Btn kind="ghost" onClick={() => act(() => api(`/subscriptions/${id}/renew`, { method: 'POST' }))}>Renew</Btn>}
      </div>
      <div className="mt-3"><ErrorBox error={err} /></div>
    </Card>
  );
}

function CreateForm({ onCreated }) {
  const [custQ, setCustQ] = useState('');
  const custs = useApi(`/customers${qs({ q: custQ, limit: 8 })}`);
  const tpls = useApi('/templates');
  const [f, setF] = useState({ customer_id: '', template_id: '', start_date: today(), expiry_date: yearLater(), payment_term_days: 15 });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError(null);
    try {
      const created = await api('/subscriptions', { method: 'POST', body: { ...f, customer_id: Number(f.customer_id), template_id: Number(f.template_id), payment_term_days: Number(f.payment_term_days) } });
      onCreated(created.id);
    } catch (err) { setError(err); }
  };
  return (
    <Card title="New subscription from a quotation template">
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
        <Field label="Find customer"><input className={inputCls} value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Type a name or company" /></Field>
        <Field label="Customer *"><select className={inputCls} value={f.customer_id} onChange={set('customer_id')} required>
          <option value="">Select…</option>{custs.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` – ${c.company}` : ''}</option>)}</select></Field>
        <Field label="Quotation template *"><select className={inputCls} value={f.template_id} onChange={set('template_id')} required>
          <option value="">Select…</option>{tpls.data?.map((t) => <option key={t.id} value={t.id}>{t.name} (valid {t.validity_days} days)</option>)}</select></Field>
        <Field label="Payment terms (days)"><input type="number" min="0" className={inputCls} value={f.payment_term_days} onChange={set('payment_term_days')} /></Field>
        <Field label="Start date *"><input type="date" className={inputCls} value={f.start_date} onChange={set('start_date')} required /></Field>
        <Field label="Expiry date *"><input type="date" className={inputCls} value={f.expiry_date} onChange={set('expiry_date')} required /></Field>
        <div className="sm:col-span-2 space-y-2"><ErrorBox error={error} /><Btn type="submit">Create draft subscription</Btn></div>
      </form>
    </Card>
  );
}

export default function Subscriptions() {
  const [filters, setFilters] = useState({ status: '', q: '', page: 1 });
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const { data, error, loading, reload } = useApi(`/subscriptions${qs({ ...filters, limit: 15 })}`);
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value, page: 1 });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-lg font-bold">Subscriptions</h1>
        <Btn onClick={() => setCreating(!creating)}>{creating ? 'Close form' : 'New subscription'}</Btn></div>
      {creating && <CreateForm onCreated={(id) => { setCreating(false); setOpenId(id); reload(); }} />}
      {openId && <Detail key={openId} id={openId} onChanged={reload} />}
      <Card>
        <div className="flex flex-wrap gap-2 mb-3">
          <input className={`${inputCls} max-w-xs`} placeholder="Search number or customer" value={filters.q} onChange={set('q')} />
          <select className={`${inputCls} max-w-[11rem]`} value={filters.status} onChange={set('status')}>
            <option value="">All statuses</option>{Object.keys(NEXT).map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <ErrorBox error={error} /><Loading loading={loading && !data} />
        <Table rows={data?.data} onRow={(r) => setOpenId(r.id)} columns={[
          { label: 'Number', key: 'number' }, { label: 'Customer', key: 'customer_name' }, { label: 'Plan', render: (r) => `${r.plan_name} (${r.period})` },
          { label: 'Start', key: 'start_date' }, { label: 'Expiry', key: 'expiry_date' }, { label: 'Status', render: (r) => <Badge value={r.status} /> },
        ]} />
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(page) => setFilters({ ...filters, page })} />}
      </Card>
    </div>
  );
}
