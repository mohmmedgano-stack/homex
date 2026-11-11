import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { IosBanner, BannerStack } from '../components/IosBanner';
import { playChime } from '../lib/chime';

/* ---------- toasts (phone-style banners + chime) ---------- */
type Toast = { id: number; msg: string; kind: 'ok' | 'err' };
type Push = (msg: string, kind?: 'ok' | 'err', opts?: { silent?: boolean }) => void;
const ToastCtx = createContext<Push>(() => {});
export const useToast = () => useContext(ToastCtx);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [list, setList] = useState<Toast[]>([]);
  const close = useCallback((id: number) => setList((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback<Push>((msg, kind = 'ok', opts) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, msg, kind }]);
    if (!opts?.silent) playChime(0.45);
    setTimeout(() => close(id), kind === 'err' ? 5000 : 4000);
  }, [close]);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {list.length > 0 && (
        <BannerStack>
          {list.map((t) => <IosBanner key={t.id} message={t.msg} kind={t.kind === 'err' ? 'error' : 'success'} onClose={() => close(t.id)} />)}
        </BannerStack>
      )}
    </ToastCtx.Provider>
  );
};

/* ---------- primitives ---------- */
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'dark' | 'ghost' | 'danger'; loading?: boolean }
> = ({ variant = 'primary', loading, className = '', children, disabled, ...rest }) => {
  const v = {
    primary: 'btn-gold',
    dark: 'bg-ink text-white hover:bg-ink-soft',
    ghost: 'bg-white text-ink border border-line hover:border-ink',
    danger: 'bg-white text-sale border border-sale/30 hover:bg-sale hover:text-white',
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`h-10 px-4 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${v} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-sm font-bold text-ink mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-xs text-steel mt-1">{hint}</span>}
  </label>
);

export const inputCls =
  'w-full h-11 px-3 rounded-lg border border-line bg-white text-ink text-[15px] focus:outline-hidden focus:border-gold focus:ring-2 focus:ring-gold/20';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...p }, ref) => <input ref={ref} {...p} className={`${inputCls} ${className}`} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...p }) => (
  <textarea {...p} className={`${inputCls} h-auto py-2.5 leading-relaxed ${className}`} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...p }) => (
  <select {...p} className={`${inputCls} ${className}`}>
    {children}
  </select>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center gap-3 text-sm font-bold text-ink"
    role="switch"
    aria-checked={checked}
  >
    <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-gold' : 'bg-line'}`}>
      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? '-translate-x-5' : ''}`} />
    </span>
    {label}
  </button>
);

export const Card: React.FC<{ title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  action,
  children,
  className = '',
}) => (
  <section className={`bg-white rounded-2xl border border-line ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5">
        {title && <h2 className="text-base sm:text-lg font-extrabold text-ink">{title}</h2>}
        {action}
      </div>
    )}
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

export const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}) => {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-white w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[94vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl`}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-line shrink-0">
          <h3 className="font-extrabold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-steel hover:text-ink" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex gap-2 justify-end shrink-0 bg-shelf rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
};

export const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'default' | 'good' | 'bad' | 'brand' }> = ({
  label,
  value,
  sub,
  tone = 'default',
}) => {
  const c = { default: 'text-ink', good: 'text-save', bad: 'text-sale', brand: 'text-gold-deep' }[tone];
  return (
    <div className="bg-white rounded-2xl border border-line p-4">
      <p className="text-xs sm:text-sm text-steel font-bold">{label}</p>
      <p className={`price text-xl sm:text-2xl font-black mt-1.5 ${c}`}>{value}</p>
      {sub && <p className="text-xs text-steel mt-1">{sub}</p>}
    </div>
  );
};

export const Empty: React.FC<{ title: string; text?: string; action?: React.ReactNode }> = ({ title, text, action }) => (
  <div className="text-center py-12 px-4">
    <p className="font-extrabold text-ink">{title}</p>
    {text && <p className="text-sm text-steel mt-1.5">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Spinner = () => (
  <div className="py-16 flex justify-center">
    <Loader2 className="w-7 h-7 animate-spin text-gold" />
  </div>
);

export const STATUS: Record<string, { label: string; cls: string }> = {
  awaiting_payment: { label: 'مستني الدفع', cls: 'bg-purple-100 text-purple-800' },
  pending: { label: 'جديد', cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'متأكد', cls: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'مع الشحن', cls: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'اتسلّم', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ملغي', cls: 'bg-slate-200 text-slate-700' },
  returned: { label: 'مرتجع', cls: 'bg-red-100 text-red-800' },
};

export const StatusBadge: React.FC<{ s: string }> = ({ s }) => (
  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md ${STATUS[s]?.cls || 'bg-shelf'}`}>{STATUS[s]?.label || s}</span>
);
