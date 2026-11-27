import React, { useEffect, useRef, useState } from 'react';

/**
 * Phone-only pull-to-refresh with a clay hand.
 * Pull the page down from the very top: an arm reaches down into the gap with an open hand. Let go far enough and
 * the hand grabs the page's top edge (the page creases like cloth), yanks it back up, and the store's data is
 * fetched again. Let go early and the page just springs back.
 *
 * The page is moved with the CSS `translate` property on the wrapper's in-flow children only, so fixed bars
 * (bottom nav, WhatsApp bubble, drawers) stay put.
 */

const THRESHOLD = 86;   // px of visible pull needed to refresh
const MAX = 150;        // the pull never shows more than this
const GRAB_MS = 620;    // hand pulls the page back up
const LEAVE_MS = 320;   // arm goes back up

type Phase = 'idle' | 'pull' | 'grab' | 'leave';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Rubber band: the further you drag, the less it gives. */
const band = (dy: number) => MAX * (1 - Math.exp(-dy / (MAX * 1.15)));

/* ---------- the hand (original clay-style drawing) ---------- */

const ClayDefs = () => (
  <defs>
    <linearGradient id="ptr-arm" x1="0" x2="1">
      <stop offset="0" stopColor="#e9879c" />
      <stop offset=".38" stopColor="#ffc3cf" />
      <stop offset=".62" stopColor="#ffb2c1" />
      <stop offset="1" stopColor="#de7790" />
    </linearGradient>
    <radialGradient id="ptr-skin" cx=".42" cy=".3" r=".85">
      <stop offset="0" stopColor="#ffd6de" />
      <stop offset=".55" stopColor="#ffb0c0" />
      <stop offset="1" stopColor="#e3829a" />
    </radialGradient>
    <radialGradient id="ptr-pad" cx=".45" cy=".35" r=".8">
      <stop offset="0" stopColor="#ffc9d4" />
      <stop offset="1" stopColor="#ee96aa" />
    </radialGradient>
    <filter id="ptr-soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#8a2c45" floodOpacity=".22" />
    </filter>
  </defs>
);

/** Fingers pointing down, a little spread: reaching for the page. Wrist at y=0. */
const OpenHand = () => (
  <g filter="url(#ptr-soft)">
    {/* thumb, growing out of the palm's side */}
    <path d="M-25 14 C-36 18 -44 30 -46 42 C-47 50 -38 54 -33 47 C-29 40 -24 33 -18 30 Z" fill="url(#ptr-skin)" stroke="#df8aa0" strokeWidth=".8" />
    <g stroke="#df8aa0" strokeWidth=".8" fill="url(#ptr-skin)">
      <path d="M-27 40 C-29 52 -28 64 -22 68 C-16 71 -12 64 -12 56 L-12 40 Z" />
      <path d="M-13 42 C-14 56 -12 72 -5 75 C1 77 3 70 3 60 L3 42 Z" />
      <path d="M2 42 C2 56 4 72 11 74 C17 75 18 68 17 58 L16 42 Z" />
      <path d="M15 40 C16 52 18 62 23 65 C28 67 30 60 28 50 L27 38 Z" />
    </g>
    <g fill="url(#ptr-pad)">
      <ellipse cx="-19" cy="63" rx="4.5" ry="3.6" /><ellipse cx="-4" cy="70" rx="4.5" ry="3.6" />
      <ellipse cx="10" cy="69" rx="4.5" ry="3.6" /><ellipse cx="23" cy="60" rx="4" ry="3.2" />
    </g>
    <path d="M-24 0 C-26 14 -30 30 -28 42 C-26 50 -14 52 0 52 C14 52 27 50 29 42 C31 30 26 14 24 0 Z" fill="url(#ptr-skin)" />
    <ellipse cx="-7" cy="20" rx="10" ry="14" fill="#fff" opacity=".25" />
  </g>
);

/** Closed hand holding the page edge. */
const Fist = () => (
  <g filter="url(#ptr-soft)">
    <path d="M-26 0 C-28 12 -32 26 -31 38 C-30 52 -17 60 0 60 C17 60 30 52 31 38 C32 26 28 12 26 0 Z" fill="url(#ptr-skin)" />
    <g stroke="#df8aa0" strokeWidth=".8" fill="url(#ptr-skin)">
      <rect x="-29" y="34" width="15.5" height="24" rx="7.5" />
      <rect x="-14.5" y="36" width="15.5" height="25" rx="7.5" />
      <rect x="0" y="36" width="15.5" height="25" rx="7.5" />
      <rect x="14.5" y="34" width="15" height="23" rx="7.5" />
    </g>
    <path d="M-31 26 C-22 22 -6 24 7 31 C12 34 11 41 5 41 C-7 40 -21 39 -30 41 Z" fill="url(#ptr-pad)" stroke="#df8aa0" strokeWidth=".8" />
    <ellipse cx="-9" cy="14" rx="11" ry="9" fill="#fff" opacity=".25" />
  </g>
);

/** Creases spreading from the grab point, like a sheet pinched and lifted. */
const Wrinkles = ({ stretch }: { stretch: number }) => (
  <svg width="340" height="170" viewBox="-170 0 340 170" className="block" style={{ transform: `scaleY(${0.6 + stretch * 0.6})`, transformOrigin: '50% 0' }}>
    <defs>
      <filter id="ptr-blur"><feGaussianBlur stdDeviation="2.4" /></filter>
      <radialGradient id="ptr-fade" cx=".5" cy="0" r=".9"><stop offset="0" stopColor="#000" stopOpacity=".16" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="0" cy="0" rx="150" ry="80" fill="url(#ptr-fade)" />
    {[[-150, 120], [-105, 160], [-52, 168], [52, 168], [105, 160], [150, 120], [-20, 150], [22, 152]].map(([x, y], i) => (
      <g key={i}>
        <path d={`M${x * 0.06} 6 Q ${x * 0.5} ${y * 0.32} ${x} ${y}`} stroke="#3b2a30" strokeOpacity=".2" strokeWidth="7" fill="none" filter="url(#ptr-blur)" strokeLinecap="round" />
        <path d={`M${x * 0.06 + 3} 6 Q ${x * 0.5 + 5} ${y * 0.32} ${x + 8} ${y}`} stroke="#fff" strokeOpacity=".75" strokeWidth="3" fill="none" filter="url(#ptr-blur)" strokeLinecap="round" />
      </g>
    ))}
  </svg>
);

export const PullToRefresh: React.FC<{ target: React.RefObject<HTMLElement | null>; enabled: boolean; onRefresh: () => Promise<unknown> }> = ({ target, enabled, onRefresh }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pull, setPull] = useState(0);      // how far the page is down (px)
  const [lift, setLift] = useState(0);      // 0→1 while the hand pulls the page back up
  const [armUp, setArmUp] = useState(0);    // 0→1 while the arm leaves
  const st = useRef({ startY: 0, startX: 0, active: false, decided: false, d: 0, busy: false, buzzed: false, els: [] as HTMLElement[] });

  // Move only the page's in-flow parts; fixed bars and drawers stay where they are
  const movePage = (y: number) => {
    const s = st.current;
    if (!s.els.length && target.current) {
      s.els = Array.from(target.current.children).filter((el) => getComputedStyle(el).position !== 'fixed') as HTMLElement[];
    }
    for (const el of s.els) el.style.translate = y ? `0 ${y}px` : '';
  };

  useEffect(() => {
    if (!enabled) return;
    const phoneOnly = window.matchMedia('(pointer: coarse) and (max-width: 1023px)');
    if (!phoneOnly.matches) return;
    const root = document.documentElement;
    const prevOverscroll = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = 'none';  // the browser's own pull-to-refresh would fight this one

    const blocked = () => document.body.style.position === 'fixed' || !!document.querySelector('[role="dialog"][aria-modal="true"]');

    const onStart = (e: TouchEvent) => {
      const s = st.current;
      if (s.busy || e.touches.length !== 1 || window.scrollY > 0 || blocked()) return;
      s.startY = e.touches[0].clientY; s.startX = e.touches[0].clientX;
      s.active = true; s.decided = false; s.d = 0; s.buzzed = false; s.els = [];
    };
    const onMove = (e: TouchEvent) => {
      const s = st.current;
      if (!s.active) return;
      const dy = e.touches[0].clientY - s.startY;
      const dx = e.touches[0].clientX - s.startX;
      if (!s.decided) {
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
        // Only a downward, mostly vertical drag from the top is a pull; anything else is normal scrolling/swiping
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) { s.active = false; return; }
        s.decided = true;
        setPhase('pull'); setLift(0); setArmUp(0);
      }
      e.preventDefault();
      s.d = band(Math.max(0, dy));
      if (s.d >= THRESHOLD && !s.buzzed) { s.buzzed = true; try { navigator.vibrate?.(12); } catch { /* not supported */ } }
      setPull(s.d);
      movePage(s.d);
    };
    const animate = (ms: number, step: (t: number) => void) => new Promise<void>((done) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        step(t);
        if (t < 1) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    const onEnd = async () => {
      const s = st.current;
      if (!s.active) return;
      s.active = false;
      if (!s.decided) return;
      const from = s.d;
      s.busy = true;
      if (from >= THRESHOLD) {
        // Grab, yank the page up, let go
        setPhase('grab');
        const refreshed = Promise.resolve(onRefresh()).catch(() => {});
        await new Promise((r) => setTimeout(r, 110));
        await animate(GRAB_MS, (t) => { const y = from * (1 - ease(t)); setPull(y); setLift(t); movePage(y); });
        setPhase('leave');
        await animate(LEAVE_MS, (t) => setArmUp(ease(t)));
        await refreshed;
      } else {
        // Not far enough: spring back, arm goes home
        setPhase('leave');
        await animate(260, (t) => { const y = from * (1 - ease(t)); setPull(y); setArmUp(ease(t)); movePage(y); });
      }
      movePage(0);
      s.els = [];
      setPull(0); setPhase('idle'); setLift(0); setArmUp(0);
      s.busy = false;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      root.style.overscrollBehaviorY = prevOverscroll;
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      movePage(0);
    };
  }, [enabled]);

  if (phase === 'idle') return null;

  const ready = pull >= THRESHOLD;
  const grabbing = phase === 'grab' || (phase === 'leave' && lift > 0);
  // The hand reaches the page's top edge once the pull is far enough; before that it's on its way down
  const reach = grabbing ? pull : Math.min(pull, pull * 0.55 + THRESHOLD * 0.45 * (pull / THRESHOLD));
  const handY = reach - (grabbing ? 50 : 84) - armUp * (reach + 180);

  return (
    <div className="fixed inset-x-0 top-0 z-[45] pointer-events-none lg:hidden" aria-hidden="true" style={{ height: Math.max(pull, 0) + 180 }}>
      {/* the gap above the page */}
      <div className="absolute inset-x-0 top-0" style={{ height: pull, background: 'radial-gradient(120% 140% at 50% 0%, #f3eee9 0%, #e6dfd8 100%)', boxShadow: 'inset 0 -10px 18px -12px rgba(60,30,20,.35)' }} />
      {/* creases on the page while it's held */}
      {grabbing && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: pull - 2, opacity: phase === 'leave' ? 1 - armUp : Math.min(1, lift * 4) }}>
          <Wrinkles stretch={1 - lift} />
        </div>
      )}
      {/* arm + hand */}
      <svg className="absolute left-1/2 -translate-x-1/2 overflow-visible" width="130" height="104" viewBox="-50 0 100 80"
        style={{ top: handY, transition: phase === 'pull' ? 'none' : undefined }}>
        <ClayDefs />
        <rect x="-24" y="-700" width="48" height="706" rx="20" fill="url(#ptr-arm)" />
        <g style={{ transform: `scale(${ready || grabbing ? 1 : 0.92 + (pull / THRESHOLD) * 0.08})`, transformOrigin: '0 0', transition: 'transform .15s' }}>
          {grabbing ? <Fist /> : <OpenHand />}
        </g>
      </svg>
    </div>
  );
};
