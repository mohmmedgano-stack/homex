import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CheckCircle2, XCircle } from 'lucide-react';
import { trackPurchase } from '../lib/track';

// Shown when the customer comes back from the card payment page (/?pay=success|failed&order=CODE)
export const PaymentReturn: React.FC = () => {
  const { clearCart, setCurrentView } = useStore();
  const [state, setState] = useState<{ ok: boolean; code: string } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const pay = q.get('pay');
    if (pay !== 'success' && pay !== 'failed') return;
    const ok = pay === 'success';
    setState({ ok, code: q.get('order') || '' });
    if (ok) {
      clearCart();
      try {
        const pending = JSON.parse(sessionStorage.getItem('homex_pending_purchase') || 'null');
        if (pending && pending.code === q.get('order')) {
          // pixels load right after settings; give them a moment
          setTimeout(() => trackPurchase(pending.code, pending.total, pending.items), 1500);
        }
        sessionStorage.removeItem('homex_pending_purchase');
      } catch {}
    }
    history.replaceState(null, '', location.pathname);
  }, []);

  if (!state) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => setState(null)} />
      <div role="dialog" aria-modal="true" className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
        {state.ok ? <CheckCircle2 className="w-14 h-14 text-save mx-auto" /> : <XCircle className="w-14 h-14 text-sale mx-auto" />}
        <h2 className="text-xl font-extrabold text-ink mt-3">{state.ok ? 'تم الدفع بنجاح' : 'الدفع ما تمّش'}</h2>
        <p className="text-sm text-steel mt-2 leading-relaxed">
          {state.ok
            ? `طلبك ${state.code} اتسجل ومدفوع. هنكلمك قريب نأكد معاك ميعاد الشحن.`
            : 'مفيش فلوس اتسحبت منك. منتجاتك لسه في السلة، تقدر تجرب تاني أو تختار طريقة دفع تانية.'}
        </p>
        <div className="mt-5 flex gap-2 justify-center">
          {!state.ok && (
            <button onClick={() => { setState(null); setCurrentView('checkout'); }} className="btn-gold h-11 px-5 rounded-xl font-extrabold">
              حاول تاني
            </button>
          )}
          <button onClick={() => setState(null)} className="h-11 px-5 rounded-xl font-bold border border-line text-ink">
            {state.ok ? 'تمام' : 'رجوع للمتجر'}
          </button>
        </div>
      </div>
    </div>
  );
};
