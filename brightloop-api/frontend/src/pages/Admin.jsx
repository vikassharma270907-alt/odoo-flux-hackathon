import { useState } from 'react';
import { api, useApi, inr } from '../api.js';
import { Btn, Card, ErrorBox, Field, inputCls, Table, Badge } from '../components/ui.jsx';

const TABS = [
  ['products', 'Products'],
  ['plans', 'Plans'],
  ['taxes', 'Taxes'],
  ['discounts', 'Discounts'],
  ['templates', 'Templates'],
  ['staff', 'Staff'],
];

export default function Admin() {
  const [tab, setTab] = useState('products');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Admin setup</h1>
        <p className="text-xs text-slate-500">Create the catalogue the rest of the system bills against.</p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${
              tab === key ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'products' && <Products />}
      {tab === 'plans' && <Plans />}
      {tab === 'taxes' && <Taxes />}
      {tab === 'discounts' && <Discounts />}
      {tab === 'templates' && <Templates />}
      {tab === 'staff' && <Staff />}
    </div>
  );
}

function useSubmit(reload) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      reload();
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

/* ---------------- Products (+ variants) ---------------- */
function Products() {
  const { data, reload, loading } = useApi('/products');
  const taxes = useApi('/taxes');
  const { error, busy, run } = useSubmit(reload);
  const blank = { name: '', type: 'software', sales_price: '', cost_price: '0', notes: '', tax_id: '' };
  const [f, setF] = useState(blank);
  const [variants, setVariants] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const addVariant = () => setVariants([...variants, { attribute: 'Brand', value: '', extra_price: '0' }]);
  const setVar = (i, k) => (e) => setVariants(variants.map((v, j) => (j === i ? { ...v, [k]: e.target.value } : v)));
  const rmVar = (i) => setVariants(variants.filter((_, j) => j !== i));

  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(() =>
      api('/products', {
        method: 'POST',
        body: {
          name: f.name,
          type: f.type,
          sales_price: Number(f.sales_price),
          cost_price: Number(f.cost_price || 0),
          notes: f.notes || undefined,
          tax_id: f.tax_id ? Number(f.tax_id) : undefined,
          variants: variants.map((v) => ({ attribute: v.attribute, value: v.value, extra_price: Number(v.extra_price || 0) })),
        },
      }),
    );
    if (ok) {
      setF(blank);
      setVariants([]);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="New product">
        <form onSubmit={submit} className="space-y-3">
          <ErrorBox error={error} />
          <Field label="Name"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><input className={inputCls} value={f.type} onChange={set('type')} required /></Field>
            <Field label="Tax">
              <select className={inputCls} value={f.tax_id} onChange={set('tax_id')}>
                <option value="">No tax</option>
                {(taxes.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sales price"><input type="number" step="0.01" className={inputCls} value={f.sales_price} onChange={set('sales_price')} required /></Field>
            <Field label="Cost price"><input type="number" step="0.01" className={inputCls} value={f.cost_price} onChange={set('cost_price')} /></Field>
          </div>
          <Field label="Notes"><textarea className={inputCls} rows={2} value={f.notes} onChange={set('notes')} /></Field>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">Variants (e.g. Brand = Odoo adds 560)</span>
              <Btn type="button" kind="ghost" onClick={addVariant}>+ Variant</Btn>
            </div>
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
                <input className={inputCls} placeholder="Attribute" value={v.attribute} onChange={setVar(i, 'attribute')} />
                <input className={inputCls} placeholder="Value" value={v.value} onChange={setVar(i, 'value')} />
                <input type="number" step="0.01" className={inputCls} placeholder="Extra" value={v.extra_price} onChange={setVar(i, 'extra_price')} />
                <Btn type="button" kind="danger" onClick={() => rmVar(i)}>×</Btn>
              </div>
            ))}
          </div>
          <Btn type="submit" disabled={busy} className="w-full py-2">Create product</Btn>
        </form>
      </Card>
      <Card title={`Products (${data?.length || 0})`}>
        <Table
          loading={loading}
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Type', key: 'type' },
            { label: 'Price', render: (r) => inr(r.sales_price) },
            { label: 'Variants', render: (r) => (r.variants || []).map((v) => `${v.value} (+${v.extra_price})`).join(', ') || '—' },
          ]}
          rows={data || []}
        />
      </Card>
    </div>
  );
}

/* ---------------- Plans (flag toggles) ---------------- */
function Plans() {
  const { data, reload, loading } = useApi('/plans');
  const { error, busy, run } = useSubmit(reload);
  const blank = { name: '', price: '', period: 'monthly', min_qty: '1', available_from: '', available_to: '',
    auto_close: false, allow_early_close: true, allow_pause: true, allow_renew: true };
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => () => setF({ ...f, [k]: !f[k] });

  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(() =>
      api('/plans', {
        method: 'POST',
        body: {
          name: f.name, price: Number(f.price), period: f.period, min_qty: Number(f.min_qty || 1),
          available_from: f.available_from || undefined, available_to: f.available_to || undefined,
          auto_close: f.auto_close, allow_early_close: f.allow_early_close, allow_pause: f.allow_pause, allow_renew: f.allow_renew,
        },
      }),
    );
    if (ok) setF(blank);
  };

  const patchFlag = (id, key, value) => run(() => api(`/plans/${id}`, { method: 'PATCH', body: { [key]: value } }));
  const FLAGS = [['auto_close', 'Auto-close'], ['allow_early_close', 'Early close'], ['allow_pause', 'Pause'], ['allow_renew', 'Renew']];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="New plan">
        <form onSubmit={submit} className="space-y-3">
          <ErrorBox error={error} />
          <Field label="Name"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price"><input type="number" step="0.01" className={inputCls} value={f.price} onChange={set('price')} required /></Field>
            <Field label="Period">
              <select className={inputCls} value={f.period} onChange={set('period')}>
                {['daily', 'weekly', 'monthly', 'yearly'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Min qty"><input type="number" className={inputCls} value={f.min_qty} onChange={set('min_qty')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Available from"><input type="date" className={inputCls} value={f.available_from} onChange={set('available_from')} /></Field>
            <Field label="Available to"><input type="date" className={inputCls} value={f.available_to} onChange={set('available_to')} /></Field>
          </div>
          <div className="flex flex-wrap gap-3">
            {FLAGS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-1.5 text-xs text-slate-700">
                <input type="checkbox" checked={f[k]} onChange={toggle(k)} /> {label}
              </label>
            ))}
          </div>
          <Btn type="submit" disabled={busy} className="w-full py-2">Create plan</Btn>
        </form>
      </Card>
      <Card title={`Plans (${data?.length || 0})`}>
        <Table
          loading={loading}
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Price', render: (r) => `${inr(r.price)} / ${r.period}` },
            {
              label: 'Flags',
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {FLAGS.map(([k, label]) => (
                    <button
                      key={k}
                      disabled={busy}
                      onClick={() => patchFlag(r.id, k, !r[k])}
                      className={`px-1.5 py-0.5 rounded border text-[10px] ${r[k] ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-300 text-slate-400'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ),
            },
          ]}
          rows={data || []}
        />
      </Card>
    </div>
  );
}

/* ---------------- Taxes ---------------- */
function Taxes() {
  const { data, reload, loading } = useApi('/taxes');
  const { error, busy, run } = useSubmit(reload);
  const [f, setF] = useState({ name: '', kind: 'percent', rate: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(() => api('/taxes', { method: 'POST', body: { name: f.name, kind: f.kind, rate: Number(f.rate) } }));
    if (ok) setF({ name: '', kind: 'percent', rate: '' });
  };
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="New tax">
        <form onSubmit={submit} className="space-y-3">
          <ErrorBox error={error} />
          <Field label="Name"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind">
              <select className={inputCls} value={f.kind} onChange={set('kind')}>
                <option value="percent">percent</option>
                <option value="fixed">fixed</option>
              </select>
            </Field>
            <Field label="Rate"><input type="number" step="0.01" className={inputCls} value={f.rate} onChange={set('rate')} required /></Field>
          </div>
          <Btn type="submit" disabled={busy} className="w-full py-2">Create tax</Btn>
        </form>
      </Card>
      <Card title={`Taxes (${data?.length || 0})`}>
        <Table
          loading={loading}
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Kind', key: 'kind' },
            { label: 'Rate', render: (r) => (r.kind === 'percent' ? `${r.rate}%` : inr(r.rate)) },
          ]}
          rows={data || []}
        />
      </Card>
    </div>
  );
}

/* ---------------- Discounts ---------------- */
function Discounts() {
  const { data, reload, loading } = useApi('/discounts');
  const products = useApi('/products');
  const { error, busy, run } = useSubmit(reload);
  const blank = { name: '', kind: 'percent', value: '', min_purchase: '0', min_qty: '0', starts_on: '', ends_on: '', usage_limit: '', scope: 'subscription', product_id: '' };
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(() =>
      api('/discounts', {
        method: 'POST',
        body: {
          name: f.name, kind: f.kind, value: Number(f.value),
          min_purchase: Number(f.min_purchase || 0), min_qty: Number(f.min_qty || 0),
          starts_on: f.starts_on || undefined, ends_on: f.ends_on || undefined,
          usage_limit: f.usage_limit ? Number(f.usage_limit) : undefined,
          scope: f.scope, product_id: f.scope === 'product' && f.product_id ? Number(f.product_id) : undefined,
        },
      }),
    );
    if (ok) setF(blank);
  };
  const toggleActive = (d) => run(() => api(`/discounts/${d.id}/active`, { method: 'PATCH', body: { is_active: !d.is_active } }));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="New discount">
        <form onSubmit={submit} className="space-y-3">
          <ErrorBox error={error} />
          <Field label="Name"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind">
              <select className={inputCls} value={f.kind} onChange={set('kind')}>
                <option value="percent">percent</option>
                <option value="fixed">fixed</option>
              </select>
            </Field>
            <Field label="Value"><input type="number" step="0.01" className={inputCls} value={f.value} onChange={set('value')} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min purchase"><input type="number" step="0.01" className={inputCls} value={f.min_purchase} onChange={set('min_purchase')} /></Field>
            <Field label="Min qty"><input type="number" className={inputCls} value={f.min_qty} onChange={set('min_qty')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts on"><input type="date" className={inputCls} value={f.starts_on} onChange={set('starts_on')} /></Field>
            <Field label="Ends on"><input type="date" className={inputCls} value={f.ends_on} onChange={set('ends_on')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Usage limit"><input type="number" className={inputCls} value={f.usage_limit} onChange={set('usage_limit')} placeholder="unlimited" /></Field>
            <Field label="Scope">
              <select className={inputCls} value={f.scope} onChange={set('scope')}>
                <option value="subscription">subscription</option>
                <option value="product">product</option>
              </select>
            </Field>
          </div>
          {f.scope === 'product' && (
            <Field label="Product">
              <select className={inputCls} value={f.product_id} onChange={set('product_id')} required>
                <option value="">Select…</option>
                {(products.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}
          <Btn type="submit" disabled={busy} className="w-full py-2">Create discount</Btn>
        </form>
      </Card>
      <Card title={`Discounts (${data?.length || 0})`}>
        <Table
          loading={loading}
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Value', render: (r) => (r.kind === 'percent' ? `${r.value}%` : inr(r.value)) },
            { label: 'Scope', key: 'scope' },
            { label: 'Used', render: (r) => `${r.used_count}${r.usage_limit ? ' / ' + r.usage_limit : ''}` },
            { label: 'Active', render: (r) => <Badge value={r.is_active ? 'active' : 'closed'} /> },
            { label: '', render: (r) => <Btn kind="ghost" disabled={busy} onClick={() => toggleActive(r)}>{r.is_active ? 'Disable' : 'Enable'}</Btn> },
          ]}
          rows={data || []}
        />
      </Card>
    </div>
  );
}

/* ---------------- Templates ---------------- */
function Templates() {
  const { data, reload, loading } = useApi('/templates');
  const plans = useApi('/plans');
  const products = useApi('/products');
  const { error, busy, run } = useSubmit(reload);
  const blank = { name: '', plan_id: '', validity_days: '30' };
  const [f, setF] = useState(blank);
  const [lines, setLines] = useState([{ product_id: '', qty: '1' }]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setLine = (i, k) => (e) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: e.target.value } : l)));
  const addLine = () => setLines([...lines, { product_id: '', qty: '1' }]);
  const rmLine = (i) => setLines(lines.filter((_, j) => j !== i));

  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(() =>
      api('/templates', {
        method: 'POST',
        body: {
          name: f.name, plan_id: Number(f.plan_id), validity_days: Number(f.validity_days || 30),
          lines: lines.filter((l) => l.product_id).map((l) => ({ product_id: Number(l.product_id), qty: Number(l.qty || 1) })),
        },
      }),
    );
    if (ok) {
      setF(blank);
      setLines([{ product_id: '', qty: '1' }]);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="New quotation template">
        <form onSubmit={submit} className="space-y-3">
          <ErrorBox error={error} />
          <Field label="Name"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan">
              <select className={inputCls} value={f.plan_id} onChange={set('plan_id')} required>
                <option value="">Select…</option>
                {(plans.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Valid for (days)"><input type="number" className={inputCls} value={f.validity_days} onChange={set('validity_days')} /></Field>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">Product lines</span>
              <Btn type="button" kind="ghost" onClick={addLine}>+ Line</Btn>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_auto] gap-2 mb-2">
                <select className={inputCls} value={l.product_id} onChange={setLine(i, 'product_id')}>
                  <option value="">Product…</option>
                  {(products.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" className={inputCls} value={l.qty} onChange={setLine(i, 'qty')} />
                <Btn type="button" kind="danger" onClick={() => rmLine(i)}>×</Btn>
              </div>
            ))}
          </div>
          <Btn type="submit" disabled={busy} className="w-full py-2">Create template</Btn>
        </form>
      </Card>
      <Card title={`Templates (${data?.length || 0})`}>
        <Table
          loading={loading}
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Validity', render: (r) => `${r.validity_days} days` },
            { label: 'Lines', render: (r) => `${(r.lines || []).length} line(s)` },
          ]}
          rows={data || []}
        />
      </Card>
    </div>
  );
}

/* ---------------- Staff ---------------- */
function Staff() {
  const { data, reload, loading } = useApi('/users');
  const { error, busy, run } = useSubmit(reload);
  const blank = { name: '', email: '', password: '' };
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(() => api('/users/staff', { method: 'POST', body: f }));
    if (ok) setF(blank);
  };
  const toggleActive = (u) => run(() => api(`/users/${u.id}/active`, { method: 'PATCH', body: { is_active: !u.is_active } }));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Add staff member">
        <form onSubmit={submit} className="space-y-3">
          <ErrorBox error={error} />
          <Field label="Name"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>
          <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={set('email')} required /></Field>
          <Field label="Password"><input type="password" className={inputCls} value={f.password} onChange={set('password')} required /></Field>
          <p className="text-[11px] text-slate-400">Password: more than 8 chars, with upper, lower and a special character.</p>
          <Btn type="submit" disabled={busy} className="w-full py-2">Create staff</Btn>
        </form>
      </Card>
      <Card title={`Users (${data?.total || 0})`}>
        <Table
          loading={loading}
          columns={[
            { label: 'Name', key: 'name' },
            { label: 'Email', key: 'email' },
            { label: 'Role', render: (r) => <Badge value={r.role === 'customer' ? 'draft' : r.role === 'admin' ? 'active' : 'confirmed'} /> },
            { label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
            { label: '', render: (r) => (r.role === 'customer' ? null : <Btn kind="ghost" disabled={busy} onClick={() => toggleActive(r)}>{r.is_active ? 'Deactivate' : 'Activate'}</Btn>) },
          ]}
          rows={data?.data || []}
        />
      </Card>
    </div>
  );
}
