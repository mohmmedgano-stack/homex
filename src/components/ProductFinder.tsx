/**
 * «اختار جهازك المناسب» — 2–3 quick questions, then the best matching product from the live catalog.
 * Answers map to search words (see lib/search), so new products in the dashboard show up here on their own.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { X, ChefHat, Coffee, Shirt, Tv, ArrowRight, RotateCcw, Sparkles, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { searchProducts } from '../lib/search';
import { thumb } from '../lib/api';
import { useScrollLock } from './fx/useScrollLock';

type Opt = { id: string; label: string; hint?: string; Icon?: React.FC<any>; next?: string; find?: string; why?: string };
type Step = { id: string; q: string; opts: Opt[] };

const STEPS: Record<string, Step> = {
  start: { id: 'start', q: 'بتدور على جهاز لإيه؟', opts: [
    { id: 'kitchen', label: 'المطبخ وتحضير الأكل', Icon: ChefHat, next: 'kitchen' },
    { id: 'drinks', label: 'الشاي والقهوة', Icon: Coffee, next: 'drinks' },
    { id: 'iron', label: 'كوي الهدوم', Icon: Shirt, find: 'مكواه', why: 'لكوي الهدوم بالبخار', next: 'budget' },
    { id: 'tv', label: 'الفرجة والتلفزيون', Icon: Tv, next: 'tv' },
  ] },
  kitchen: { id: 'kitchen', q: 'هتستخدمه في إيه أكتر؟', opts: [
    { id: 'juice', label: 'عصاير وشوربة وميلك شيك', find: 'خلاط', why: 'للعصاير والشوربة', next: 'budget' },
    { id: 'mince', label: 'فرم لحمة وبصل وتوم', find: 'كبه', why: 'لفرم اللحمة والبصل والتوم', next: 'budget' },
    { id: 'salad', label: 'تقطيع خضار وسلطات بسرعة', find: 'قطاعه', why: 'لتقطيع الخضار والسلطات', next: 'budget' },
    { id: 'all', label: 'كذا حاجة في جهاز واحد', hint: 'فرم وتقطيع وعجين', find: 'محضر', why: 'لكذا شغلانة في جهاز واحد', next: 'budget' },
    { id: 'hand', label: 'هرس الشوربة وأكل الأطفال في الحلة', find: 'هاند', why: 'للهرس السريع في الحلة نفسها', next: 'budget' },
  ] },
  drinks: { id: 'drinks', q: 'بتشرب إيه أكتر؟', opts: [
    { id: 'tea', label: 'شاي ومية سخنة', find: 'كاتيل', why: 'لغلي المية والشاي بسرعة' },
    { id: 'coffee', label: 'قهوة تركي', find: 'كنكه', why: 'لعمل القهوة التركي' },
  ] },
  tv: { id: 'tv', q: 'الشاشة هتبقى فين؟', opts: [
    { id: 'small', label: 'أوضة نوم أو مطبخ', hint: 'فرجة عادية', find: 'شاشه 32', why: 'لأوضة صغيرة وفرجة عادية' },
    { id: 'smart', label: 'الريسبشن', hint: 'وعايز يوتيوب وتطبيقات', find: 'شاشه سمارت', why: 'للريسبشن ومعاها تطبيقات' },
  ] },
  budget: { id: 'budget', q: 'ميزانيتك قد إيه تقريباً؟', opts: [
    { id: 'b1', label: 'أقل من 1,500 ج.م' },
    { id: 'b2', label: 'من 1,500 لـ 3,000 ج.م' },
    { id: 'b3', label: 'أكتر من 3,000 ج.م' },
    { id: 'any', label: 'مش فارقة معايا' },
  ] },
};
const RANGE: Record<string, [number, number]> = { b1: [0, 1500], b2: [1500, 3000], b3: [3000, Infinity], any: [0, Infinity] };

export const ProductFinder: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { products, categories, setSelectedProduct, addToCart } = useStore() as any;
  const [path, setPath] = useState<string[]>(['start']);
  const [picked, setPicked] = useState<Opt | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useScrollLock(true, onClose);

  const step = STEPS[path[path.length - 1]];
  const choose = (o: Opt) => {
    if (step.id === 'budget') { setBudget(o.id); setDone(true); return; }
    if (o.find) setPicked(o);
    if (o.next) setPath((p) => [...p, o.next!]); else setDone(true);
  };
  const back = () => { if (done) { setDone(false); return; } setPath((p) => (p.length > 1 ? p.slice(0, -1) : p)); };
  const restart = () => { setPath(['start']); setPicked(null); setBudget(null); setDone(false); };

  const result = useMemo(() => {
    if (!done || !picked?.find) return null;
    const all = searchProducts(products, categories, picked.find).filter((p: any) => p.stock > 0 || true);
    const [lo, hi] = RANGE[budget || 'any'];
    const inBudget = all.filter((p: any) => p.price >= lo && p.price < hi);
    const list = inBudget.length ? inBudget : [...all].sort((a: any, b: any) => Math.abs(a.price - lo) - Math.abs(b.price - lo));
    return { best: list[0], more: list.slice(1, 4), fits: inBudget.length > 0 || !budget || budget === 'any' };
  }, [done, picked, budget, products, categories]);

  useEffect(() => {
    if (done) try { (window as any).gtag?.('event', 'finder_result', { answer: picked?.id, budget }); } catch { /* optional */ }
  }, [done]);

  const total = picked?.next === 'budget' || path.includes('budget') ? 3 : 2;
  const stepNo = done ? total : path.length;
  const open = (p: any) => { onClose(); setSelectedProduct(p); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="pf-title" data-lenis-prevent>
      <button type="button" tabIndex={-1} aria-label="إغلاق" className="absolute inset-0 w-full h-full bg-black/50 cursor-pointer" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-4 pb-3 border-b border-line z-10">
          <div className="flex items-center justify-between">
            <h2 id="pf-title" className="font-extrabold text-ink flex items-center gap-2"><Sparkles className="w-5 h-5 text-gold" /> اختار جهازك المناسب</h2>
            <button onClick={onClose} className="w-10 h-10 -ml-2 flex items-center justify-center text-steel hover:text-ink" aria-label="إغلاق"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-1.5 mt-2" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < stepNo ? 'bg-gold' : 'bg-line'}`} />)}
          </div>
        </div>

        <div className="p-5">
          {!done ? (
            <div key={step.id} className="animate-[ag-rise_.4s_ease-out]">
              <p className="text-xl font-extrabold text-ink mb-4">{step.q}</p>
              <div className={`grid gap-2 ${step.id === 'start' ? 'grid-cols-2' : ''}`}>
                {step.opts.map((o) => (
                  <button key={o.id} onClick={() => choose(o)}
                    className={`rounded-2xl border-2 border-line hover:border-gold hover:bg-gold/5 transition text-right p-4 ${step.id === 'start' ? 'flex flex-col items-start gap-3 min-h-28' : 'flex items-center justify-between gap-3'}`}>
                    {o.Icon && <span className="w-11 h-11 rounded-xl bg-gold/10 text-gold-deep flex items-center justify-center"><o.Icon className="w-6 h-6" /></span>}
                    <span>
                      <span className="block font-extrabold text-ink">{o.label}</span>
                      {o.hint && <span className="block text-xs text-steel mt-0.5">{o.hint}</span>}
                    </span>
                  </button>
                ))}
              </div>
              {path.length > 1 && (
                <button onClick={back} className="mt-4 text-sm font-bold text-steel hover:text-ink inline-flex items-center gap-1"><ArrowRight className="w-4 h-4" /> رجوع</button>
              )}
            </div>
          ) : result?.best ? (
            <div className="animate-[ag-rise_.4s_ease-out]">
              <p className="text-sm font-bold text-gold-deep">{result.fits ? 'ترشيحنا ليك' : 'مفيش في الميزانية دي، ودي أقرب حاجة ليها'}</p>
              <div className="mt-3 rounded-2xl border-2 border-gold bg-gold/5 p-3 flex gap-3 items-center">
                <img src={thumb(result.best.image)} alt="" className="w-24 h-24 rounded-xl object-cover bg-white shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink leading-snug">{result.best.name}</p>
                  <p className="text-xs text-steel mt-1">مناسب {picked?.why}</p>
                  <p className="price text-lg font-black text-ink mt-1">{result.best.price.toLocaleString('en-US')} ج.م</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => open(result.best)} className="h-12 rounded-xl border-2 border-ink text-ink font-extrabold">شوف تفاصيله</button>
                <button disabled={result.best.stock < 1} onClick={() => { addToCart(result.best, 1); onClose(); }} className="h-12 rounded-xl btn-gold font-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <ShoppingBag className="w-4 h-4" /> {result.best.stock < 1 ? 'خلص حالياً' : 'أضف للسلة'}
                </button>
              </div>
              {result.more.length > 0 && (
                <>
                  <p className="text-sm font-bold text-ink mt-5 mb-2">ممكن كمان يعجبك</p>
                  <div className="space-y-2">
                    {result.more.map((p: any) => (
                      <button key={p.id} onClick={() => open(p)} className="w-full text-right rounded-xl border border-line hover:border-gold p-2 flex items-center gap-3">
                        <img src={thumb(p.image)} alt="" className="w-12 h-12 rounded-lg object-cover bg-shelf" />
                        <span className="flex-1 min-w-0 text-sm font-bold text-ink truncate">{p.name}</span>
                        <span className="price text-sm font-extrabold text-gold-deep">{p.price.toLocaleString('en-US')} ج.م</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button onClick={restart} className="mt-5 text-sm font-bold text-steel hover:text-ink inline-flex items-center gap-1"><RotateCcw className="w-4 h-4" /> جرّب تاني</button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="font-extrabold text-ink">لسه مفيش جهاز من النوع ده عندنا</p>
              <p className="text-sm text-steel mt-1">ابعتلنا على الواتساب ونقولك إمتى ينزل.</p>
              <button onClick={restart} className="mt-4 h-11 px-5 rounded-xl border-2 border-ink font-bold">جرّب تاني</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

