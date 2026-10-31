import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { OfflineBanner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Subscriptions from './pages/Subscriptions.jsx';
import Invoices from './pages/Invoices.jsx';
import Portal from './pages/Portal.jsx';
import Admin from './pages/Admin.jsx';
import Payments from './pages/Payments.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

const home = (role) => (role === 'customer' ? '/portal' : '/dashboard');

function Protected() {
  const { user } = useAuth();
  return user ? <Layout /> : <Navigate to="/login" replace />;
}
// Route guard: the API enforces the same rules, this just keeps people off screens they cannot use.
function Role({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to={home(user.role)} replace />;
}

// [icon, path, label] — icons are emoji glyphs so there's no extra icon dependency.
const STAFF_LINKS = [
  ['▣', '/dashboard', 'Dashboard'],
  ['⟳', '/subscriptions', 'Subscriptions'],
  ['🧾', '/invoices', 'Invoices'],
  ['₹', '/payments', 'Payments'],
];
const ADMIN_LINK = ['⚙', '/admin', 'Admin'];
const CUSTOMER_LINKS = [['👤', '/portal', 'My account']];

function Layout() {
  const { user, logout } = useAuth();
  const links = user.role === 'customer'
    ? CUSTOMER_LINKS
    : [...STAFF_LINKS, ...(user.role === 'admin' ? [ADMIN_LINK] : [])];

  return (
    <div className="min-h-screen flex flex-col">
      <OfflineBanner />
      <div className="flex-1 flex">
        <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100">
            <span className="w-8 h-8 rounded-lg bg-brand text-white grid place-items-center font-bold text-sm">B</span>
            <div className="leading-tight">
              <div className="font-bold text-slate-900 text-sm">Brightloop</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Billing Platform</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {links.map(([icon, to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-brand/10 text-brand font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <span className="w-5 text-center text-base leading-none">{icon}</span>{label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2.5 px-2 mb-2">
              <span className="w-8 h-8 rounded-full bg-brand/15 text-brand grid place-items-center text-xs font-bold uppercase">{(user.name || '?').slice(0, 1)}</span>
              <div className="leading-tight min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">{user.name}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">{user.role}</div>
              </div>
            </div>
            <button onClick={logout} className="w-full text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg py-1.5 hover:bg-slate-50">Sign out</button>
          </div>
        </aside>
        <main className="flex-1 min-w-0 overflow-x-hidden bg-slate-50">
          <div className="w-full max-w-6xl mx-auto p-4 sm:p-6"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const staff = ['admin', 'staff'];
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home(user.role)} replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<Protected />}>
        <Route index element={<Navigate to={home(user?.role)} replace />} />
        <Route path="dashboard" element={<Role roles={staff}><Dashboard /></Role>} />
        <Route path="subscriptions" element={<Role roles={staff}><Subscriptions /></Role>} />
        <Route path="invoices" element={<Role roles={staff}><Invoices /></Role>} />
        <Route path="payments" element={<Role roles={staff}><Payments /></Role>} />
        <Route path="admin" element={<Role roles={['admin']}><Admin /></Role>} />
        <Route path="portal" element={<Role roles={['customer']}><Portal /></Role>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
