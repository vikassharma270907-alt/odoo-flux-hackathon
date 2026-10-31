import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Btn, ErrorBox, Field, inputCls } from '../components/ui.jsx';

// Same rules as the Login signup checklist and the server (domain/rules.validatePassword).
const rules = (pw) => [
  ['More than 8 characters', pw.length > 8], ['An uppercase letter', /[A-Z]/.test(pw)],
  ['A lowercase letter', /[a-z]/.test(pw)], ['A special character', /[^A-Za-z0-9\s]/.test(pw)],
];

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [f, setF] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError(null); setInfo('');
    if (f.password !== f.confirm) { setError({ message: 'The two passwords do not match.' }); return; }
    setBusy(true);
    try {
      const r = await api('/auth/reset-password', { method: 'POST', body: { token, password: f.password } });
      setInfo(r.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-brand">Choose a new password</h1>
          <p className="text-xs text-slate-500">Reset links are valid for one hour.</p>
        </div>
        {!token && <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-800">This page needs a reset link. Request one from the “Forgot password?” option on the sign-in screen.</div>}
        <ErrorBox error={error} />
        {info && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-800">{info}</div>}
        <Field label="New password"><input type="password" className={inputCls} value={f.password} onChange={set('password')} required disabled={!token} /></Field>
        <Field label="Confirm new password"><input type="password" className={inputCls} value={f.confirm} onChange={set('confirm')} required disabled={!token} /></Field>
        <ul className="text-[11px] space-y-0.5">{rules(f.password).map(([t, ok]) => <li key={t} className={ok ? 'text-emerald-700' : 'text-slate-500'}>{ok ? '✓' : '○'} {t}</li>)}</ul>
        <Btn type="submit" disabled={busy || !token} className="w-full py-2.5">Update password</Btn>
        <div className="text-xs text-brand border-t pt-3"><Link to="/login">Back to sign in</Link></div>
      </form>
    </div>
  );
}
