import React, { useEffect, useRef, useState } from 'react';

/**
 * Phone-only pull-to-refresh with a cartoon hand (dark sleeve, orange cuff: the site's colors).
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
    {/* sleeve in the header's dark, cuff in the brand orange, a soft round hand */}
    <linearGradient id="ptr-arm" x1="0" x2="1">
      <stop offset="0" stopColor="#14161a" />
      <stop offset=".4" stopColor="#3a3f48" />
      <stop offset=".62" stopColor="#2b2f36" />
      <stop offset="1" stopColor="#121418" />
    </linearGradient>
    <linearGradient id="ptr-cuff" x1="0" x2="1">
      <stop offset="0" stopColor="#d9600c" />
      <stop offset=".4" stopColor="#ffa15a" />
      <stop offset=".65" stopColor="#f47b20" />
      <stop offset="1" stopColor="#cf5a0a" />
    </linearGradient>
    <radialGradient id="ptr-skin" cx=".38" cy=".25" r=".95">
      <stop offset="0" stopColor="#ffeee3" />
      <stop offset=".5" stopColor="#ffd7bf" />
      <stop offset="1" stopColor="#f0b28f" />
    </radialGradient>
    <radialGradient id="ptr-pad" cx=".45" cy=".3" r=".8">
      <stop offset="0" stopColor="#ffe6d8" />
      <stop offset="1" stopColor="#f6c0a2" />
    </radialGradient>
    <filter id="ptr-soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#7a3a10" floodOpacity=".22" />
    </filter>
  </defs>
);

const Sleeve = () => (
  <>
    <rect x="-25" y="-700" width="50" height="696" rx="14" fill="url(#ptr-arm)" />
    <rect x="-27" y="-10" width="54" height="14" rx="7" fill="url(#ptr-cuff)" />
  </>
);

/** Chubby fingers pointing down, reaching for the page. Wrist at y=0. */
const OpenHand = () => (
  <g filter="url(#ptr-soft)">
    <ellipse cx="-27" cy="26" rx="8.5" ry="12" transform="rotate(28 -27 26)" fill="url(#ptr-skin)" />
    <ellipse cx="-16" cy="46" rx="8" ry="11" fill="url(#ptr-skin)" />
    <ellipse cx="-5" cy="50" rx="8" ry="12" fill="url(#ptr-skin)" />
    <ellipse cx="6.5" cy="50" rx="8" ry="12" fill="url(#ptr-skin)" />
    <ellipse cx="17" cy="45" rx="7.5" ry="10.5" fill="url(#ptr-skin)" />
    <path d="M-21 2 C-25 12 -26 28 -22 38 C-18 46 -8 48 1 48 C11 48 20 45 23 37 C26 27 25 12 21 2 Z" fill="url(#ptr-skin)" />
    <path d="M-10.5 40 L-10.5 50 M1 41 L1 53 M12 40 L12 50" stroke="#e8a785" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
    <ellipse cx="-7" cy="16" rx="9" ry="11" fill="#fff" opacity=".35" />
  </g>
);

/** Closed hand holding the page edge. */
const Fist = () => (
  <g filter="url(#ptr-soft)">
    <path d="M-23 2 C-27 14 -28 30 -24 40 C-20 50 -9 53 1 53 C12 53 22 50 25 40 C28 30 27 14 23 2 Z" fill="url(#ptr-skin)" />
    <ellipse cx="-15" cy="44" rx="8" ry="8.5" fill="url(#ptr-skin)" />
    <ellipse cx="-4.5" cy="47" rx="8" ry="8.5" fill="url(#ptr-skin)" />
    <ellipse cx="6.5" cy="47" rx="8" ry="8.5" fill="url(#ptr-skin)" />
    <ellipse cx="16.5" cy="43" rx="7.5" ry="8" fill="url(#ptr-skin)" />
    <path d="M-10 41 L-10 49 M1 42 L1 52 M12 41 L12 49" stroke="#e8a785" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
    <rect x="-27" y="22" width="34" height="13" rx="6.5" transform="rotate(8 -10 28)" fill="url(#ptr-pad)" stroke="#e8a785" strokeWidth=".8" />
    <ellipse cx="-8" cy="13" rx="9" ry="8" fill="#fff" opacity=".35" />
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
      <div className="absolute inset-x-0 top-0" style={{ height: pull, background: 'radial-gradient(120% 140% at 50% 0%, #f6f1ec 0%, #ebe4dc 100%)', boxShadow: 'inset 0 -10px 18px -12px rgba(28,31,36,.35)' }} />
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
        <Sleeve />
        <g style={{ transform: `scale(${ready || grabbing ? 1 : 0.92 + (pull / THRESHOLD) * 0.08})`, transformOrigin: '0 0', transition: 'transform .15s' }}>
          {grabbing ? <Fist /> : <OpenHand />}
        </g>
      </svg>
    </div>
  );
};
