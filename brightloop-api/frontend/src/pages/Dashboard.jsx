import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getToken, inr, useApi } from '../api.js';
import { Btn, Card, ErrorBox, Loading, Stat, Table } from '../components/ui.jsx';

async function downloadCsv(type) {
  const res = await fetch(`/api/reports/export.csv?type=${type}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement('a'), { href: url, download: `${type}.csv` }).click();
}

export default function Dashboard() {
  const sum = useApi('/reports/summary', { poll: 30000 });       // refreshes every 30 s
  const rev = useApi('/reports/revenue?group=month', { poll: 30000 });
  const over = useApi('/reports/overdue?limit=10', { poll: 30000 });
  const s = sum.data;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-lg font-bold">Finance dashboard</h1>
        <div className="flex gap-2"><Btn kind="ghost" onClick={() => downloadCsv('invoices')}>Export invoices CSV</Btn><Btn kind="ghost" onClick={() => downloadCsv('payments')}>Export payments CSV</Btn></div></div>
      <ErrorBox error={sum.error} /><Loading loading={sum.loading && !s} />
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Active subscriptions" value={Number(s.active_subscriptions).toLocaleString('en-IN')} />
          <Stat label="MRR (before tax)" value={inr(s.mrr)} tone="text-brand" />
          <Stat label="Revenue collected" value={inr(s.revenue_collected)} tone="text-emerald-700" />
          <Stat label="Outstanding" value={inr(s.outstanding)} />
          <Stat label={`Overdue (${s.overdue_invoices})`} value={inr(s.overdue_amount)} tone="text-red-600" />
        </div>
      )}
      <Card title="Revenue collected by month">
        {rev.data?.length ? (
          <div className="h-64"><ResponsiveContainer><BarChart data={rev.data.map((r) => ({ ...r, revenue: Number(r.revenue) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="period" fontSize={11} /><YAxis fontSize={11} />
            <Tooltip formatter={(v) => inr(v)} /><Bar dataKey="revenue" fill="#714B67" radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        ) : <p className="text-sm text-slate-500">No payments yet.</p>}
      </Card>
      <Card title="Overdue invoices (oldest first)">
        <Table rows={over.data?.data} empty="No overdue invoices. 🎉" columns={[
          { label: 'Invoice', key: 'number' }, { label: 'Customer', key: 'customer_name' }, { label: 'Due', key: 'due_date' },
          { label: 'Days late', render: (r) => <b className="text-red-600">{r.days_overdue}</b> }, { label: 'Balance', render: (r) => inr(r.balance) },
        ]} />
      </Card>
    </div>
  );
}
