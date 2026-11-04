import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const POLL_MS = 15000;
const SOUND_KEY = 'homex_admin_sound';

let audioCtx: AudioContext | null = null;
const getCtx = () => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
  } catch {
    return null;
  }
};

const SOUND_URL = '/sounds/new-order.mp3';
let soundBuf: AudioBuffer | null = null;
let loading: Promise<void> | null = null;
const loadSound = () => {
  const ctx = getCtx();
  if (!ctx || soundBuf || loading) return loading;
  loading = fetch(SOUND_URL)
    .then((r) => r.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    .then((buf) => { soundBuf = buf; })
    .catch(() => { loading = null; });
  return loading;
};

/** The new-order alert sound (the owner's chosen tone). Falls back to a synthesized chime. */
export function playChime() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  // played twice at full volume so it's noticed even from across the room
  if (soundBuf) {
    const t0 = ctx.currentTime + 0.05;
    for (let k = 0; k < 2; k++) {
      const src = ctx.createBufferSource();
      src.buffer = soundBuf;
      src.connect(ctx.destination);
      src.start(t0 + k * (soundBuf.duration + 0.2));
    }
    return;
  }
  try {
    const a = new Audio(SOUND_URL);
    a.volume = 1;
    let n = 0;
    a.onended = () => { if (++n < 2) { a.currentTime = 0; a.play().catch(() => {}); } };
    a.play().then(() => loadSound()).catch(() => synthChime(ctx));
  } catch {
    synthChime(ctx);
  }
}

function synthChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [
    [880, 0],
    [1318.5, 0.14],
    [1760, 0.28],
  ].forEach(([f, t]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + t);
    g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.45);
    o.connect(g).connect(ctx.destination);
    o.start(now + t);
    o.stop(now + t + 0.5);
  });
}

export type NewOrder = { id: number; code: string; name: string; total: number; city: string };

/**
 * Polls the server while the dashboard is open. When a new (real) order lands it plays a sound,
 * shows a browser notification and flashes the tab title.
 */
export function useOrderAlerts(onNew: (o: NewOrder | null, added: number) => void) {
  const [pending, setPending] = useState(0);
  const [sound, setSoundState] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== '0'; } catch { return true; }
  });
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const base = useRef<number | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const cb = useRef(onNew);
  cb.current = onNew;

  // Browsers only allow audio after the user touched the page once
  useEffect(() => {
    const unlock = () => { const c = getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); loadSound(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    let stop = false;
    let flash: number | undefined;
    const title = document.title;
    const tick = async () => {
      try {
        const d = await api.get('admin/orders-pulse');
        if (stop) return;
        setPending(d.pending);
        if (base.current !== null && d.count > base.current) {
          const added = d.count - base.current;
          if (soundRef.current) playChime();
          cb.current(d.last, added);
          if ('Notification' in window && Notification.permission === 'granted' && d.last) {
            try {
              const n = new Notification(`🛒 طلب جديد ${d.last.code}`, {
                body: `${d.last.name} — ${Math.round(d.last.total).toLocaleString('en-US')} ج.م${d.last.city ? ` — ${d.last.city}` : ''}`,
                icon: '/favicon.png',
                tag: `order-${d.last.id}`,
              });
              n.onclick = () => { window.focus(); location.hash = 'orders'; n.close(); };
            } catch { /* some mobile browsers only allow notifications from a service worker */ }
          }
          if (document.hidden) {
            let on = false;
            window.clearInterval(flash);
            flash = window.setInterval(() => { document.title = (on = !on) ? `(${added}) طلب جديد!` : title; }, 1000);
          }
        }
        base.current = d.count;
      } catch { /* offline or logged out — try again next tick */ }
    };
    const onVisible = () => { if (!document.hidden) { window.clearInterval(flash); document.title = title; tick(); } };
    tick();
    const t = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; window.clearInterval(t); window.clearInterval(flash); document.removeEventListener('visibilitychange', onVisible); document.title = title; };
  }, []);

  const setSound = (v: boolean) => {
    setSoundState(v);
    try { localStorage.setItem(SOUND_KEY, v ? '1' : '0'); } catch { /* ignore */ }
    if (v) playChime();
  };
  const askPermission = async () => {
    if (!('Notification' in window)) return;
    try { setPerm(await Notification.requestPermission()); } catch { /* ignore */ }
    playChime();
  };

  return { pending, sound, setSound, perm, askPermission };
}
