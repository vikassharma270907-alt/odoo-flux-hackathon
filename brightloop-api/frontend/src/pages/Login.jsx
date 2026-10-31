import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Btn, ErrorBox, Field, inputCls } from '../components/ui.jsx';

// Mirrors the server rules so people see problems before submitting (the server still enforces them).
const rules = (pw) => [
  ['More than 8 characters', pw.length > 8], ['An uppercase letter', /[A-Z]/.test(pw)],
  ['A lowercase letter', /[a-z]/.test(pw)], ['A special character', /[^A-Za-z0-9\s]/.test(pw)],
];

export default function Login() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login'); // login | signup | forgot
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError(null); setInfo(''); setBusy(true);
    try {
      if (mode === 'login') await login(f.email, f.password);
      else if (mode === 'signup') await signup(f.name, f.email, f.password);
      else { const r = await api('/auth/forgot-password', { method: 'POST', body: { email: f.email } }); setInfo(r.message); }
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div><h1 className="text-xl font-bold text-brand">Brightloop Billing</h1>
          <p className="text-xs text-slate-500">{mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create a customer account' : 'We will email you a reset link'}</p></div>
        <ErrorBox error={error} />
        {info && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-800">{info}</div>}
        {mode === 'signup' && <Field label="Name"><input className={inputCls} value={f.name} onChange={set('name')} required /></Field>}
        <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={set('email')} required /></Field>
        {mode !== 'forgot' && <Field label="Password"><input type="password" className={inputCls} value={f.password} onChange={set('password')} required /></Field>}
        {mode === 'signup' && (
          <ul className="text-[11px] space-y-0.5">{rules(f.password).map(([t, ok]) => <li key={t} className={ok ? 'text-emerald-700' : 'text-slate-500'}>{ok ? '✓' : '○'} {t}</li>)}</ul>
        )}
        <Btn type="submit" disabled={busy} className="w-full py-2.5">{mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</Btn>
        <div className="flex justify-between text-xs text-brand">
          {mode === 'login' ? <><button type="button" onClick={() => setMode('signup')}>Create account</button><button type="button" onClick={() => setMode('forgot')}>Forgot password?</button></>
            : <button type="button" onClick={() => { setMode('login'); setError(null); setInfo(''); }}>Back to sign in</button>}
        </div>
        <p className="text-[11px] text-slate-400 border-t pt-3">Demo: admin@brightloop.test / Admin@12345 · staff@brightloop.test / Staff@12345 · customer@brightloop.test / Customer@123</p>
      </form>
    </div>
  );
}
