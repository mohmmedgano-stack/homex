import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Select, Field, Modal, Button, Toggle, useToast } from '../ui';
import { Plus, ImagePlus, Trash2, Pencil, ChevronUp, ChevronDown, Monitor, Smartphone } from 'lucide-react';

/** Recommended artwork sizes — keep in sync with the slider's aspect ratios in HeroBanner. */
export const BANNER_SIZES = {
  desktop: { w: 1920, h: 640, ratio: '3 / 1' },
  mobile: { w: 1080, h: 720, ratio: '3 / 2' },
};

type Banner = { id?: number; image: string; imageMobile: string; title: string; link: string; active: boolean };
const blank: Banner = { image: '', imageMobile: '', title: '', link: '', active: true };

const linkKind = (l: string) => (l.startsWith('product:') ? 'product' : l.startsWith('category:') ? 'category' : l ? 'url' : '');

export const Banners: React.FC = () => {
  const toast = useToast();
  const [list, setList] = useState<Banner[] | null>(null);
  const [edit, setEdit] = useState<Banner | null>(null);

  useEffect(() => {
    api.get('admin/banners').then(setList).catch((e) => toast(e.message, 'err'));
  }, []);

  const move = async (i: number, d: number) => {
    if (!list) return;
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((b) => b.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { setList(await api.post('admin/banners-order', { ids })); } catch (e: any) { toast(e.message, 'err'); }
  };

  const del = async (b: Banner) => {
    if (!confirm('تمسح البانر ده؟')) return;
    try { setList(await api.post('admin/banner-delete', { id: b.id })); toast('البانر اتمسح'); } catch (e: any) { toast(e.message, 'err'); }
  };

  const toggle = async (b: Banner) => {
    try { setList(await api.post('admin/banner', { ...b, active: !b.active })); } catch (e: any) { toast(e.message, 'err'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">بانرات الصفحة الرئيسية</h1>
        <Button onClick={() => setEdit({ ...blank })}><Plus className="w-4 h-4" /> بانر جديد</Button>
      </div>

      <SizeGuide />

      <Card>
        {!list ? (
          <Spinner />
        ) : list.length === 0 ? (
          <Empty
            title="مفيش بانرات لسه"
            text="لحد ما تضيف بانر، الموقع بيعرض المنتجات اللي مفعّل عليها «يظهر في البانر الرئيسي»، ولو مفيش بيعرض بانر HOMEX."
            action={<Button onClick={() => setEdit({ ...blank })}><Plus className="w-4 h-4" /> ضيف أول بانر</Button>}
          />
        ) : (
          <ul className="divide-y divide-line -my-2">
            {list.map((b, i) => (
              <li key={b.id} className="py-3 flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-steel hover:text-ink disabled:opacity-25" aria-label="قبل"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="p-1 text-steel hover:text-ink disabled:opacity-25" aria-label="بعد"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <img src={b.image} alt="" className={`w-28 sm:w-44 aspect-[3/1] rounded-lg object-cover bg-shelf shrink-0 ${b.active ? '' : 'opacity-40'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-sm line-clamp-1">{b.title || `بانر ${i + 1}`}</p>
                  <p className="text-xs text-steel mt-0.5">
                    {b.imageMobile ? 'ليه صورة للموبايل' : 'بيستخدم صورة الكمبيوتر على الموبايل'}
                    {b.link ? ' · بيفتح لينك' : ''}
                  </p>
                  <button onClick={() => toggle(b)} className={`mt-1 text-xs font-bold ${b.active ? 'text-save' : 'text-steel'}`}>
                    {b.active ? '● ظاهر في المتجر' : '○ مخفي — اضغط للإظهار'}
                  </button>
                </div>
                <Button variant="ghost" className="shrink-0 px-3" onClick={() => setEdit(b)} aria-label="تعديل"><Pencil className="w-4 h-4" /></Button>
                <button onClick={() => del(b)} className="p-2 text-steel hover:text-sale shrink-0" aria-label="مسح"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {edit && <BannerEditor initial={edit} onClose={() => setEdit(null)} onSaved={(l) => { setList(l); setEdit(null); }} />}
    </div>
  );
};

const SizeGuide: React.FC = () => (
  <div className="grid sm:grid-cols-2 gap-3">
    {([['desktop', Monitor, 'صورة الكمبيوتر (أساسية)'], ['mobile', Smartphone, 'صورة الموبايل (اختيارية بس مهمة)']] as const).map(([k, Icon, label]) => {
      const s = BANNER_SIZES[k];
      return (
        <div key={k} className="bg-white rounded-xl border border-line p-4 flex items-center gap-4">
          <span className="w-11 h-11 rounded-full bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink">{label}</p>
            <p className="price text-lg font-black text-ink" dir="ltr" style={{ textAlign: 'right' }}>{s.w} × {s.h} px</p>
            <p className="text-xs text-steel">نسبة {s.ratio.replace(/ /g, '')} · خلّي الكلام والمنتج في النص، وسيب ٨٪ فاضي من الأطراف</p>
          </div>
        </div>
      );
    })}
  </div>
);

const BannerEditor: React.FC<{ initial: Banner; onClose: () => void; onSaved: (l: Banner[]) => void }> = ({ initial, onClose, onSaved }) => {
  const toast = useToast();
  const [b, setB] = useState<Banner>(initial);
  const [kind, setKind] = useState(linkKind(initial.link));
  const [busy, setBusy] = useState<'' | 'image' | 'imageMobile' | 'save'>('');
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<'image' | 'imageMobile'>('image');
  const set = (k: keyof Banner, v: any) => setB((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    api.get('admin/products').then(setProducts).catch(() => {});
    api.get('admin/categories').then(setCats).catch(() => {});
  }, []);

  const pick = (t: 'image' | 'imageMobile') => { target.current = t; fileRef.current?.click(); };
  const onFile = async (f?: File) => {
    if (!f) return;
    const t = target.current;
    setBusy(t);
    try {
      const dims = await new Promise<{ w: number; h: number }>((res) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => res({ w: 0, h: 0 });
        img.src = URL.createObjectURL(f);
      });
      const want = BANNER_SIZES[t === 'image' ? 'desktop' : 'mobile'];
      if (dims.w && Math.abs(dims.w / dims.h - want.w / want.h) > 0.08) {
        toast(`مقاس الصورة دي مختلف عن المقاس المظبوط (عرض ${want.w} × ارتفاع ${want.h})، وأجزاء منها ممكن تتقص`, 'err');
      }
      const { url } = await api.upload(f, 'banner');
      set(t, url);
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const setKindTo = (k: string) => { setKind(k); set('link', k === 'url' ? '' : ''); };

  const save = async () => {
    if (!b.image) return toast('ارفع صورة البانر للكمبيوتر', 'err');
    if (kind && !b.link) return toast('اختار البانر هيفتح على إيه، أو خليه «مش بيفتح حاجة»', 'err');
    setBusy('save');
    try {
      onSaved(await api.post('admin/banner', { ...b, link: kind ? b.link : '' }));
      toast('البانر اتحفظ');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
  };

  const Slot: React.FC<{ t: 'image' | 'imageMobile'; label: string; ratio: string; size: string }> = ({ t, label, ratio, size }) => (
    <div>
      <p className="text-sm font-bold text-ink mb-1.5">{label} <bdi dir="ltr" className="price text-steel font-normal inline-block">{size} px</bdi></p>
      <button type="button" onClick={() => pick(t)} style={{ aspectRatio: ratio }} className="relative w-full rounded-xl overflow-hidden bg-shelf border-2 border-dashed border-line hover:border-gold text-steel hover:text-gold-deep flex items-center justify-center">
        {busy === t ? <span className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          : b[t] ? <><img src={b[t]} alt="" className="absolute inset-0 w-full h-full object-cover" /><span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">تغيير</span></>
          : <span className="flex flex-col items-center gap-1 text-sm font-bold"><ImagePlus className="w-6 h-6" /> ارفع الصورة</span>}
      </button>
      {t === 'imageMobile' && b.imageMobile && <button type="button" onClick={() => set('imageMobile', '')} className="text-xs text-steel hover:text-sale mt-1">شيل صورة الموبايل</button>}
    </div>
  );

  return (
    <Modal open onClose={onClose} title={initial.id ? 'تعديل البانر' : 'بانر جديد'} wide
      footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={save} loading={busy === 'save'}>حفظ البانر</Button></div>}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="space-y-5">
        <div className="grid sm:grid-cols-[3fr_2fr] gap-4 items-start">
          <Slot t="image" label="صورة الكمبيوتر" ratio={BANNER_SIZES.desktop.ratio} size={`${BANNER_SIZES.desktop.w} × ${BANNER_SIZES.desktop.h}`} />
          <Slot t="imageMobile" label="صورة الموبايل" ratio={BANNER_SIZES.mobile.ratio} size={`${BANNER_SIZES.mobile.w} × ${BANNER_SIZES.mobile.h}`} />
        </div>
        <p className="text-xs text-steel -mt-2">لو مرفعتش صورة موبايل، صورة الكمبيوتر هتتعرض على الموبايل بس هتبقى صغيرة. الأفضل تعمل تصميم مخصوص للموبايل.</p>

        <Field label="اسم البانر (للوحة التحكم وقارئ الشاشة)">
          <Input value={b.title} onChange={(e) => set('title', e.target.value)} placeholder="مثلاً: عرض الكاتيل - نوفمبر" />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="لما العميل يدوس على البانر">
            <Select value={kind} onChange={(e) => setKindTo(e.target.value)}>
              <option value="">مش بيفتح حاجة</option>
              <option value="product">يفتح منتج</option>
              <option value="category">يفتح قسم</option>
              <option value="url">يفتح لينك</option>
            </Select>
          </Field>
          {kind === 'product' && (
            <Field label="المنتج">
              <Select value={b.link.replace('product:', '')} onChange={(e) => set('link', e.target.value ? `product:${e.target.value}` : '')}>
                <option value="">اختار المنتج...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          )}
          {kind === 'category' && (
            <Field label="القسم">
              <Select value={b.link.replace('category:', '')} onChange={(e) => set('link', e.target.value ? `category:${e.target.value}` : '')}>
                <option value="">اختار القسم...</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}
          {kind === 'url' && (
            <Field label="اللينك" hint="لينك صفحة في الموقع زي /p/shipping أو لينك كامل يبدأ بـ https://">
              <Input dir="ltr" value={b.link} onChange={(e) => set('link', e.target.value.trim())} placeholder="https://..." />
            </Field>
          )}
        </div>

        <Toggle checked={b.active} onChange={(v) => set('active', v)} label="ظاهر في المتجر" />
      </div>
    </Modal>
  );
};
