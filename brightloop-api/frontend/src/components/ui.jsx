import { useEffect, useState } from 'react';
import { inr } from '../api.js';

const TONE = {
  draft: 'bg-slate-100 text-slate-700 border-slate-300', quotation: 'bg-sky-50 text-sky-800 border-sky-300',
  confirmed: 'bg-teal-50 text-teal-800 border-teal-300', active: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  paused: 'bg-amber-50 text-amber-800 border-amber-300', closed: 'bg-slate-200 text-slate-600 border-slate-300',
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-300', cancelled: 'bg-red-50 text-red-800 border-red-300',
  overdue: 'bg-red-50 text-red-800 border-red-300',
};
export const Badge = ({ value }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TONE[value] || TONE.draft}`}>{value}</span>
);

export const Card = ({ title, action, children }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    {(title || action) && <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-sm text-slate-800">{title}</h2>{action}</div>}
    {children}
  </section>
);

/**
 * Metric card. `sub` is a supporting line under the value, `trend` is an
 * optional {dir:'up'|'down', text} chip, and `icon`/`iconTone` render a soft
 * tinted chip in the corner (e.g. an emoji or short glyph).
 */
export const Stat = ({ label, value, tone = '', sub, trend, icon, iconTone = 'bg-brand/10 text-brand' }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
    <div className="flex items-start justify-between gap-2">
      <div className="text-[11px] font-semibold uppercase text-slate-500 leading-tight">{label}</div>
      {icon && <span className={`shrink-0 w-8 h-8 grid place-items-center rounded-lg text-sm ${iconTone}`}>{icon}</span>}
    </div>
    <div className={`text-2xl font-bold mt-1 ${tone}`}>{value}</div>
    {sub && <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{sub}</div>}
    {trend && (
      <div className={`text-[11px] font-semibold mt-2 inline-flex items-center gap-1 ${trend.dir === 'down' ? 'text-red-600' : 'text-emerald-600'}`}>
        <span>{trend.dir === 'down' ? '↓' : '↑'}</span><span>{trend.text}</span>
      </div>
    )}
  </div>
);

/** Status funnel: a labelled, colour-dotted count list (subscription lifecycle, etc.). */
const DOT = {
  draft: 'bg-slate-400', quotation: 'bg-sky-500', confirmed: 'bg-teal-500',
  active: 'bg-emerald-500', paused: 'bg-amber-500', closed: 'bg-slate-300',
};
export const Funnel = ({ items }) => (
  <ul className="space-y-1.5">
    {items.map((it) => (
      <li key={it.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <span className={`w-2 h-2 rounded-full ${DOT[it.label] || 'bg-slate-400'}`} />
          <span className="uppercase tracking-wide">{it.label}</span>
        </span>
        <span className="text-sm font-bold text-slate-800">{it.count}</span>
      </li>
    ))}
  </ul>
);

/** Page hero: title, one-line description, and a slot for primary actions. */
export const Hero = ({ eyebrow, title, description, actions }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-wide text-brand/70">{eyebrow}</div>}
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1 max-w-xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  </section>
);

export const Btn = ({ kind = 'primary', className = '', ...p }) => (
  <button {...p} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
    kind === 'primary' ? 'bg-brand text-white hover:bg-brand-dark' : kind === 'danger' ? 'border border-red-300 text-red-700 hover:bg-red-50' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'} ${className}`} />
);

/** Server validation errors (400 details) and other failures, shown in one place. */
export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-xs text-red-800" role="alert">
      <div className="font-semibold">{error.message}</div>
      {error.details?.length > 0 && <ul className="list-disc ml-4 mt-1">{error.details.map((d, i) => <li key={i}>{d.field ? `${d.field}: ` : ''}{typeof d === 'string' ? d : d.message}</li>)}</ul>}
    </div>
  );
}

export const Field = ({ label, children }) => (
  <label className="block text-xs font-medium text-slate-700">{label}<div className="mt-1">{children}</div></label>
);
export const inputCls = 'w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand';

export function Pager({ page, pages, total, onPage }) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-600 mt-3">
      <span>{total ?? 0} result(s)</span>
      <div className="flex items-center gap-2">
        <Btn kind="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Btn>
        <span>Page {page} of {Math.max(pages || 1, 1)}</span>
        <Btn kind="ghost" disabled={page >= (pages || 1)} onClick={() => onPage(page + 1)}>Next</Btn>
      </div>
    </div>
  );
}

export function Table({ columns, rows, onRow, empty = 'Nothing to show yet.' }) {
  if (!rows?.length) return <p className="text-sm text-slate-500 py-6 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead><tr className="text-slate-500 uppercase border-b border-slate-200">{columns.map((c) => <th key={c.label} className="py-2 px-3">{c.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? 'cursor-pointer hover:bg-slate-50' : ''}>
              {columns.map((c) => <td key={c.label} className="py-2 px-3">{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Loading = ({ loading }) => (loading ? <p className="text-xs text-slate-500">Loading…</p> : null);

/** Shows a banner while the API is unreachable and cached data is being served. */
export function OfflineBanner() {
  const [off, setOff] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOff(false); const offl = () => setOff(true);
    window.addEventListener('bl-online', on); window.addEventListener('bl-offline', offl);
    window.addEventListener('online', on); window.addEventListener('offline', offl);
    return () => { ['bl-online', 'online'].forEach((e) => window.removeEventListener(e, on)); ['bl-offline', 'offline'].forEach((e) => window.removeEventListener(e, offl)); };
  }, []);
  return off ? <div className="bg-amber-100 text-amber-900 text-xs text-center py-1.5">Offline: showing the last saved data. Changes will not save until you reconnect.</div> : null;
}
export { inr };
