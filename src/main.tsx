import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { recordVisit } from './lib/visit';

const root = document.getElementById('root')!;

// The skeleton in index.html covers the moment before the app draws. CSS hides it as soon as #root has real
// content; this removes it then too, for browsers without :has().
const boot = document.getElementById('boot');
if (boot) {
  const drawn = () => [...root.children].some((el) => !el.classList.contains('seo-prerender'));
  const mo = new MutationObserver(() => { if (drawn()) { boot.remove(); mo.disconnect(); } });
  mo.observe(root, {childList: true});
}

// A page left open across a deploy may ask for a part of the app that is no longer on the server. Reload once to
// pick up the current version instead of showing a blank page (at most once a minute, so it can never loop).
const reloadForNewVersion = () => {
  try {
    const last = Number(sessionStorage.getItem('hx-reload') || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem('hx-reload', String(Date.now()));
  } catch { /* storage blocked: still reload once */ }
  location.reload();
  return true;
};
// Visitors' browser errors go to the dashboard's logs («صحة الموقع»), at most 3 per page view
let reported = 0;
const reportError = (message: string, src = '', stack = '') => {
  if (reported >= 3 || !message) return;
  reported++;
  fetch('/api/?r=log-client', {
    method: 'POST', keepalive: true, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Homex': '1' },
    body: JSON.stringify({ message: message.slice(0, 500), src: src.slice(0, 200), stack: stack.slice(0, 800), page: location.pathname }),
  }).catch(() => {});
};
window.addEventListener('error', (e) => {
  if (!e.message) return;  // a failed image or script tag, not a code error
  reportError(e.message, e.filename ? `${e.filename}:${e.lineno}` : '', (e.error as Error | undefined)?.stack || '');
});
window.addEventListener('unhandledrejection', (e) => {
  const err = e.reason as Error | undefined;
  const msg = String(err?.message || e.reason || '');
  if (/dynamically imported module|Importing a module script failed|Failed to fetch|NetworkError|Load failed|AbortError/i.test(msg)) return;
  reportError(msg, '', err?.stack || '');
});

window.addEventListener('vite:preloadError', (e) => { if (reloadForNewVersion()) e.preventDefault(); });
window.addEventListener('unhandledrejection', (e) => {
  const msg = String((e.reason && (e.reason as Error).message) || e.reason || '');
  if (/dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(msg)) reloadForNewVersion();
});

createRoot(root).render(<App />);
recordVisit();
