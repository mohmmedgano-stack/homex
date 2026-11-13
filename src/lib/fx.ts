/**
 * Storefront motion: Lenis smooth scrolling + GSAP scroll reveals and small effects.
 * Store only (the admin dashboard and the barcode station never import this file).
 * Everything is skipped when the visitor asked the OS for reduced motion.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Desktop pointer (mouse / trackpad) — hover-only effects stay off on phones */
export const finePointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

export function initStoreMotion() {
  if (typeof window === 'undefined' || reducedMotion()) return;
  if (!lenis) {
    lenis = new Lenis({
      lerp: 0.11,
      wheelMultiplier: 1,
      allowNestedScroll: true, // drawers, menus and modals keep their own scrolling
      prevent: (node) => !!node.closest?.('[data-lenis-prevent], [role="dialog"], .fixed'),
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis?.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    // Make the site's existing smooth `scrollIntoView` calls glide with Lenis too
    const native = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      const smooth = typeof arg === 'object' && arg?.behavior === 'smooth';
      const block = typeof arg === 'object' ? arg?.block : undefined;
      if (!lenis || !smooth || (block && block !== 'start')) return native.call(this, arg as any);
      lenis.scrollTo(this as HTMLElement, { duration: 1.1 }); // Lenis already honours scroll-margin-top
    };
  }

  // Images loading in change page height → keep the scroll triggers in the right place
  let t: ReturnType<typeof setTimeout> | undefined;
  const ro = new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => ScrollTrigger.refresh(), 180);
  });
  ro.observe(document.body);

  initClickSpark();
}

/**
 * Fade-up anything marked `data-reveal` inside `root` as it scrolls into view (once).
 * Safe to call again after the list changes: only new elements are picked up.
 * IntersectionObserver decides *when* (reliable after back/forward jumps and late images), GSAP does the motion.
 */
let io: IntersectionObserver | null = null;
let queue: Element[] = [];
let flushing = false;
function flush() {
  flushing = false;
  const batch = queue.filter((el) => el.isConnected);
  queue = [];
  if (batch.length) gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, overwrite: true, clearProps: 'transform' });
}
export function revealIn(root: ParentNode | null) {
  if (!root || reducedMotion() || typeof IntersectionObserver === 'undefined') return;
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-rv])'));
  if (!els.length) return;
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io!.unobserve(e.target);
        queue.push(e.target);
      }
      if (queue.length && !flushing) { flushing = true; requestAnimationFrame(flush); }
    },
    { rootMargin: '0px 0px -6% 0px' }
  );
  for (const el of els) {
    el.setAttribute('data-rv', '');
    // already above the screen (e.g. coming back to a scrolled page): just show it
    if (el.getBoundingClientRect().bottom < 0) continue;
    gsap.set(el, { autoAlpha: 0, y: 28 });
    io.observe(el);
  }
}

/** Little burst of orange sparks where a main (gold) button is clicked */
function initClickSpark() {
  if ((window as any).__homexSpark) return;
  (window as any).__homexSpark = true;
  const colors = ['#f47a20', '#ff9142', '#ffc89f', '#ffffff'];
  document.addEventListener(
    'click',
    (e) => {
      const target = (e.target as HTMLElement)?.closest?.('.btn-gold, [data-spark]');
      if (!target || (target as HTMLButtonElement).disabled) return;
      const x = e.clientX, y = e.clientY;
      if (!x && !y) return; // keyboard click
      const n = 9;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        s.setAttribute('aria-hidden', 'true');
        const size = 4 + Math.random() * 4;
        s.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:9999px;pointer-events:none;z-index:9999;background:${colors[i % colors.length]};box-shadow:0 0 6px rgba(244,122,32,.6)`;
        document.body.appendChild(s);
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
        const d = 26 + Math.random() * 26;
        gsap.fromTo(
          s,
          { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1, opacity: 1 },
          { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0.2, opacity: 0, duration: 0.55 + Math.random() * 0.2, ease: 'power2.out', onComplete: () => s.remove() }
        );
      }
    },
    { passive: true }
  );
}
