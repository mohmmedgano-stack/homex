import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Empty, Input, Select, Field, Modal, Button, Toggle, useToast } from '../ui';
import { Plus, Search, Phone, MessageCircle, MapPin, ImagePlus, Trash2, Pencil, Star } from 'lucide-react';
import { EGYPT_GOVERNORATES } from '../../data/governorates';

const blank = {
  id: 0, name: '', governorate: '', area: '', address: '', phone: '', whatsapp: '', mapUrl: '',
  logo: '', categories: [] as string[], hours: '', featured: false, active: true,
};

export const Dealers: React.FC = () => {
  const toast = useToast();
  const [list, setList] = useState<any[] | null>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [gov, setGov] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<any>(null);

  useEffect(() => {
    api.get('admin/dealers').then(setList).catch((e) => toast(e.message, 'err'));
    api.get('admin/categories').then(setCats).catch(() => {});
  }, []);

  const shown = (list || []).filter((d) => (!gov || d.governorate === gov) && (!q || d.name.includes(q) || d.area.includes(q)));
  const govCount = (g: string) => (list || []).filter((d) => d.governorate === g).length;
  const covered = new Set((list || []).filter((d) => d.active).map((d) => d.governorate)).size;
  const totals = (list || []).reduce((a, d) => ({ calls: a.calls + d.calls, wa: a.wa + d.whatsapps, maps: a.maps + d.maps }), { calls: 0, wa: 0, maps: 0 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink">التجار المعتمدين</h1>
          <p className="text-sm text-steel mt-1">المحلات اللي عندها منتجات HOMEX. بتظهر للعميل حسب محافظته في صفحة «اشتري من أقرب تاجر».</p>
        </div>
        <Button onClick={() => setEdit({ ...blank })}><Plus className="w-4 h-4" /> تاجر جديد</Button>
      </div>

      {list && list.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="عدد التجار" value={list.length} />
          <MiniStat label="محافظات مغطّاة" value={`${covered} من 27`} />
          <MiniStat label="ضغطات اتصال" value={totals.calls} />
          <MiniStat label="ضغطات واتساب وخريطة" value={totals.wa + totals.maps} />
        </div>
      )}

      <div className="grid sm:grid-cols-[1fr_240px] gap-2">
        <label className="relative block">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم التاجر أو المنطقة" className="pr-9" />
        </label>
        <Select value={gov} onChange={(e) => setGov(e.target.value)}>
          <option value="">كل المحافظات</option>
          {EGYPT_GOVERNORATES.map((g) => (
            <option key={g} value={g}>{g} ({govCount(g)})</option>
          ))}
        </Select>
      </div>

      <Card>
        {!list ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <Empty
            title={list.length ? 'مفيش تجار مطابقين' : 'لسه مضفتش تجار'}
            text={list.length ? undefined : 'ضيف المحلات اللي بتبيع منتجاتك، وهتظهر للعملاء القريبين منها.'}
            action={!list.length && <Button onClick={() => setEdit({ ...blank })}><Plus className="w-4 h-4" /> تاجر جديد</Button>}
          />
        ) : (
          <ul className="divide-y divide-line -my-2">
            {shown.map((d) => (
              <li key={d.id} className="py-3 flex items-center gap-3">
                {d.logo ? <img src={d.logo} alt="" className="w-12 h-12 rounded-lg object-cover bg-shelf shrink-0" /> : <span className="w-12 h-12 rounded-lg bg-shelf shrink-0 flex items-center justify-center text-steel font-black">{d.name.slice(0, 1)}</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink line-clamp-1 flex items-center gap-1.5">
                    {d.featured && <Star className="w-4 h-4 fill-gold text-gold shrink-0" />}
                    {d.name}
                    {!d.active && <span className="text-xs font-bold text-steel bg-shelf px-1.5 py-0.5 rounded">مخفي</span>}
                  </p>
                  <p className="text-xs text-steel mt-0.5">{d.governorate}{d.area ? ` · ${d.area}` : ''}</p>
                  <p className="text-xs text-steel mt-1 price flex flex-wrap gap-x-3">
                    <span>{d.calls} اتصال</span><span>{d.whatsapps} واتساب</span><span>{d.maps} خريطة</span>
                  </p>
                </div>
                <Button variant="ghost" className="shrink-0 px-3" onClick={() => setEdit({ ...blank, ...d })} aria-label="تعديل">
                  <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">تعديل</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {edit && <DealerEditor initial={edit} cats={cats} onClose={() => setEdit(null)} onSaved={(l) => { setList(l); setEdit(null); }} />}
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-white rounded-2xl border border-line p-3.5">
    <p className="text-xs text-steel font-bold">{label}</p>
    <p className="price text-xl font-black text-ink mt-1">{value}</p>
  </div>
);

const DealerEditor: React.FC<{ initial: any; cats: any[]; onClose: () => void; onSaved: (l: any[]) => void }> = ({ initial, cats, onClose, onSaved }) => {
  const toast = useToast();
  const [d, setD] = useState<any>(initial);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: any) => setD((x: any) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      onSaved(await api.post('admin/dealer', d));
      toast(d.id ? 'بيانات التاجر اتحفظت' : 'التاجر اتضاف وظهر في الموقع');
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`تمسح «${d.name}» من التجار؟`)) return;
    setBusy(true);
    try {
      onSaved(await api.post('admin/dealer-delete', { id: d.id }));
      toast('التاجر اتمسح');
    } catch (e: any) {
      toast(e.message, 'err');
      setBusy(false);
    }
  };

  const uploadLogo = async (f?: File) => {
    if (!f) return;
    setUp(true);
    try {
      set('logo', (await api.upload(f)).url);
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setUp(false);
    }
  };

  const toggleCat = (id: string) =>
    set('categories', d.categories.includes(id) ? d.categories.filter((c: string) => c !== id) : [...d.categories, id]);

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={d.id ? 'تعديل تاجر' : 'تاجر جديد'}
      footer={
        <>
          {d.id ? <Button variant="danger" onClick={remove} disabled={busy} className="ml-auto"><Trash2 className="w-4 h-4" /> مسح</Button> : null}
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} loading={busy}>{d.id ? 'حفظ' : 'إضافة التاجر'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-line hover:border-gold overflow-hidden bg-shelf flex items-center justify-center text-steel shrink-0" aria-label="لوجو أو صورة المحل">
            {d.logo ? <img src={d.logo} alt="" className="w-full h-full object-cover" /> : up ? <span className="text-xs">بيترفع…</span> : <ImagePlus className="w-6 h-6" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
          <Field label="اسم التاجر أو المحل" className="flex-1">
            <Input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="مثلاً: معرض النور للأجهزة المنزلية" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="المحافظة">
            <Select value={d.governorate} onChange={(e) => set('governorate', e.target.value)}>
              <option value="" disabled>اختار المحافظة</option>
              {EGYPT_GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label="المدينة أو المنطقة">
            <Input value={d.area} onChange={(e) => set('area', e.target.value)} placeholder="مثلاً: المنصورة - شارع الجمهورية" />
          </Field>
          <Field label="العنوان بالتفصيل" className="sm:col-span-2">
            <Input value={d.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="رقم التليفون">
            <Input value={d.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" />
          </Field>
          <Field label="رقم الواتساب">
            <Input value={d.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" />
          </Field>
          <Field label="لينك المكان على خرائط جوجل" hint="افتح المحل على Google Maps واضغط مشاركة وانسخ اللينك" className="sm:col-span-2">
            <Input value={d.mapUrl} onChange={(e) => set('mapUrl', e.target.value)} dir="ltr" placeholder="https://maps.app.goo.gl/..." />
          </Field>
          <Field label="مواعيد العمل" hint="اختياري" className="sm:col-span-2">
            <Input value={d.hours} onChange={(e) => set('hours', e.target.value)} placeholder="يومياً من 10 الصبح لـ 11 بالليل" />
          </Field>
        </div>

        {cats.length > 0 && (
          <div>
            <p className="text-sm font-bold text-ink mb-2">الأقسام اللي عنده <span className="text-steel font-normal">(متختارش حاجة لو عنده كل المنتجات)</span></p>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCat(c.id)}
                  className={`h-9 px-3 rounded-lg text-sm font-bold border ${d.categories.includes(c.id) ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-line'}`}
                  aria-pressed={d.categories.includes(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-5">
          <Toggle checked={!!d.active} onChange={(v) => set('active', v)} label="ظاهر في الموقع" />
          <Toggle checked={!!d.featured} onChange={(v) => set('featured', v)} label="تاجر مميز (يظهر الأول في محافظته)" />
        </div>
      </div>
    </Modal>
  );
};
