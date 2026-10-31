import { useCallback, useEffect, useState } from 'react';

const TOKEN = 'bl_token';
const USER = 'bl_user';
const CACHE = 'bl_cache:';

export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details || []; }
}
export const getToken = () => localStorage.getItem(TOKEN);
export const getUser = () => { try { return JSON.parse(localStorage.getItem(USER)); } catch { return null; } };
export function saveSession({ token, user }) { localStorage.setItem(TOKEN, token); localStorage.setItem(USER, JSON.stringify(user)); }
export function clearSession() {
  localStorage.removeItem(TOKEN); localStorage.removeItem(USER);
  Object.keys(localStorage).filter((k) => k.startsWith(CACHE)).forEach((k) => localStorage.removeItem(k)); // never show one user's cache to the next
}

/** JSON request. GET responses are cached; if the network is down the last good copy is returned and 'bl-offline' fires. */
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    const cached = method === 'GET' && localStorage.getItem(CACHE + path);
    if (cached) { window.dispatchEvent(new Event('bl-offline')); return JSON.parse(cached); }
    throw new ApiError(0, 'You appear to be offline and nothing is cached for this page yet.');
  }
  window.dispatchEvent(new Event('bl-online'));
  if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('bl-logout'));
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error || 'Request failed', Array.isArray(data?.details) ? data.details : []);
  if (method === 'GET') { try { localStorage.setItem(CACHE + path, JSON.stringify(data)); } catch { /* storage full: ignore */ } }
  return data;
}

/** Printable invoice: the endpoint needs the JWT, so fetch it and open the HTML as a blob. */
export async function printInvoice(id) {
  const res = await fetch(`/api/invoices/${id}/print`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new ApiError(res.status, 'Could not load the invoice');
  const url = URL.createObjectURL(new Blob([await res.text()], { type: 'text/html' }));
  window.open(url, '_blank');
}

export const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== '' && v != null && v !== false) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** Load a GET path; refetches when the path changes; optional polling. */
export function useApi(path, { poll = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(async (quiet) => {
    if (!quiet) setState((s) => ({ ...s, loading: true }));
    try { setState({ data: await api(path), error: null, loading: false }); }
    catch (e) { setState((s) => ({ data: s.data, error: e, loading: false })); }
  }, [path]);
  useEffect(() => { load(false); }, [load]);
  useEffect(() => { if (!poll) return undefined; const t = setInterval(() => load(true), poll); return () => clearInterval(t); }, [load, poll]);
  return { ...state, reload: () => load(true) };
}

export const inr = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const today = () => new Date().toISOString().slice(0, 10);
