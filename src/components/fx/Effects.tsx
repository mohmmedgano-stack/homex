/**
 * Animated building blocks for the storefront (in the spirit of React Bits):
 * SplitWords (word-by-word text reveal — words, not letters, so Arabic stays joined),
 * ShinyText, Magnet, PageIn and a spotlight hook for cards.
 */
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap, reducedMotion, finePointer } from '../../lib/fx';

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Text that rises in word by word — on mount, or when scrolled into view with `onScroll` */
export const SplitWords: React.FC<{
  text: string;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  delay?: number;
  onScroll?: boolean;
  stagger?: number;
}> = ({ text, className = '', as = 'span', delay = 0, onScroll = false, stagger = 0.07 }) => {
  const ref = useRef<HTMLElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const words = el.querySelectorAll<HTMLElement>('[data-w]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power4.out',
          stagger,
          delay,
          scrollTrigger: onScroll ? { trigger: el, start: 'top 92%', once: true } : undefined,
        }
      );
    }, el);
    return () => ctx.revert();
  }, [text]);

  const Tag = as as any;
  const parts = text.split(/(\s+)/);
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {parts.map((w, i) =>
        /^\s+$/.test(w) ? (
          ' '
        ) : w ? (
          <span key={i} aria-hidden="true" className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
            <span data-w className="inline-block will-change-transform">{w}</span>
          </span>
        ) : null
      )}
    </Tag>
  );
};

/** Light sweep across text or a button (CSS only) */
export const ShinyText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`shiny-text ${className}`}>{children}</span>
);

/** Element drifts toward the cursor while it hovers nearby (desktop only) */
export const Magnet: React.FC<{ children: React.ReactNode; strength?: number; className?: string }> = ({ children, strength = 0.3, className = '' }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !finePointer()) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [strength]);
  return <span ref={ref} className={`inline-block ${className}`}>{children}</span>;
};

/** Fades a whole page in when it opens (product page, checkout, order tracking…) */
export const PageIn: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  useIso(() => {
    if (!ref.current || reducedMotion()) return;
    const tw = gsap.fromTo(ref.current, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    return () => { tw.kill(); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
};

/** Soft orange spotlight that follows the cursor over a card (pair with the `spotlight` class) */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer()) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, []);
  return ref;
}

/** Slowly drifting glow blobs for dark banners (animated background) */
export const GlowBlobs: React.FC<{ className?: string }> = ({ className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>('[data-blob]').forEach((b, i) => {
        gsap.to(b, {
          x: () => gsap.utils.random(-60, 60),
          y: () => gsap.utils.random(-40, 40),
          scale: () => gsap.utils.random(0.85, 1.25),
          duration: gsap.utils.random(6, 9),
          ease: 'sine.inOut',
          repeat: -1,
          repeatRefresh: true,
          yoyo: true,
          delay: i * 0.6,
        });
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <div data-blob className="absolute -left-24 -bottom-24 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-gold/25 blur-3xl" />
      <div data-blob className="absolute left-1/3 -top-20 w-40 h-40 sm:w-64 sm:h-64 rounded-full bg-gold-hi/15 blur-3xl" />
      <div data-blob className="absolute right-[10%] bottom-[-30%] w-52 h-52 sm:w-80 sm:h-80 rounded-full bg-white/5 blur-3xl" />
    </div>
  );
};
