import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Btn, ErrorBox, Field, inputCls } from '../components/ui.jsx';

const rules = (pw) => [
  ['More than 8 characters', pw.length > 8],
  ['An uppercase letter', /[A-Z]/.test(pw)],
  ['A lowercase letter', /[a-z]/.test(pw)],
  ['A special character', /[^A-Za-z0-9\s]/.test(pw)],
];

export default function ResetPassword() {
  const nav = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
      setTimeout(() => nav('/login'), 1800);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-brand">Set a new password</h1>
          <p className="text-xs text-slate-500">Choose a strong password for your account.</p>
        </div>
        {done ? (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-800">
            Password updated. Redirecting you to sign in…
          </div>
        ) : (
          <>
            <ErrorBox error={error} />
            {!token && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-800">
                This link is missing its token. Request a new reset link from the sign-in page.
              </div>
            )}
            <Field label="New password">
              <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <ul className="text-[11px] space-y-0.5">
              {rules(password).map(([t, ok]) => (
                <li key={t} className={ok ? 'text-emerald-700' : 'text-slate-500'}>{ok ? '✓' : '○'} {t}</li>
              ))}
            </ul>
            <Btn type="submit" disabled={busy || !token} className="w-full py-2.5">Update password</Btn>
          </>
        )}
        <button type="button" onClick={() => nav('/login')} className="text-xs text-brand">Back to sign in</button>
      </form>
    </div>
  );
}
