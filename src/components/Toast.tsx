import React, { useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { IosBanner, BannerStack } from './IosBanner';
import { playChime } from '../lib/chime';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStore();
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = toasts.filter((t) => !seen.current.has(t.id));
    fresh.forEach((t) => seen.current.add(t.id));
    if (fresh.length) playChime(0.35);
  }, [toasts]);
  if (toasts.length === 0) return null;
  return (
    <BannerStack>
      {toasts.slice(-3).map((t) => <IosBanner key={t.id} message={t.message} kind={t.type} onClose={() => dismissToast(t.id)} />)}
    </BannerStack>
  );
};
