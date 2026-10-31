import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getToken, inr, useApi } from '../api.js';
import { Btn, Card, ErrorBox, Funnel, Hero, Loading, Stat, Table } from '../components/ui.jsx';

// Order the lifecycle funnel so it reads top-to-bottom like the subscription flow.
const FUNNEL_ORDER = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'];

async function downloadCsv(type) {
  const res = await fetch(`/api/reports/export.csv?type=${type}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement('a'), { href: url, download: `${type}.csv` }).click();
}

export default function Dashboard() {
  const sum = useApi('/reports/summary', { poll: 30000 });       // refreshes every 30 s
  const rev = useApi('/reports/revenue?group=month', { poll: 30000 });
  const over = useApi('/reports/overdue?limit=10', { poll: 30000 });
  const breakdown = useApi('/reports/status-breakdown', { poll: 30000 });
  const s = sum.data;

  // Build the lifecycle funnel from real subscription counts, in flow order, including zero states.
  const subCounts = Object.fromEntries((breakdown.data?.subscriptions || []).map((r) => [r.status, Number(r.count)]));
  const funnelItems = FUNNEL_ORDER.map((label) => ({ label, count: subCounts[label] ?? 0 }));

  return (
    <div className="space-y-4">
      <Hero
        eyebrow="Brightloop Operations"
        title="Recurring Billing Overview"
        description="Real-time subscription metrics, recurring cycles, and revenue collection health."
        actions={<>
          <Btn kind="ghost" onClick={() => downloadCsv('invoices')}>Export invoices CSV</Btn>
          <Btn kind="ghost" onClick={() => downloadCsv('payments')}>Export payments CSV</Btn>
        </>}
      />
      <ErrorBox error={sum.error} /><Loading loading={sum.loading && !s} />
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Active subscriptions" value={Number(s.active_subscriptions).toLocaleString('en-IN')}
            sub="Currently billing customers" icon="⟳" iconTone="bg-sky-100 text-sky-700" />
          <Stat label="MRR (before tax)" value={inr(s.mrr)} tone="text-brand"
            sub="Monthly recurring base" icon="↗" iconTone="bg-brand/10 text-brand" />
          <Stat label="Revenue collected" value={inr(s.revenue_collected)} tone="text-emerald-700"
            sub="Cash received to date" icon="₹" iconTone="bg-emerald-100 text-emerald-700" />
          <Stat label="Outstanding" value={inr(s.outstanding)}
            sub="Awaiting collection" icon="⧗" iconTone="bg-slate-100 text-slate-600" />
          <Stat label={`Overdue (${s.overdue_invoices})`} value={inr(s.overdue_amount)} tone="text-red-600"
            sub="Past the due date" icon="!" iconTone="bg-red-100 text-red-700" />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Revenue collected by month">
            {rev.data?.length ? (
              <div className="h-64"><ResponsiveContainer><BarChart data={rev.data.map((r) => ({ ...r, revenue: Number(r.revenue) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="period" fontSize={11} /><YAxis fontSize={11} />
                <Tooltip formatter={(v) => inr(v)} /><Bar dataKey="revenue" fill="#714B67" radius={[4, 4, 0, 0]} />
              </BarChart></ResponsiveContainer></div>
            ) : <p className="text-sm text-slate-500">No payments yet.</p>}
          </Card>
        </div>
        <Card title="Subscription state funnel">
          <p className="text-[11px] text-slate-400 -mt-2 mb-3">Current subscription lifecycle distribution</p>
          <Funnel items={funnelItems} />
        </Card>
      </div>
      <Card title="Overdue invoices (oldest first)">
        <Table rows={over.data?.data} empty="No overdue invoices. 🎉" columns={[
          { label: 'Invoice', key: 'number' }, { label: 'Customer', key: 'customer_name' }, { label: 'Due', key: 'due_date' },
          { label: 'Days late', render: (r) => <b className="text-red-600">{r.days_overdue}</b> }, { label: 'Balance', render: (r) => inr(r.balance) },
        ]} />
      </Card>
    </div>
  );
}
