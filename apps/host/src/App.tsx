import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { KioskView } from './kiosk';

const AdminPanel = lazy(() => import('./admin').then(m => ({ default: m.AdminPanel })));

const ADMIN_TOKEN_KEY = 'xemd-admin-token';

function getRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#/admin')) return 'admin';
  return 'kiosk';
}

function AdminGate() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(ADMIN_TOKEN_KEY));
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'X-Admin-Token': input },
      });
      if (res.status !== 200) { setError(true); return; }
    } catch {
      setError(true);
      return;
    }
    sessionStorage.setItem(ADMIN_TOKEN_KEY, input);
    setToken(input);
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-72">
          <p className="text-white font-semibold text-center">Admin access</p>
          <input
            ref={inputRef}
            type="password"
            placeholder="Admin token"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
          />
          {error && <p className="text-red-400 text-xs text-center">Invalid token</p>}
          <button
            type="submit"
            className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><p className="text-zinc-500">Loading…</p></div>}>
      <AdminPanel />
    </Suspense>
  );
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handler = () => setRoute(getRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (route === 'admin') return <AdminGate />;

  return <KioskView />;
}
