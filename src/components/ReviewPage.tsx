import React, { useEffect, useState } from 'react';
import { api, thumb } from '../lib/api';
import { Star, CheckCircle2, XCircle } from 'lucide-react';

export const reviewFromPath = (): { code: string; t: string } | null => {
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9-]+)\/?$/);
  return m ? { code: m[1], t: new URLSearchParams(location.search).get('t') || '' } : null;
};

type Item = { productId: number; name: string; image: string; rated: boolean; rating: number; comment: string };

/** /r/CODE?t=TOKEN — the buyer rates the products of their delivered order. */
export const ReviewPage: React.FC<{ code: string; t: string }> = ({ code, t }) => {
  const [d, setD] = useState<{ name: string; city: string; items: Item[] } | null>(null);
  const [err, setErr] = useState('');
  const [vals, setVals] = useState<Record<number, { rating: number; comment: string }>>({});
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = 'قيّم طلبك | HOMEX';
    api.get('review-form', { code, t }).then((r) => { setD(r); setName(r.name); }).catch((e) => setErr(e.message));
  }, [code, t]);

  const send = async () => {
    const reviews = Object.entries(vals).filter(([, v]) => v.rating > 0).map(([id, v]) => ({ productId: Number(id), ...v }));
    if (!reviews.length) { setErr('اختار عدد النجوم لمنتج واحد على الأقل'); return; }
    setBusy(true); setErr('');
    try { await api.post('review', { code, t, name, reviews }); setDone(true); window.scrollTo({ top: 0 }); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  if (done) {
    return (
      <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-14 h-14 text-save mx-auto" />
        <h1 className="text-2xl font-extrabold text-ink mt-3">شكراً يا {name} 🙏</h1>
        <p className="text-steel mt-2">رأيك وصلنا، وبيساعد ناس كتير تختار صح.</p>
        <a href="/" className="btn-gold inline-flex h-12 px-8 mt-6 rounded-xl items-center font-extrabold">كمّل تسوق</a>
      </main>
    );
  }
  if (!d) {
    return err ? (
      <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center">
        <XCircle className="w-12 h-12 text-sale mx-auto" />
        <p className="text-lg font-bold text-ink mt-3">{err}</p>
        <a href="/" className="btn-gold inline-flex h-11 px-6 mt-6 rounded-xl items-center font-bold">رجوع للمتجر</a>
      </main>
    ) : <main className="flex-1 flex items-center justify-center py-24"><span className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></main>;
  }

  const open = d.items.filter((i) => !i.rated);
  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl font-extrabold text-ink">أهلاً يا {d.name}، إيه رأيك في طلبك؟</h1>
      <p className="text-steel mt-1">تقييمك بياخد دقيقة وبيظهر على صفحة المنتج بعد مراجعته.</p>

      <div className="space-y-3 mt-6">
        {d.items.map((i) => {
          const v = vals[i.productId] || { rating: 0, comment: '' };
          return (
            <section key={i.productId} className="bg-white rounded-2xl border border-line p-4">
              <div className="flex items-center gap-3">
                {i.image ? <img src={thumb(i.image)} alt="" className="w-16 h-16 rounded-xl object-cover bg-shelf shrink-0" /> : <span className="w-16 h-16 rounded-xl bg-shelf shrink-0" />}
                <p className="font-bold text-ink leading-snug">{i.name}</p>
              </div>
              {i.rated ? (
                <p className="text-sm text-save font-bold mt-3 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> قيّمته قبل كده ({i.rating}★) — شكراً</p>
              ) : (
                <>
                  <div className="flex gap-1 mt-3" dir="ltr" role="radiogroup" aria-label={`تقييم ${i.name}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={v.rating === n} aria-label={`${n} نجوم`}
                        onClick={() => setVals({ ...vals, [i.productId]: { ...v, rating: n } })} className="p-1">
                        <Star className={`w-9 h-9 ${n <= v.rating ? 'fill-gold text-gold' : 'text-line'}`} />
                      </button>
                    ))}
                  </div>
                  {v.rating > 0 && (
                    <textarea rows={3} value={v.comment} onChange={(e) => setVals({ ...vals, [i.productId]: { ...v, comment: e.target.value } })}
                      placeholder={v.rating >= 4 ? 'إيه أكتر حاجة عجبتك؟ (اختياري)' : 'إيه اللي ممكن نحسّنه؟ (اختياري)'}
                      className="w-full mt-2 rounded-xl border border-line px-3 py-2.5 focus:outline-hidden focus:border-gold text-ink" />
                  )}
                </>
              )}
            </section>
          );
        })}
      </div>

      {open.length > 0 && (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-bold text-ink">الاسم اللي يظهر مع التقييم</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 rounded-xl border border-line px-3 h-12 focus:outline-hidden focus:border-gold text-ink" />
          </label>
          {err && <p className="text-sm text-sale font-bold">{err}</p>}
          <button onClick={send} disabled={busy} className="w-full h-13 py-3.5 rounded-xl btn-gold font-extrabold text-lg disabled:opacity-60">{busy ? 'بيتبعت...' : 'ابعت تقييمي'}</button>
        </div>
      )}
    </main>
  );
};
