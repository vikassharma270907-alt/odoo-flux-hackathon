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

function Layout() {
  const { user, logout } = useAuth();
  const links = user.role === 'customer'
    ? [['/portal', 'My account']]
    : [
        ['/dashboard', 'Dashboard'],
        ['/subscriptions', 'Subscriptions'],
        ['/invoices', 'Invoices'],
        ['/payments', 'Payments'],
        ...(user.role === 'admin' ? [['/admin', 'Admin']] : []),
      ];
  return (
    <div className="min-h-screen flex flex-col">
      <OfflineBanner />
      <header className="bg-brand text-white px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold tracking-tight">Brightloop Billing</span>
          <nav className="flex gap-1 text-sm">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `px-3 py-1.5 rounded-md ${isActive ? 'bg-white text-brand font-semibold' : 'text-purple-100 hover:text-white'}`}>{label}</NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:inline">{user.name} · <b className="uppercase">{user.role}</b></span>
          <button onClick={logout} className="px-2.5 py-1 rounded-md bg-black/25 hover:bg-black/40">Sign out</button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6"><Outlet /></main>
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
