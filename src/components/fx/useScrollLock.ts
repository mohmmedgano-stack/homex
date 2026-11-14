import { useEffect } from 'react';
import { lockScroll, unlockScroll } from '../../lib/fx';

/** While `active`, the page behind can't scroll; Escape calls onEscape. */
export function useScrollLock(active: boolean, onEscape?: () => void) {
  useEffect(() => {
    if (!active) return;
    lockScroll();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape?.(); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); unlockScroll(); };
  }, [active]);
}
