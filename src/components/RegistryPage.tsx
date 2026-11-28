/**
 * «قايمة جهاز العروسة»
 *   /w              how it works + start a list + the lists made on this phone
 *   /w/CODE         the list (what family & friends see) — buy a gift, delivered to the bride if they want
 *   /w/CODE?k=…     the same list for the bride, with editing
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Gift, Heart, Share2, Copy, Check, Pencil, Lock, Plus, Minus, Search, CalendarHeart, ArrowRight, Loader2, ListChecks, Truck } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useStore } from '../context/StoreContext';
import { api, thumb } from '../lib/api';
import { searchProducts } from '../lib/search';
import { setGift, myLists, rememberMyList } from '../lib/gift';
import { EGYPT_GOVERNORATES, isEgyptMobile, normalizePhone } from '../data/governorates';

type Item = { product: any; wanted: number; bought: number };
type List = { code: string; title: string; brideName: string; weddingDate: string; message: string; items: Item[]; token?: string; fullName?: string; phone?: string; city?: string; address?: string };

const field = 'w-full h-12 rounded-xl border border-line bg-white px-4 text-base text-ink focus:outline-hidden focus:border-gold';
const go = (path: string) => { history.pushState(null, '', path); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({ top: 0 }); };
const daysTo = (d: string) => { if (!d) return null; const n = Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 864e5); return n; };

export const RegistryPage: React.FC<{ code: string | null; k: string }> = ({ code, k }) => {
  if (!code) return <Landing />;
  if (code === 'new') return <Editor />;
  return <ListView code={code} k={k} />;
};

/* ---------- /w ---------- */
const Landing: React.FC = () => {
  const [code, setCode] = useState('');
  const mine = myLists();
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#2a1d1a] via-ink to-[#3a2a22] text-white p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full bg-gold/30 blur-3xl" aria-hidden="true" />
        <span className="relative inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 rounded-full px-3 h-7"><Heart className="w-3.5 h-3.5 text-gold-hi fill-current" /> جديد من HOMEX</span>
        <h1 className="relative text-3xl sm:text-4xl font-extrabold mt-3 leading-tight">قايمة جهاز العروسة</h1>
        <p className="relative text-white/80 mt-3 leading-relaxed">اختاري الأجهزة اللي محتاجاها، وابعتي اللينك لأهلك وصحابك. كل واحد يختار هدية منها، وتوصلك على بيتك من غير ما تتكرر.</p>
        <button onClick={() => go('/w/new')} className="relative btn-gold shiny-text justify-center mt-6 h-12 px-6 rounded-xl font-extrabold inline-flex items-center gap-2"><Gift className="w-5 h-5" /> اعملي قايمتك دلوقتي</button>
      </section>

      <section className="grid sm:grid-cols-3 gap-3">
        {[[ListChecks, 'اختاري الأجهزة', 'من منتجات المتجر، وحددي محتاجة كام من كل حاجة'], [Share2, 'ابعتي اللينك', 'على الواتساب لأهلك وصحابك'], [Truck, 'الهدايا توصلك', 'على عنوانك، والعنوان مش بيظهر لحد']].map(([Icon, t, d]: any) => (
          <div key={t} className="bg-white rounded-2xl border border-line p-4 flex sm:block items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-gold/10 text-gold-deep flex items-center justify-center shrink-0"><Icon className="w-6 h-6" /></span>
            <span><b className="block text-ink sm:mt-3">{t}</b><span className="text-sm text-steel">{d}</span></span>
          </div>
        ))}
      </section>

      {mine.length > 0 && (
        <section className="bg-white rounded-2xl border border-line p-4">
          <p className="font-extrabold text-ink mb-2">قوايمك</p>
          {mine.map((l) => (
            <button key={l.code} onClick={() => go(`/w/${l.code}?k=${l.k}`)} className="w-full text-right flex items-center justify-between h-12 border-t border-line first:border-0">
              <span className="font-bold text-ink">{l.title}</span><span className="text-sm text-gold-deep font-bold">افتحي وعدّلي</span>
            </button>
          ))}
        </section>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) go(`/w/${code.trim().toUpperCase()}`); }} className="bg-white rounded-2xl border border-line p-4">
        <label className="block font-extrabold text-ink mb-2" htmlFor="rcode">معاك كود قايمة عروسة؟</label>
        <div className="flex gap-2">
          <input id="rcode" className={field} dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AB12CD" autoComplete="off" />
          <button className="h-12 px-5 rounded-xl bg-ink text-white font-bold shrink-0">افتح</button>
        </div>
      </form>
    </main>
  );
};

/* ---------- create / edit ---------- */
const Editor: React.FC<{ initial?: List; k?: string; onSaved?: (l: List) => void }> = ({ initial, k, onSaved }) => {
  const { products, categories } = useStore() as any;
  const [f, setF] = useState({
    brideName: initial?.fullName || '', title: initial?.title || '', weddingDate: initial?.weddingDate || '', message: initial?.message || '',
    phone: initial?.phone || '', city: initial?.city || '', address: initial?.address || '',
  });
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries((initial?.items || []).map((i) => [i.product.id, i.wanted])));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState<List | null>(null);
  const shown = useMemo(() => (q.trim() ? searchProducts(products, categories, q) : products), [q, products, categories]);
  const count = Object.values(qty).filter((n) => n > 0).length;
  const total = products.reduce((a: number, p: any) => a + (qty[p.id] || 0) * p.price, 0);
  const bump = (id: string, d: number) => setQty((x) => ({ ...x, [id]: Math.max(0, Math.min(20, (x[id] || 0) + d)) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.brideName.trim().length < 2) return setErr('اكتبي اسم العروسة');
    if (!count) return setErr('اختاري جهاز واحد على الأقل');
    if (!isEgyptMobile(f.phone)) return setErr('رقم الموبايل لازم يكون مصري من 11 رقم');
    if (!f.city) return setErr('اختاري المحافظة');
    if (f.address.trim().length < 10) return setErr('اكتبي العنوان بالتفصيل');
    setBusy(true); setErr('');
    const body = { ...f, phone: normalizePhone(f.phone), items: Object.entries(qty).filter(([, n]) => n > 0).map(([productId, n]) => ({ productId: Number(productId), qty: n })),
      website: (document.getElementById('hp-reg') as HTMLInputElement | null)?.value || '' };
    try {
      const l: List = initial ? await api.post('registry/update', { ...body, code: initial.code, k }) : await api.post('registry', body);
      rememberMyList({ code: l.code, k: l.token!, title: l.title });
      if (onSaved) onSaved(l); else { setSaved(l); window.scrollTo({ top: 0 }); }
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  if (saved) return <ShareStep list={saved} />;

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 sm:py-8">
      {!initial && <button onClick={() => go('/w')} className="text-sm font-bold text-steel inline-flex items-center gap-1 mb-3"><ArrowRight className="w-4 h-4" /> قايمة جهاز العروسة</button>}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">{initial ? 'عدّلي قايمتك' : 'اعملي قايمتك'}</h1>
      <form onSubmit={save} className="space-y-6 mt-5 pb-28">
        <input id="hp-reg" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute w-px h-px opacity-0 pointer-events-none" defaultValue="" />
        <section className="bg-white rounded-2xl border border-line p-4 space-y-4">
          <p className="font-extrabold text-ink">1. بيانات القايمة</p>
          <label className="block"><span className="block text-sm font-bold text-ink mb-1.5">اسم العروسة</span>
            <input className={field} value={f.brideName} onChange={(e) => setF({ ...f, brideName: e.target.value })} autoComplete="name" required /></label>
          <label className="block"><span className="block text-sm font-bold text-ink mb-1.5">اسم القايمة <span className="font-normal text-steel">(اختياري)</span></span>
            <input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثلاً: جهاز مريم وأحمد" maxLength={80} /></label>
          <label className="block"><span className="block text-sm font-bold text-ink mb-1.5">ميعاد الفرح <span className="font-normal text-steel">(اختياري)</span></span>
            <input type="date" className={field} value={f.weddingDate} onChange={(e) => setF({ ...f, weddingDate: e.target.value })} /></label>
          <label className="block"><span className="block text-sm font-bold text-ink mb-1.5">كلمة لأهلك وصحابك <span className="font-normal text-steel">(اختياري)</span></span>
            <textarea className={`${field} h-20 py-3 resize-none`} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} maxLength={300} placeholder="شكراً إنكم معايا في الفرحة دي" /></label>
        </section>

        <section className="bg-white rounded-2xl border border-line p-4">
          <p className="font-extrabold text-ink">2. الأجهزة اللي محتاجاها</p>
          <div className="relative mt-3">
            <Search className="w-5 h-5 text-steel absolute right-3 top-1/2 -translate-y-1/2" />
            <input className={`${field} pr-10`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّري على جهاز…" type="search" />
          </div>
          <ul className="mt-3 divide-y divide-line">
            {shown.map((p: any) => {
              const n = qty[p.id] || 0;
              return (
                <li key={p.id} className="py-2.5 flex items-center gap-3">
                  <img src={thumb(p.image)} alt="" className="w-14 h-14 rounded-xl object-cover bg-shelf shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-ink leading-snug line-clamp-2">{p.name}</span>
                    <span className="price text-sm font-extrabold text-gold-deep">{p.price.toLocaleString('en-US')} ج.م</span>
                  </span>
                  {n === 0 ? (
                    <button type="button" onClick={() => bump(p.id, 1)} className="h-10 px-3 rounded-xl border-2 border-gold text-gold-deep text-sm font-extrabold inline-flex items-center gap-1 shrink-0"><Plus className="w-4 h-4" /> ضيفي</button>
                  ) : (
                    <span className="flex items-center rounded-xl border-2 border-gold shrink-0">
                      <button type="button" onClick={() => bump(p.id, 1)} className="w-10 h-10 flex items-center justify-center" aria-label="زوّدي"><Plus className="w-4 h-4" /></button>
                      <span className="price w-6 text-center font-extrabold">{n}</span>
                      <button type="button" onClick={() => bump(p.id, -1)} className="w-10 h-10 flex items-center justify-center" aria-label="قلّلي"><Minus className="w-4 h-4" /></button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-line p-4 space-y-4">
          <div>
            <p className="font-extrabold text-ink">3. عنوان التوصيل</p>
            <p className="text-sm text-steel mt-1 flex items-start gap-1.5"><Lock className="w-4 h-4 shrink-0 mt-0.5" /> العنوان والرقم مش بيظهروا لحد. الهدايا بس بتتبعت عليهم.</p>
          </div>
          <label className="block"><span className="block text-sm font-bold text-ink mb-1.5">رقم الموبايل</span>
            <input className={field} dir="ltr" type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="01xxxxxxxxx" autoComplete="tel" required /></label>
          <label className="block"><span className="block text-sm font-bold text-ink mb-1.5">المحافظة</span>
            <select className={field} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} required>
              <option value="">اختاري المحافظة</option>{EGYPT_GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
            </select></label>
          <label className="block"><span className="block text-sm font-bold text-ink mb-1.5">العنوان بالتفصيل</span>
            <textarea className={`${field} h-20 py-3 resize-none`} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="الشارع، رقم العمارة، الدور، الشقة، علامة مميزة" required /></label>
        </section>

        {/* sticky save bar (phones first) */}
        <div className="fixed bottom-[88px] md:bottom-0 inset-x-3 md:inset-x-0 rounded-2xl md:rounded-none z-30 bg-white/95 backdrop-blur border border-line md:border-x-0 md:border-b-0 px-4 py-3 shadow-lg md:shadow-none">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <span className="flex-1 min-w-0 text-sm">
              <b className="text-ink">{count} جهاز</b>
              {total > 0 && <span className="price text-steel"> · {total.toLocaleString('en-US')} ج.م</span>}
              {err && <span className="block text-sale font-bold truncate" role="alert">{err}</span>}
            </span>
            <button disabled={busy} className="btn-gold h-12 px-6 rounded-xl font-extrabold inline-flex items-center gap-2 disabled:opacity-60 shrink-0">
              {busy && <Loader2 className="w-5 h-5 animate-spin" />} {initial ? 'احفظي التعديل' : 'اعملي القايمة'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
};

/* ---------- share links ---------- */
const ShareStep: React.FC<{ list: List }> = ({ list }) => {
  const pub = `${location.origin}/w/${list.code}`;
  const own = `${pub}?k=${list.token}`;
  const [copied, setCopied] = useState('');
  const copy = async (t: string, which: string) => { try { await navigator.clipboard.writeText(t); setCopied(which); setTimeout(() => setCopied(''), 2000); } catch { /* the link is shown anyway */ } };
  const msg = `${list.message ? list.message + '\n\n' : ''}دي قايمة «${list.title}» على HOMEX. لو حابب تجيب هدية اختار منها، وهتوصل على البيت على طول:\n${pub}`;
  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8 space-y-5">
      <div className="text-center">
        <span className="mx-auto w-16 h-16 rounded-full bg-save/10 text-save flex items-center justify-center"><Check className="w-8 h-8" /></span>
        <h1 className="text-2xl font-extrabold text-ink mt-4">قايمتك جاهزة</h1>
        <p className="text-steel mt-1">ابعتي اللينك ده لأهلك وصحابك</p>
      </div>
      <div className="bg-white rounded-2xl border border-line p-4">
        <p dir="ltr" className="text-sm font-bold text-ink break-all bg-shelf rounded-xl p-3">{pub}</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="h-12 rounded-xl bg-[#25D366] text-white font-extrabold inline-flex items-center justify-center gap-2"><FaWhatsapp className="w-5 h-5" /> ابعتيها واتساب</a>
          <button onClick={() => copy(pub, 'pub')} className="h-12 rounded-xl border-2 border-ink font-extrabold inline-flex items-center justify-center gap-2">{copied === 'pub' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />} {copied === 'pub' ? 'اتنسخ' : 'انسخي اللينك'}</button>
        </div>
      </div>
      <div className="rounded-2xl bg-gold/10 border border-gold/30 p-4">
        <p className="font-extrabold text-ink flex items-center gap-2"><Lock className="w-4 h-4" /> لينك التعديل (ليكي إنتي بس)</p>
        <p className="text-sm text-steel mt-1">احفظيه عشان تضيفي أو تشيلي أجهزة بعدين. متبعتيهوش لحد.</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={() => copy(own, 'own')} className="h-11 rounded-xl bg-white border border-line font-bold inline-flex items-center justify-center gap-2 text-sm">{copied === 'own' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied === 'own' ? 'اتنسخ' : 'انسخي لينك التعديل'}</button>
          <button onClick={() => go(`/w/${list.code}?k=${list.token}`)} className="h-11 rounded-xl bg-ink text-white font-bold text-sm">افتحي القايمة</button>
        </div>
      </div>
    </main>
  );
};

/* ---------- the list ---------- */
const ListView: React.FC<{ code: string; k: string }> = ({ code, k }) => {
  const { addToCart, setCartOpen } = useStore() as any;
  const [l, setL] = useState<List | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(false);
  const [share, setShare] = useState(false);
  useEffect(() => { setL(null); api.get('registry', k ? { code, k } : { code }).then(setL).catch((e) => setErr(e.message)); }, [code, k]);
  useEffect(() => { if (l) document.title = `${l.title} | قايمة هدايا على HOMEX`; }, [l]);

  if (err) return <main className="flex-1 p-10 text-center"><p className="font-extrabold text-ink">{err}</p><button onClick={() => go('/w')} className="mt-4 h-11 px-5 rounded-xl border-2 border-ink font-bold">قايمة جهاز العروسة</button></main>;
  if (!l) return <main className="flex-1 flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-gold" /></main>;
  const owner = !!l.token;
  if (edit && owner) return <Editor initial={l} k={k} onSaved={(n) => { setL(n); setEdit(false); window.scrollTo({ top: 0 }); }} />;
  if (share && owner) return <ShareStep list={l} />;

  const wanted = l.items.reduce((a, i) => a + i.wanted, 0);
  const bought = l.items.reduce((a, i) => a + i.bought, 0);
  const days = daysTo(l.weddingDate);
  const gift = (it: Item) => {
    setGift({ code: l.code, title: l.title, bride: l.brideName });
    addToCart(it.product, 1);
    if (!(it.product.options || []).length) setTimeout(() => setCartOpen(true), 150);
  };
  const sorted = [...l.items].sort((a, b) => Number(a.bought >= a.wanted) - Number(b.bought >= b.wanted));

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 sm:py-8 space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-[#2a1d1a] via-ink to-[#3a2a22] text-white p-5 sm:p-8 relative overflow-hidden">
        <div className="absolute -left-16 -bottom-20 w-56 h-56 rounded-full bg-gold/30 blur-3xl" aria-hidden="true" />
        <span className="relative inline-flex items-center gap-1.5 text-xs font-bold bg-white/10 rounded-full px-3 h-7"><Gift className="w-3.5 h-3.5 text-gold-hi" /> قايمة جهاز العروسة</span>
        <h1 className="relative text-2xl sm:text-4xl font-extrabold mt-3 leading-tight">{l.title}</h1>
        {l.message && <p className="relative text-white/85 mt-2 leading-relaxed">«{l.message}»{l.brideName && <span className="text-white/60"> — {l.brideName}</span>}</p>}
        <div className="relative flex flex-wrap gap-2 mt-4 text-sm">
          {days !== null && days >= 0 && <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 h-8"><CalendarHeart className="w-4 h-4 text-gold-hi" /> {days === 0 ? 'الفرح النهارده' : `فاضل ${days} يوم على الفرح`}</span>}
          <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 h-8"><ListChecks className="w-4 h-4 text-gold-hi" /> اتجاب <span className="price">{bought}</span> من <span className="price">{wanted}</span></span>
        </div>
        <div className="relative h-2 rounded-full bg-white/15 mt-4 overflow-hidden"><div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${wanted ? (bought / wanted) * 100 : 0}%` }} /></div>
      </section>

      {owner ? (
        <section className="rounded-2xl bg-gold/10 border border-gold/30 p-4 flex flex-wrap items-center gap-2 justify-between">
          <p className="text-sm text-ink"><b>دي قايمتك.</b> اللي بيفتح اللينك العادي بيشوفها من غير زرار التعديل.</p>
          <div className="flex gap-2">
            <button onClick={() => setEdit(true)} className="h-10 px-4 rounded-xl bg-ink text-white text-sm font-bold inline-flex items-center gap-1.5"><Pencil className="w-4 h-4" /> عدّلي</button>
            <button onClick={() => setShare(true)} className="h-10 px-4 rounded-xl bg-[#25D366] text-white text-sm font-bold inline-flex items-center gap-1.5"><Share2 className="w-4 h-4" /> ابعتيها</button>
          </div>
        </section>
      ) : (
        <p className="text-sm text-steel px-1">اختار هدية، وفي صفحة الطلب اختار «وصّلها لعنوان العروسة» وهتوصلها على بيتها. العنوان محفوظ عندنا ومش هيظهرلك.</p>
      )}

      <ul className="space-y-3">
        {sorted.map((it) => {
          const done = it.bought >= it.wanted;
          const left = it.wanted - it.bought;
          return (
            <li key={it.product.id} className={`bg-white rounded-2xl border p-3 flex gap-3 ${done ? 'border-save/30 opacity-75' : 'border-line'}`}>
              <img src={thumb(it.product.image)} alt="" className="w-24 h-24 rounded-xl object-cover bg-shelf shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col">
                <p className="font-bold text-ink leading-snug line-clamp-2">{it.product.name}</p>
                <p className="price font-extrabold text-gold-deep mt-0.5">{it.product.price.toLocaleString('en-US')} ج.م</p>
                <p className="text-xs text-steel mt-1">{done ? 'اتجاب كله' : it.wanted > 1 ? `محتاجة ${it.wanted} · فاضل ${left}` : 'محتاجة 1'}</p>
                <div className="mt-auto pt-2">
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-sm font-extrabold text-save"><Check className="w-4 h-4" /> اتجابت</span>
                  ) : owner ? null : it.product.stock < 1 ? (
                    <span className="text-sm font-bold text-steel">خلصت حالياً</span>
                  ) : (
                    <button onClick={() => gift(it)} className="btn-gold h-10 px-4 rounded-xl text-sm font-extrabold inline-flex items-center gap-1.5"><Gift className="w-4 h-4" /> اشتريها هدية</button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
};
