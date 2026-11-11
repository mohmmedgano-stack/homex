import React, { useEffect, useRef, useState } from 'react';

export type BannerKind = 'success' | 'error' | 'info';

/**
 * Phone-style notification banner: drops from the top, frosted glass, app icon,
 * «HOMEX · الآن», the message. Tap ✕ or swipe up to dismiss.
 */
export const IosBanner: React.FC<{ message: string; kind?: BannerKind; title?: string; onClose: () => void }> = ({ message, kind = 'info', title, onClose }) => {
  const [shown, setShown] = useState(false);
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => { const r = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(r); }, []);
  const head = title ?? (kind === 'error' ? 'تنبيه' : '');
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      onPointerDown={(e) => { start.current = e.clientY; }}
      onPointerMove={(e) => { if (start.current !== null) setDy(Math.min(0, e.clientY - start.current)); }}
      onPointerUp={() => { if (dy < -30) onClose(); setDy(0); start.current = null; }}
      onPointerCancel={() => { setDy(0); start.current = null; }}
      style={{ transform: `translateY(${shown ? dy : -120}%)`, opacity: shown ? 1 + dy / 120 : 0 }}
      className="pointer-events-auto w-full select-none touch-none rounded-[22px] bg-white/[0.88] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_10px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/5 px-3.5 py-3 flex items-start gap-3 transition-[transform,opacity] duration-500 ease-[cubic-bezier(.2,1.1,.3,1)]"
    >
      <img src="/favicon.png" alt="" className="w-[38px] h-[38px] rounded-[9px] shrink-0 bg-ink object-cover" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span dir="ltr" className="text-[13px] font-semibold text-black/45 tracking-wide">HOMEX</span>
          <span className="text-[12px] text-black/40">الآن</span>
        </div>
        {head && <p className={`text-[14.5px] font-bold leading-snug ${kind === 'error' ? 'text-[#d70015]' : 'text-black'}`}>{head}</p>}
        <p className="text-[14.5px] text-black/85 leading-snug break-words">{message}</p>
      </div>
      <button onClick={onClose} className="-m-1 p-1 text-black/30 hover:text-black/60 shrink-0" aria-label="إغلاق التنبيه">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
};

/** Top-centre stack, below the phone's notch. */
export const BannerStack: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed top-0 inset-x-0 z-[100] flex flex-col items-center gap-2 px-2 pt-[max(8px,env(safe-area-inset-top))] pointer-events-none" aria-live="polite">
    <div className="w-full max-w-[420px] flex flex-col gap-2">{children}</div>
  </div>
);
