/**
 * «قدّم طلب استرجاع أو استبدال» — on the returns policy page.
 * Step 1: order code + phone → Step 2: items, return/exchange, reason, note, up to 3 photos → done (request number).
 * The request lands in the dashboard («الاسترجاع والاستبدال») to approve or reject.
 */
import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Repeat, X, ImagePlus, Check, Loader2, PackageOpen } from 'lucide-react';
import { api, thumb } from '../lib/api';

type Item = { id: number; name: string; image: string; qty: number };
type Req = { ref: string; type: string; status: string; createdAt: string; adminNote: string };
type Lookup = { code: string; status: string; name: string; delivered: boolean; items: Item[]; requests: Req[]; reasons: string[] };

const STATUS: Record<string, [string, string]> = {
  pending: ['بنراجعه', 'bg-gold/15 text-gold-deep'],
  approved: ['اتوافق عليه', 'bg-save/10 text-save'],
  rejected: ['اترفض', 'bg-sale/10 text-sale'],
  done: ['اتقفل', 'bg-ink/5 text-ink'],
};

const field = 'w-full h-12 rounded-xl border border-line bg-white px-4 text-base text-ink focus:outline-hidden focus:border-gold';

export const ReturnRequestButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (location.hash === '#request' || new URLSearchParams(location.search).get('order')) setOpen(true);
  }, []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn-gold inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-extrabold ${className}`}>
        <RotateCcw className="w-5 h-5" /> قدّم طلب استرجاع أو استبدال
      </button>
      {open && <ReturnRequestDialog onClose={() => setOpen(false)} />}
    </>
  );
};

const ReturnRequestDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('order') || '');
  const [phone, setPhone] = useState('');
  const [d, setD] = useState<Lookup | null>(null);
  const [type, setType] = useState<'return' | 'exchange' | ''>('');
  const [items, setItems] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ ref: string; type: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [onClose]);
  useEffect(() => { boxRef.current?.scrollTo({ top: 0 }); setErr(''); }, [d, done]);

  const urls = React.useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r: Lookup = await api.post('return-lookup', { code: code.trim(), phone: phone.trim() });
      setD(r);
      setItems(r.items.length === 1 ? [r.items[0].id] : []);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const addPhotos = (list: FileList | null) => {
    if (!list) return;
    const ok = Array.from(list).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (ok.length < list.length) setErr('الصور لازم تكون JPG أو PNG أو WEBP');
    setPhotos((p) => [...p, ...ok].slice(0, 3));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return setErr('اختار استرجاع ولا استبدال');
    if (!items.length) return setErr('اختار المنتج');
    if (!reason) return setErr('اختار السبب');
    if (note.trim().length < 5) return setErr('اكتب ملاحظة قصيرة توضح المشكلة');
    setBusy(true); setErr('');
    const fd = new FormData();
    fd.append('code', d!.code); fd.append('phone', phone.trim()); fd.append('type', type);
    fd.append('items', JSON.stringify(items)); fd.append('reason', reason); fd.append('note', note.trim());
    photos.forEach((f) => fd.append('photos[]', f));
    try { setDone(await api.form('return-request', fd)); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const openReq = d?.requests.find((r) => r.status === 'pending' || r.status === 'approved');

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose} data-lenis-prevent>
      <div role="dialog" aria-modal="true" aria-labelledby="rr-title" onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 h-14 border-b border-line shrink-0">
          <h2 id="rr-title" className="text-lg font-extrabold text-ink">طلب استرجاع أو استبدال</h2>
          <button type="button" onClick={onClose} className="w-10 h-10 -ml-2 flex items-center justify-center text-steel hover:text-ink" aria-label="إغلاق"><X className="w-5 h-5" /></button>
        </div>

        <div ref={boxRef} className="overflow-y-auto px-5 py-5">
          {done ? (
            <div className="text-center py-6">
              <span className="mx-auto w-14 h-14 rounded-full bg-save/10 text-save flex items-center justify-center"><Check className="w-7 h-7" /></span>
              <p className="text-lg font-extrabold text-ink mt-4">طلبك وصلنا</p>
              <p className="text-sm text-steel mt-2 leading-relaxed">
                رقم طلب {done.type === 'exchange' ? 'الاستبدال' : 'الاسترجاع'}: <b dir="ltr" className="price text-ink">{done.ref}</b>
                <br />هنراجعه ونتواصل معاك على رقم موبايلك. تقدر تتابع حالته من هنا برقم الأوردر.
              </p>
              <button type="button" onClick={onClose} className="btn-gold mt-6 h-12 px-8 rounded-xl font-extrabold">تمام</button>
            </div>
          ) : !d ? (
            <form onSubmit={find} className="space-y-4">
              <p className="text-sm text-steel leading-relaxed">اكتب رقم الطلب (موجود في رسالة تأكيد الطلب وصفحة متابعته) ورقم الموبايل اللي طلبت بيه.</p>
              <label className="block">
                <span className="block text-sm font-bold text-ink mb-1.5">رقم الطلب</span>
                <input className={field} dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="HX2611…" autoComplete="off" required />
              </label>
              <label className="block">
                <span className="block text-sm font-bold text-ink mb-1.5">رقم الموبايل</span>
                <input className={field} dir="ltr" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" autoComplete="tel" required />
              </label>
              {err && <p className="text-sm text-sale font-bold" role="alert">{err}</p>}
              <button type="submit" disabled={busy} className="btn-gold w-full h-12 rounded-xl font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 className="w-5 h-5 animate-spin" />} كمّل
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <p className="text-sm text-steel">طلب <b dir="ltr" className="price text-ink">{d.code}</b> · {d.name}</p>

              {d.requests.length > 0 && (
                <div className="rounded-xl bg-shelf p-3 space-y-2">
                  <p className="text-sm font-bold text-ink">طلباتك السابقة على الأوردر ده</p>
                  {d.requests.map((r) => (
                    <div key={r.ref} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span dir="ltr" className="price font-bold text-ink">{r.ref}</span>
                        <span className="text-steel">{r.type === 'exchange' ? 'استبدال' : 'استرجاع'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS[r.status]?.[1] || ''}`}>{STATUS[r.status]?.[0] || r.status}</span>
                      </div>
                      {r.adminNote && <p className="text-steel mt-1">ردّنا: {r.adminNote}</p>}
                    </div>
                  ))}
                </div>
              )}

              {openReq ? (
                <p className="text-sm text-ink leading-relaxed">عندك طلب مفتوح على الأوردر ده برقم <b dir="ltr" className="price">{openReq.ref}</b>، وهنتواصل معاك بخصوصه.</p>
              ) : (
                <>
                  {!d.delivered && (
                    <p className="text-sm rounded-xl bg-gold/10 text-ink p-3 leading-relaxed">الطلب ده لسه ماتسلمش عندنا. لو استلمته فعلاً كمّل عادي، ولو لسه ممكن ترفض استلامه من المندوب.</p>
                  )}
                  <fieldset>
                    <legend className="text-sm font-bold text-ink mb-2">عايز إيه؟</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {([['return', 'استرجاع', RotateCcw, 'ترجّع المنتج وتاخد فلوسك'], ['exchange', 'استبدال', Repeat, 'تبدّله بنفس المنتج أو غيره']] as const).map(([v, l, Icon, hint]) => (
                        <button key={v} type="button" onClick={() => setType(v)} aria-pressed={type === v}
                          className={`rounded-xl border-2 p-3 text-right transition ${type === v ? 'border-gold bg-gold/10' : 'border-line hover:border-steel'}`}>
                          <span className="flex items-center gap-2 font-extrabold text-ink"><Icon className="w-4 h-4" /> {l}</span>
                          <span className="block text-xs text-steel mt-1">{hint}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-bold text-ink mb-2">المنتج</legend>
                    <div className="space-y-2">
                      {d.items.map((it) => {
                        const on = items.includes(it.id);
                        return (
                          <label key={it.id} className={`flex items-center gap-3 rounded-xl border-2 p-2.5 cursor-pointer transition ${on ? 'border-gold bg-gold/5' : 'border-line'}`}>
                            <input type="checkbox" className="w-5 h-5 accent-[#f47a20] shrink-0" checked={on}
                              onChange={() => setItems((x) => (on ? x.filter((i) => i !== it.id) : [...x, it.id]))} />
                            {it.image ? <img src={thumb(it.image)} alt="" className="w-12 h-12 rounded-lg object-cover bg-shelf shrink-0" /> : <PackageOpen className="w-12 h-12 p-3 text-steel bg-shelf rounded-lg shrink-0" />}
                            <span className="text-sm font-bold text-ink flex-1 min-w-0">{it.name}{it.qty > 1 && <span className="text-steel font-normal"> × {it.qty}</span>}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className="block">
                    <span className="block text-sm font-bold text-ink mb-1.5">السبب</span>
                    <select className={field} value={reason} onChange={(e) => setReason(e.target.value)} required>
                      <option value="">اختار السبب</option>
                      {d.reasons.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="block text-sm font-bold text-ink mb-1.5">ملاحظة</span>
                    <textarea className={`${field} h-28 py-3 resize-none`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
                      placeholder="اكتب المشكلة بالتفصيل، ولو استبدال اكتب عايز تبدله بإيه" required />
                  </label>

                  <div>
                    <span className="block text-sm font-bold text-ink mb-1.5">صور المنتج <span className="font-normal text-steel">(لو متاحة، لحد 3 صور)</span></span>
                    <div className="flex flex-wrap gap-2">
                      {urls.map((u, i) => (
                        <div key={u} className="relative w-20 h-20">
                          <img src={u} alt={`صورة ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border border-line" />
                          <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center" aria-label="شيل الصورة"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {photos.length < 3 && (
                        <button type="button" onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-line hover:border-gold text-steel hover:text-gold-deep flex flex-col items-center justify-center gap-1 text-xs font-bold">
                          <ImagePlus className="w-6 h-6" /> ضيف صورة
                        </button>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                  </div>

                  {err && <p className="text-sm text-sale font-bold" role="alert">{err}</p>}
                  <button type="submit" disabled={busy} className="btn-gold w-full h-12 rounded-xl font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                    {busy && <Loader2 className="w-5 h-5 animate-spin" />} ابعت الطلب
                  </button>
                </>
              )}
              <button type="button" onClick={() => setD(null)} className="w-full text-sm font-bold text-steel hover:text-ink">رجوع</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
