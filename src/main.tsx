import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root')!;

// The skeleton in index.html covers the moment before the app draws. CSS hides it as soon as #root has real
// content; this removes it then too, for browsers without :has().
const boot = document.getElementById('boot');
if (boot) {
  const drawn = () => [...root.children].some((el) => !el.classList.contains('seo-prerender'));
  const mo = new MutationObserver(() => { if (drawn()) { boot.remove(); mo.disconnect(); } });
  mo.observe(root, {childList: true});
}

createRoot(root).render(<App />);
