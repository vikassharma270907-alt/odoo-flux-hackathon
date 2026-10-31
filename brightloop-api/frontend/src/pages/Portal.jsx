import { useState } from 'react';
import { api, inr, printInvoice, useApi } from '../api.js';
import { Badge, Btn, Card, ErrorBox, Hero, Loading, Table } from '../components/ui.jsx';

export default function Portal() {
  const subs = useApi('/subscriptions?limit=50');
  const invs = useApi('/invoices?limit=50');
  const [err, setErr] = useState(null);
  const act = async (fn) => { setErr(null); try { await fn(); subs.reload(); } catch (e) { setErr(e); } };
  const post = (id, a, body) => act(() => api(`/subscriptions/${id}/${a}`, { method: 'POST', body }));
  return (
    <div className="space-y-4">
      <Hero
        eyebrow="Brightloop"
        title="My account"
        description="View your subscriptions, manage renewals, and download your invoices."
      />
      <ErrorBox error={err || subs.error || invs.error} />
      <Card title="My subscriptions"><Loading loading={subs.loading && !subs.data} />
        <Table rows={subs.data?.data} empty="You have no subscriptions yet." columns={[
          { label: 'Number', key: 'number' }, { label: 'Plan', render: (r) => `${r.plan_name} (${r.period})` },
          { label: 'Expiry', key: 'expiry_date' }, { label: 'Status', render: (r) => <Badge value={r.status} /> },
          { label: 'Manage', render: (r) => (
            <div className="flex gap-1">
              {r.status === 'active' && <><Btn kind="ghost" onClick={() => post(r.id, 'transition', { to: 'paused' })}>Pause</Btn><Btn kind="ghost" onClick={() => post(r.id, 'renew')}>Renew</Btn></>}
              {r.status === 'paused' && <Btn kind="ghost" onClick={() => post(r.id, 'transition', { to: 'active' })}>Resume</Btn>}
              {(r.status === 'active' || r.status === 'paused') && <Btn kind="danger" onClick={() => window.confirm('Close this subscription?') && post(r.id, 'transition', { to: 'closed' })}>Close</Btn>}
            </div>) },
        ]} /></Card>
      <Card title="My invoices"><Loading loading={invs.loading && !invs.data} />
        <Table rows={invs.data?.data} empty="No invoices yet." columns={[
          { label: 'Invoice', key: 'number' }, { label: 'Issued', key: 'issue_date' }, { label: 'Due', key: 'due_date' },
          { label: 'Total', render: (r) => inr(r.total) }, { label: 'Balance', render: (r) => inr(r.balance) },
          { label: 'Status', render: (r) => <Badge value={r.is_overdue ? 'overdue' : r.status} /> },
          { label: '', render: (r) => <Btn kind="ghost" onClick={() => printInvoice(r.id).catch(setErr)}>Print</Btn> },
        ]} /></Card>
    </div>
  );
}
