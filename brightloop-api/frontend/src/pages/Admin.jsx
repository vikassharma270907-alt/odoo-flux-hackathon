import { useState } from 'react';
import { api, inr, useApi } from '../api.js';
import { Badge, Btn, Card, ErrorBox, Field, Loading, Table, inputCls } from '../components/ui.jsx';

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
const TABS = [
  ['products', 'Products'], ['plans', 'Plans'], ['taxes', 'Taxes'],
  ['discounts', 'Discounts'], ['templates', 'Templates'], ['staff', 'Staff'],
];

// A disclosure wrapper: "Add X" button that reveals a form, used by every section.
function AddPanel({ label, children, open, setOpen }) {
  return (
    <div className="mb-4">
      <Btn onClick={() => setOpen(!open)}>{open ? 'Close form' : label}</Btn>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Products (with variants)                                            */
/* ------------------------------------------------------------------ */
function Products() {
  const list = useApi('/products');
  const taxes = useApi('/taxes');
  const [open, setOpen] = useState(false);
  const empty = { name: '', type: 'software', sales_price: '', cost_price: '', notes: '', tax_id: '' };
  const [f, setF] = useState(empty);
  const [variants, setVariants] = useState([]);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const addVariant = () => setVariants([...variants, { attribute: 'Brand', value: '', extra_price: '' }]);
  const setVar = (i, k) => (e) => setVariants(variants.map((v, j) => (j === i ? { ...v, [k]: e.target.value } : v)));
  const rmVar = (i) => setVariants(variants.filter((_, j) => j !== i));

  const submit = async (e) => {
    e.preventDefault(); setError(null);
    try {
      await api('/products', { method: 'POST', body: {
        name: f.name, type: f.type, sales_price: f.sales_price, cost_price: f.cost_price || 0,
        notes: f.notes || undefined, tax_id: f.tax_id ? Number(f.tax_id) : undefined,
        variants: variants.map((v) => ({ attribute: v.attribute, value: v.value, extra_price: Number(v.extra_price || 0) })),
      } });
      setF(empty); setVariants([]); setOpen(false); list.reload();
    } catch (err) { setError(err); }
  };

  return (
    <Card title="Products">
      <AddPanel label="Add product" open={open} setOpen={setOpen}>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
          <Field label="Name *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <Field label="Type *"><input className={inputCls} value={f.type} onChange={set('type')} placeholder="software / addon / service" required /></Field>
          <Field label="Sales price *"><input type="number" step="0.01" min="0" className={inputCls} value={f.sales_price} onChange={set('sales_price')} required /></Field>
          <Field label="Cost price"><input type="number" step="0.01" min="0" className={inputCls} value={f.cost_price} onChange={set('cost_price')} /></Field>
          <Field label="Tax"><select className={inputCls} value={f.tax_id} onChange={set('tax_id')}>
            <option value="">No tax</option>{taxes.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="Notes"><input className={inputCls} value={f.notes} onChange={set('notes')} /></Field>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">Variants (e.g. Brand = Odoo adds ₹560)</span>
              <Btn kind="ghost" type="button" onClick={addVariant}>Add variant</Btn>
            </div>
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2 items-end">
                <Field label="Attribute"><input className={inputCls} value={v.attribute} onChange={setVar(i, 'attribute')} placeholder="Brand" /></Field>
                <Field label="Value"><input className={inputCls} value={v.value} onChange={setVar(i, 'value')} placeholder="Odoo" /></Field>
                <Field label="Extra price"><input type="number" step="0.01" className={inputCls} value={v.extra_price} onChange={setVar(i, 'extra_price')} placeholder="560" /></Field>
                <Btn kind="danger" type="button" onClick={() => rmVar(i)}>Remove</Btn>
              </div>
            ))}
          </div>
          <div className="sm:col-span-2 space-y-2"><ErrorBox error={error} /><Btn type="submit">Save product</Btn></div>
        </form>
      </AddPanel>
      <Loading loading={list.loading && !list.data} /><ErrorBox error={list.error} />
      <Table rows={list.data} empty="No products yet." columns={[
        { label: 'Name', key: 'name' }, { label: 'Type', key: 'type' },
        { label: 'Sales price', render: (p) => inr(p.sales_price) },
        { label: 'Variants', render: (p) => p.variants?.length ? p.variants.map((v) => `${v.value} (+${inr(v.extra_price)})`).join(', ') : '—' },
      ]} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Plans (with flag toggles)                                           */
/* ------------------------------------------------------------------ */
const FLAGS = [['auto_close', 'Auto-close at end'], ['allow_early_close', 'Allow early close'], ['allow_pause', 'Allow pause'], ['allow_renew', 'Allow renew']];
function Plans() {
  const list = useApi('/plans');
  const [open, setOpen] = useState(false);
  const empty = { name: '', price: '', period: 'monthly', min_qty: 1, available_from: '', available_to: '', auto_close: false, allow_early_close: true, allow_pause: true, allow_renew: true };
  const [f, setF] = useState(empty);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => () => setF({ ...f, [k]: !f[k] });
  const [busy, setBusy] = useState(null);

  const submit = async (e) => {
    e.preventDefault(); setError(null);
    try {
      await api('/plans', { method: 'POST', body: {
        name: f.name, price: f.price, period: f.period, min_qty: Number(f.min_qty),
        available_from: f.available_from || undefined, available_to: f.available_to || undefined,
        auto_close: f.auto_close, allow_early_close: f.allow_early_close, allow_pause: f.allow_pause, allow_renew: f.allow_renew,
      } });
      setF(empty); setOpen(false); list.reload();
    } catch (err) { setError(err); }
  };
  // Toggle a flag on an existing plan via PATCH.
  const patch = async (plan, key) => {
    setBusy(`${plan.id}:${key}`);
    try { await api(`/plans/${plan.id}`, { method: 'PATCH', body: { [key]: !plan[key] } }); list.reload(); }
    catch (err) { setError(err); } finally { setBusy(null); }
  };

  return (
    <Card title="Plans">
      <AddPanel label="Add plan" open={open} setOpen={setOpen}>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
          <Field label="Name *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <Field label="Price *"><input type="number" step="0.01" min="0" className={inputCls} value={f.price} onChange={set('price')} required /></Field>
          <Field label="Billing period *"><select className={inputCls} value={f.period} onChange={set('period')}>
            {['daily', 'weekly', 'monthly', 'yearly'].map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Minimum quantity"><input type="number" min="1" className={inputCls} value={f.min_qty} onChange={set('min_qty')} /></Field>
          <Field label="Available from"><input type="date" className={inputCls} value={f.available_from} onChange={set('available_from')} /></Field>
          <Field label="Available to"><input type="date" className={inputCls} value={f.available_to} onChange={set('available_to')} /></Field>
          <div className="sm:col-span-2 flex flex-wrap gap-3">
            {FLAGS.map(([k, label]) => (
              <label key={k} className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={f[k]} onChange={toggle(k)} /> {label}</label>
            ))}
          </div>
          <div className="sm:col-span-2 space-y-2"><ErrorBox error={error} /><Btn type="submit">Save plan</Btn></div>
        </form>
      </AddPanel>
      <Loading loading={list.loading && !list.data} /><ErrorBox error={list.error} />
      <Table rows={list.data} empty="No plans yet." columns={[
        { label: 'Name', key: 'name' }, { label: 'Price', render: (p) => inr(p.price) }, { label: 'Period', key: 'period' }, { label: 'Min qty', key: 'min_qty' },
        { label: 'Flags', render: (p) => (
          <div className="flex flex-wrap gap-1">
            {FLAGS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => patch(p, k)} disabled={busy === `${p.id}:${k}`}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition disabled:opacity-40 ${p[k] ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}
                title="Click to toggle">{label}</button>
            ))}
          </div>) },
      ]} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Taxes                                                               */
/* ------------------------------------------------------------------ */
function Taxes() {
  const list = useApi('/taxes');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', kind: 'percent', rate: '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError(null);
    try { await api('/taxes', { method: 'POST', body: { name: f.name, kind: f.kind, rate: Number(f.rate) } }); setF({ name: '', kind: 'percent', rate: '' }); setOpen(false); list.reload(); }
    catch (err) { setError(err); }
  };
  return (
    <Card title="Taxes">
      <AddPanel label="Add tax" open={open} setOpen={setOpen}>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3 items-end">
          <Field label="Name *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <Field label="Kind *"><select className={inputCls} value={f.kind} onChange={set('kind')}><option value="percent">percent</option><option value="fixed">fixed</option></select></Field>
          <Field label={f.kind === 'percent' ? 'Rate (%)' : 'Amount'}><input type="number" step="0.01" min="0" className={inputCls} value={f.rate} onChange={set('rate')} required /></Field>
          <div className="sm:col-span-3 space-y-2"><ErrorBox error={error} /><Btn type="submit">Save tax</Btn></div>
        </form>
      </AddPanel>
      <Loading loading={list.loading && !list.data} /><ErrorBox error={list.error} />
      <Table rows={list.data} empty="No taxes yet." columns={[
        { label: 'Name', key: 'name' }, { label: 'Kind', key: 'kind' },
        { label: 'Rate', render: (t) => (t.kind === 'percent' ? `${t.rate}%` : inr(t.rate)) },
      ]} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Discounts                                                           */
/* ------------------------------------------------------------------ */
function Discounts() {
  const list = useApi('/discounts');
  const products = useApi('/products');
  const [open, setOpen] = useState(false);
  const empty = { name: '', kind: 'percent', value: '', min_purchase: '', min_qty: '', starts_on: '', ends_on: '', usage_limit: '', scope: 'subscription', product_id: '' };
  const [f, setF] = useState(empty);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError(null);
    try {
      await api('/discounts', { method: 'POST', body: {
        name: f.name, kind: f.kind, value: Number(f.value),
        min_purchase: Number(f.min_purchase || 0), min_qty: Number(f.min_qty || 0),
        starts_on: f.starts_on || undefined, ends_on: f.ends_on || undefined,
        usage_limit: f.usage_limit ? Number(f.usage_limit) : undefined,
        scope: f.scope, product_id: f.scope === 'product' ? Number(f.product_id) : undefined,
      } });
      setF(empty); setOpen(false); list.reload();
    } catch (err) { setError(err); }
  };
  const toggleActive = async (d) => { setError(null); try { await api(`/discounts/${d.id}/active`, { method: 'PATCH', body: { is_active: !d.is_active } }); list.reload(); } catch (err) { setError(err); } };

  return (
    <Card title="Discounts">
      <AddPanel label="Add discount" open={open} setOpen={setOpen}>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3">
          <Field label="Name *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <Field label="Kind *"><select className={inputCls} value={f.kind} onChange={set('kind')}><option value="percent">percent</option><option value="fixed">fixed</option></select></Field>
          <Field label={f.kind === 'percent' ? 'Value (%)' : 'Value (₹)'}><input type="number" step="0.01" min="0" className={inputCls} value={f.value} onChange={set('value')} required /></Field>
          <Field label="Min purchase"><input type="number" step="0.01" min="0" className={inputCls} value={f.min_purchase} onChange={set('min_purchase')} /></Field>
          <Field label="Min quantity"><input type="number" min="0" className={inputCls} value={f.min_qty} onChange={set('min_qty')} /></Field>
          <Field label="Usage limit"><input type="number" min="1" className={inputCls} value={f.usage_limit} onChange={set('usage_limit')} placeholder="unlimited" /></Field>
          <Field label="Starts on"><input type="date" className={inputCls} value={f.starts_on} onChange={set('starts_on')} /></Field>
          <Field label="Ends on"><input type="date" className={inputCls} value={f.ends_on} onChange={set('ends_on')} /></Field>
          <Field label="Scope *"><select className={inputCls} value={f.scope} onChange={set('scope')}><option value="subscription">subscription</option><option value="product">product</option></select></Field>
          {f.scope === 'product' && (
            <Field label="Product *"><select className={inputCls} value={f.product_id} onChange={set('product_id')} required>
              <option value="">Select…</option>{products.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          )}
          <div className="sm:col-span-3 space-y-2"><ErrorBox error={error} /><Btn type="submit">Save discount</Btn></div>
        </form>
      </AddPanel>
      <Loading loading={list.loading && !list.data} /><ErrorBox error={list.error} />
      <Table rows={list.data} empty="No discounts yet." columns={[
        { label: 'Name', key: 'name' },
        { label: 'Value', render: (d) => (d.kind === 'percent' ? `${d.value}%` : inr(d.value)) },
        { label: 'Scope', key: 'scope' },
        { label: 'Window', render: (d) => `${d.starts_on || '—'} → ${d.ends_on || '—'}` },
        { label: 'Used', render: (d) => `${d.used_count}${d.usage_limit ? ` / ${d.usage_limit}` : ''}` },
        { label: 'Active', render: (d) => (
          <button type="button" onClick={() => toggleActive(d)} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${d.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
            {d.is_active ? 'active' : 'inactive'}</button>) },
      ]} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Quotation templates                                                 */
/* ------------------------------------------------------------------ */
function Templates() {
  const list = useApi('/templates');
  const plans = useApi('/plans');
  const products = useApi('/products');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', plan_id: '', validity_days: 30 });
  const [lines, setLines] = useState([{ product_id: '', variant_id: '', qty: 1 }]);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setLine = (i, k) => (e) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: e.target.value } : l)));
  const addLine = () => setLines([...lines, { product_id: '', variant_id: '', qty: 1 }]);
  const rmLine = (i) => setLines(lines.filter((_, j) => j !== i));
  const variantsFor = (pid) => products.data?.find((p) => String(p.id) === String(pid))?.variants || [];

  const submit = async (e) => {
    e.preventDefault(); setError(null);
    try {
      await api('/templates', { method: 'POST', body: {
        name: f.name, plan_id: Number(f.plan_id), validity_days: Number(f.validity_days),
        lines: lines.filter((l) => l.product_id).map((l) => ({ product_id: Number(l.product_id), variant_id: l.variant_id ? Number(l.variant_id) : undefined, qty: Number(l.qty || 1) })),
      } });
      setF({ name: '', plan_id: '', validity_days: 30 }); setLines([{ product_id: '', variant_id: '', qty: 1 }]); setOpen(false); list.reload();
    } catch (err) { setError(err); }
  };
  const planName = (id) => plans.data?.find((p) => p.id === id)?.name || id;

  return (
    <Card title="Quotation templates">
      <AddPanel label="Add template" open={open} setOpen={setOpen}>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3">
          <Field label="Name *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <Field label="Plan *"><select className={inputCls} value={f.plan_id} onChange={set('plan_id')} required>
            <option value="">Select…</option>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Valid for (days)"><input type="number" min="1" className={inputCls} value={f.validity_days} onChange={set('validity_days')} /></Field>
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-slate-700">Product lines *</span><Btn kind="ghost" type="button" onClick={addLine}>Add line</Btn></div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-2 mb-2 items-end">
                <Field label="Product"><select className={inputCls} value={l.product_id} onChange={setLine(i, 'product_id')}>
                  <option value="">Select…</option>{products.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                <Field label="Variant"><select className={inputCls} value={l.variant_id} onChange={setLine(i, 'variant_id')} disabled={!variantsFor(l.product_id).length}>
                  <option value="">—</option>{variantsFor(l.product_id).map((v) => <option key={v.id} value={v.id}>{v.value} (+{inr(v.extra_price)})</option>)}</select></Field>
                <Field label="Qty"><input type="number" min="1" className={inputCls} value={l.qty} onChange={setLine(i, 'qty')} /></Field>
                <Btn kind="danger" type="button" onClick={() => rmLine(i)} disabled={lines.length === 1}>Remove</Btn>
              </div>
            ))}
          </div>
          <div className="sm:col-span-3 space-y-2"><ErrorBox error={error} /><Btn type="submit">Save template</Btn></div>
        </form>
      </AddPanel>
      <Loading loading={list.loading && !list.data} /><ErrorBox error={list.error} />
      <Table rows={list.data} empty="No templates yet." columns={[
        { label: 'Name', key: 'name' }, { label: 'Plan', render: (t) => planName(t.plan_id) },
        { label: 'Valid (days)', key: 'validity_days' }, { label: 'Lines', render: (t) => t.lines?.length || 0 },
      ]} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */
const pwRules = (pw) => [
  ['More than 8 characters', pw.length > 8], ['An uppercase letter', /[A-Z]/.test(pw)],
  ['A lowercase letter', /[a-z]/.test(pw)], ['A special character', /[^A-Za-z0-9\s]/.test(pw)],
];
function Staff() {
  const list = useApi('/users?limit=100');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError(null);
    try { await api('/users/staff', { method: 'POST', body: f }); setF({ name: '', email: '', password: '' }); setOpen(false); list.reload(); }
    catch (err) { setError(err); }
  };
  const toggleActive = async (u) => { setError(null); try { await api(`/users/${u.id}/active`, { method: 'PATCH', body: { is_active: !u.is_active } }); list.reload(); } catch (err) { setError(err); } };

  return (
    <Card title="Team members">
      <AddPanel label="Add staff member" open={open} setOpen={setOpen}>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3">
          <Field label="Name *"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <Field label="Email *"><input type="email" className={inputCls} value={f.email} onChange={set('email')} required /></Field>
          <Field label="Password *"><input type="password" className={inputCls} value={f.password} onChange={set('password')} required /></Field>
          <ul className="sm:col-span-3 text-[11px] flex flex-wrap gap-x-4">{pwRules(f.password).map(([t, ok]) => <li key={t} className={ok ? 'text-emerald-700' : 'text-slate-500'}>{ok ? '✓' : '○'} {t}</li>)}</ul>
          <div className="sm:col-span-3 space-y-2"><ErrorBox error={error} /><Btn type="submit">Create staff</Btn></div>
        </form>
      </AddPanel>
      <Loading loading={list.loading && !list.data} /><ErrorBox error={list.error} />
      <Table rows={list.data?.data} empty="No users yet." columns={[
        { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' },
        { label: 'Role', render: (u) => <Badge value={u.role === 'customer' ? 'draft' : u.role === 'admin' ? 'active' : 'confirmed'} /> },
        { label: 'Status', render: (u) => (
          <button type="button" onClick={() => toggleActive(u)} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${u.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
            {u.is_active ? 'active' : 'inactive'}</button>) },
      ]} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Admin shell with tabs                                               */
/* ------------------------------------------------------------------ */
const PANES = { products: Products, plans: Plans, taxes: Taxes, discounts: Discounts, templates: Templates, staff: Staff };

export default function Admin() {
  const [tab, setTab] = useState('products');
  const Pane = PANES[tab];
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Admin</h1>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition ${tab === key ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {label}
          </button>
        ))}
      </div>
      <Pane />
    </div>
  );
}
