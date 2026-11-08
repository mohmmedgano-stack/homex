import React, { useEffect, useRef, useState } from 'react';
import { api, money } from '../../lib/api';
import { Card, Spinner, Empty, Input, Textarea, Select, Field, Modal, Button, Toggle, useToast } from '../ui';
import { Plus, Search, ImagePlus, Trash2, Star, X, Pencil, ChevronUp, ChevronDown, FolderCog, Link2 } from 'lucide-react';

const blank = {
  id: '', name: '', category: '', brand: '', price: '', originalPrice: '', cost: '', stock: '', sku: '', slug: '',
  image: '', gallery: [] as string[], description: '', features: [] as string[], specs: [] as { label: string; value: string }[],
  warranty: '', wattage: '', capacity: '', isFeatured: false, isNewArrival: true, active: true, rating: '', reviewsCount: '',
};

export const Products: React.FC = () => {
  const toast = useToast();
  const [items, setItems] = useState<any[] | null>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [edit, setEdit] = useState<any>(null);
  const [catsOpen, setCatsOpen] = useState(false);

  const load = () => {
    api.get('admin/products').then(setItems).catch((e) => toast(e.message, 'err'));
    api.get('admin/categories').then(setCats).catch(() => {});
  };
  useEffect(load, []);

  const list = (items || []).filter(
    (p) => (!cat || p.category === cat) && (!q || p.name.includes(q) || p.brand.includes(q))
  );
  const moveTo = async (p: any, category: string) => {
    try {
      setItems(await api.post('admin/product', { ...blank, ...p, originalPrice: p.originalPrice ?? '', category, id: Number(p.id) }));
      api.get('admin/categories').then(setCats);
      toast(`«${p.name}» اتنقل لقسم ${cats.find((c) => c.id === category)?.name || 'بدون قسم'}`);
    } catch (e: any) { toast(e.message, 'err'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">المنتجات والأقسام</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setCatsOpen(true)}><FolderCog className="w-4 h-4" /> الأقسام (إضافة وتعديل)</Button>
          <Button onClick={() => setEdit({ ...blank, category: cat || '' })}>
            <Plus className="w-4 h-4" /> منتج جديد
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-[1fr_220px] gap-2">
        <label className="relative block">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-steel" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم المنتج أو الماركة" className="pr-9" />
        </label>
        <Select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">كل الأقسام</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
          ))}
        </Select>
      </div>

      <Card>
        {!items ? (
          <Spinner />
        ) : list.length === 0 ? (
          <Empty
            title={items.length ? 'مفيش منتجات مطابقة' : 'لسه مضفتش منتجات'}
            text={items.length ? undefined : 'ضيف أول منتج بالصور والسعر والتكلفة.'}
            action={!items.length && <Button onClick={() => setEdit({ ...blank, category: cat || '' })}><Plus className="w-4 h-4" /> منتج جديد</Button>}
          />
        ) : (
          <ul className="divide-y divide-line -my-2">
            {list.map((p) => {
              const profit = p.price - p.cost;
              return (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  {p.image ? <img src={p.image} alt="" className="w-14 h-14 rounded-lg object-cover bg-shelf shrink-0" /> : <span className="w-14 h-14 rounded-lg bg-shelf shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm sm:text-base line-clamp-1">
                      {p.name} {!p.active && <span className="text-xs font-bold text-steel bg-shelf px-1.5 py-0.5 rounded">مخفي</span>} {p.isFeatured && <span className="text-xs font-bold text-gold-deep bg-gold/15 px-1.5 py-0.5 rounded">في البانر</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={p.category || ''}
                        onChange={(e) => moveTo(p, e.target.value)}
                        className={`h-7 max-w-[160px] rounded-md border text-xs font-bold px-1.5 bg-white ${p.category ? 'border-line text-ink' : 'border-sale text-sale'}`}
                        aria-label={`قسم ${p.name}`}
                      >
                        <option value="">بدون قسم</option>
                        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {p.brand && <span className="text-xs text-steel truncate">{p.brand}</span>}
                    </div>
                    <p className="text-xs mt-1 price flex flex-wrap gap-x-3">
                      <span className="font-bold text-ink">بيع {money(p.price)}</span>
                      <span className="text-steel">تكلفة {money(p.cost)}</span>
                      <span className={profit > 0 ? 'text-save font-bold' : 'text-sale font-bold'}>ربح {money(profit)}</span>
                      <span className={p.stock <= 5 ? 'text-sale font-bold' : 'text-steel'}>مخزن {p.stock}</span>
                    </p>
                    {(p.createdBy || p.updatedBy) && (
                      <p className="text-[11px] text-steel mt-1">
                        {p.createdBy && <>ضافه <b className="text-ink">{p.createdBy}</b></>}
                        {p.updatedBy && p.updatedBy !== p.createdBy && <>{p.createdBy ? ' · ' : ''}آخر تعديل <b className="text-ink">{p.updatedBy}</b></>}
                        {p.updatedBy && p.updatedBy === p.createdBy && p.updatedAt && p.updatedAt !== p.createdAt && <> · وعدّله</>}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const url = `${location.origin}/product/${p.id}${p.slug ? '-' + p.slug : ''}`;
                      navigator.clipboard?.writeText(url).then(() => toast('اتنسخ رابط صفحة المنتج — حطه في الإعلان')).catch(() => window.open(url, '_blank'));
                    }}
                    className="p-2 text-steel hover:text-ink shrink-0" aria-label="انسخ رابط المنتج" title="انسخ رابط المنتج للإعلانات"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                  <Button variant="ghost" className="shrink-0 px-3" onClick={() => setEdit({ ...blank, ...p, originalPrice: p.originalPrice ?? '' })} aria-label="تعديل">
                    <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">تعديل</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {edit && <ProductEditor initial={edit} cats={cats} onClose={() => setEdit(null)} onSaved={(list) => { setItems(list); setEdit(null); api.get('admin/categories').then(setCats); }} />}
      <CategoriesModal open={catsOpen} onClose={() => setCatsOpen(false)} cats={cats} setCats={setCats} />
    </div>
  );
};

/* ---------------- editor ---------------- */

const ProductEditor: React.FC<{ initial: any; cats: any[]; onClose: () => void; onSaved: (list: any[]) => void }> = ({ initial, cats, onClose, onSaved }) => {
  const toast = useToast();
  const [p, setP] = useState<any>(() => ({ ...initial, gallery: initial.gallery?.length ? initial.gallery : initial.image ? [initial.image] : [] }));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }));
  const [catList, setCatList] = useState<any[]>(cats);

  const addCategory = async () => {
    const name = prompt('اسم القسم الجديد؟ (مثلاً: مكانس كهربائية)')?.trim();
    if (!name) return;
    try {
      const list = await api.post('admin/category', { name, sort: catList.length });
      setCatList(list);
      const created = list.find((c: any) => c.name === name);
      if (created) set('category', created.id);
      toast(`قسم «${name}» اتضاف`);
    } catch (e: any) {
      toast(e.message, 'err');
    }
  };

  const price = Number(p.price) || 0, cost = Number(p.cost) || 0;
  const profit = price - cost;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(files.length);
    for (const f of Array.from(files)) {
      try {
        const { url } = await api.upload(f);
        setP((x: any) => ({ ...x, gallery: [...x.gallery, url] }));
      } catch (e: any) {
        toast(e.message, 'err');
      }
      setUploading((n) => n - 1);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    if (!p.category) return toast('اختار القسم اللي المنتج هيظهر فيه', 'err');
    setBusy(true);
    try {
      const body = { ...p, image: p.gallery[0] || '', id: p.id ? Number(p.id) : 0 };
      const list = await api.post('admin/product', body);
      toast(p.id ? 'اتحفظت التعديلات' : 'المنتج اتضاف للمتجر');
      onSaved(list);
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`متأكد إنك عايز تمسح «${p.name}»؟ مش هينفع ترجعه.`)) return;
    setBusy(true);
    try {
      await api.post('admin/product-delete', { id: Number(p.id) });
      toast('المنتج اتمسح');
      onSaved(await api.get('admin/products'));
    } catch (e: any) {
      toast(e.message, 'err');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={p.id ? 'تعديل منتج' : 'منتج جديد'}
      footer={
        <>
          {p.id && <Button variant="danger" onClick={remove} disabled={busy} className="ml-auto"><Trash2 className="w-4 h-4" /> مسح</Button>}
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} loading={busy} disabled={uploading > 0}>{p.id ? 'حفظ التعديلات' : 'إضافة المنتج'}</Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Photos */}
        <section>
          <p className="text-sm font-bold text-ink mb-2">الصور <span className="text-steel font-normal">(أول صورة هي الصورة الرئيسية)</span></p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {p.gallery.map((url: string, i: number) => (
              <div key={url + i} className={`relative aspect-square rounded-lg overflow-hidden bg-shelf border-2 ${i === 0 ? 'border-gold' : 'border-transparent'}`}>
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/60 to-transparent">
                  {i > 0 ? (
                    <button type="button" onClick={() => set('gallery', [url, ...p.gallery.filter((_: any, j: number) => j !== i)])} className="text-white p-0.5" title="خليها الرئيسية" aria-label="خليها الصورة الرئيسية">
                      <Star className="w-4 h-4" />
                    </button>
                  ) : <span className="text-[10px] text-white font-bold px-1">رئيسية</span>}
                  <button type="button" onClick={() => set('gallery', p.gallery.filter((_: any, j: number) => j !== i))} className="text-white p-0.5" aria-label="شيل الصورة">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {Array.from({ length: uploading }).map((_, i) => <div key={'u' + i} className="aspect-square rounded-lg bg-shelf animate-pulse" />)}
            <button type="button" onClick={() => fileRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-line hover:border-gold text-steel hover:text-gold-deep flex flex-col items-center justify-center gap-1 text-xs font-bold">
              <ImagePlus className="w-6 h-6" /> ضيف صور
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        </section>

        {/* Basics */}
        <section className="grid sm:grid-cols-2 gap-4">
          <Field label="اسم المنتج" className="sm:col-span-2">
            <Input value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="مثلاً: كاتيل فيليبس 1.7 لتر 2200 واط" />
          </Field>
          <Field label="القسم اللي هيظهر فيه المنتج">
            <div className="flex gap-2">
              <Select value={p.category || ''} onChange={(e) => set('category', e.target.value)} className={p.category ? '' : '!border-sale'}>
                <option value="" disabled>اختار القسم...</option>
                {catList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Button type="button" variant="ghost" className="shrink-0 h-11" onClick={addCategory} title="إضافة قسم جديد">
                <Plus className="w-4 h-4" /> قسم
              </Button>
            </div>
          </Field>
          <Field label="الماركة">
            <Input value={p.brand} onChange={(e) => set('brand', e.target.value)} placeholder="فيليبس، توشيبا، كينوود..." />
          </Field>
        </section>

        {/* Money */}
        <section className="bg-shelf rounded-xl p-4">
          <p className="text-sm font-extrabold text-ink mb-3">الأسعار والمخزن</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="سعر البيع">
              <Input type="number" inputMode="decimal" min="0" value={p.price} onChange={(e) => set('price', e.target.value)} />
            </Field>
            <Field label="السعر قبل الخصم" hint="اختياري">
              <Input type="number" inputMode="decimal" min="0" value={p.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} />
            </Field>
            <Field label="التكلفة عليك" hint="مبيظهرش للعميل">
              <Input type="number" inputMode="decimal" min="0" value={p.cost} onChange={(e) => set('cost', e.target.value)} />
            </Field>
            <Field label="الكمية في المخزن">
              <Input type="number" inputMode="numeric" min="0" value={p.stock} onChange={(e) => set('stock', e.target.value)} />
            </Field>
            <Field label="اسم المنتج في الرابط (بالإنجليزي)" hint={`مثلاً electric-kettle-1-7l ← home-x.online/product/${p.id || 'رقم'}-electric-kettle-1-7l — لو سبته فاضي هيتعمل كود عشوائي لوحده`}>
              <Input dir="ltr" value={p.slug || ''} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))} placeholder="electric-kettle-1-7l" />
            </Field>
            <Field label="الباركود / كود المنتج" hint="اختياري — عشان تبيعه بالقارئ في الكاشير">
              <Input dir="ltr" value={p.sku || ''} onChange={(e) => set('sku', e.target.value.trim())} placeholder="6221234567890" />
            </Field>
          </div>
          {price > 0 && (
            <p className={`text-sm font-bold mt-3 price ${profit > 0 ? 'text-save' : 'text-sale'}`}>
              ربحك في القطعة: {money(profit)}{price > 0 && cost > 0 ? ` (${Math.round((profit / price) * 100)}%)` : ''}
            </p>
          )}
        </section>

        {/* Details */}
        <section className="space-y-4">
          <Field label="الوصف">
            <Textarea rows={4} value={p.description} onChange={(e) => set('description', e.target.value)} placeholder="اوصف المنتج للعميل: بيعمل إيه ومميزاته..." />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="القدرة"><Input value={p.wattage} onChange={(e) => set('wattage', e.target.value)} placeholder="2200 واط" /></Field>
            <Field label="السعة / المقاس"><Input value={p.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="1.7 لتر" /></Field>
            <Field label="الضمان"><Input value={p.warranty} onChange={(e) => set('warranty', e.target.value)} placeholder="ضمان سنتين" /></Field>
          </div>
          <ListEditor label="المميزات" items={p.features} onChange={(v) => set('features', v)} placeholder="مثلاً: فصل أوتوماتيك عند الغليان" />
          <SpecsEditor specs={p.specs} onChange={(v) => set('specs', v)} />
        </section>

        {/* Visibility */}
        <section className="flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-5">
          <Toggle checked={!!p.active} onChange={(v) => set('active', v)} label="ظاهر في المتجر" />
          <Toggle checked={!!p.isFeatured} onChange={(v) => set('isFeatured', v)} label="يظهر في البانر الرئيسي" />
          <Toggle checked={!!p.isNewArrival} onChange={(v) => set('isNewArrival', v)} label="وصل حديثاً" />
        </section>
      </div>
    </Modal>
  );
};

const ListEditor: React.FC<{ label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }> = ({ label, items, onChange, placeholder }) => {
  const [v, setV] = useState('');
  const add = () => { if (v.trim()) { onChange([...items, v.trim()]); setV(''); } };
  return (
    <div>
      <p className="text-sm font-bold text-ink mb-1.5">{label}</p>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={placeholder} />
        <Button variant="dark" type="button" onClick={add} className="shrink-0">ضيف</Button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-1 bg-shelf rounded-lg pr-3 pl-1 py-1 text-sm">
              {it}
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 text-steel hover:text-sale" aria-label="شيل"><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SpecsEditor: React.FC<{ specs: { label: string; value: string }[]; onChange: (v: any[]) => void }> = ({ specs, onChange }) => (
  <div>
    <p className="text-sm font-bold text-ink mb-1.5">المواصفات</p>
    <div className="space-y-2">
      {specs.map((s, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
          <Input value={s.label} onChange={(e) => onChange(specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="مثلاً: الخامة" />
          <Input value={s.value} onChange={(e) => onChange(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="ستانلس ستيل" />
          <button type="button" onClick={() => onChange(specs.filter((_, j) => j !== i))} className="w-10 text-steel hover:text-sale flex items-center justify-center" aria-label="شيل"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
    <button type="button" onClick={() => onChange([...specs, { label: '', value: '' }])} className="mt-2 text-sm font-bold text-gold-deep hover:underline">+ ضيف مواصفة</button>
  </div>
);

/* ---------------- categories ---------------- */

const CategoriesModal: React.FC<{ open: boolean; onClose: () => void; cats: any[]; setCats: (c: any[]) => void }> = ({ open, onClose, cats, setCats }) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [newImage, setNewImage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { name: string; image: string }>>({});
  const [busy, setBusy] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<string>('');

  useEffect(() => { if (!open) { setDrafts({}); setName(''); setNewImage(''); } }, [open]);

  const draft = (c: any) => drafts[c.id] ?? { name: c.name, image: c.image || '' };
  const dirty = (c: any) => !!drafts[c.id] && (drafts[c.id].name !== c.name || drafts[c.id].image !== (c.image || ''));
  const setDraft = (c: any, patch: Partial<{ name: string; image: string }>) => setDrafts((d) => ({ ...d, [c.id]: { ...draft(c), ...patch } }));

  const pickImage = (id: string) => { uploadFor.current = id; fileRef.current?.click(); };
  const onFile = async (f?: File) => {
    if (!f) return;
    const id = uploadFor.current;
    setBusy(id || 'new');
    try {
      const { url } = await api.upload(f);
      if (id) { const c = cats.find((x) => x.id === id); if (c) setDraft(c, { image: url }); }
      else setNewImage(url);
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async (c: any, i: number) => {
    const d = draft(c);
    if (!d.name.trim()) return toast('اكتب اسم القسم', 'err');
    setBusy(c.id);
    try {
      setCats(await api.post('admin/category', { id: c.id, name: d.name.trim(), image: d.image, sort: i }));
      setDrafts((x) => { const n = { ...x }; delete n[c.id]; return n; });
      toast(`قسم «${d.name.trim()}» اتحفظ`);
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
  };

  const add = async () => {
    if (!name.trim()) return;
    setBusy('new');
    try {
      setCats(await api.post('admin/category', { name: name.trim(), image: newImage, sort: cats.length }));
      toast(`قسم «${name.trim()}» اتضاف`);
      setName(''); setNewImage('');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
  };

  const move = async (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= cats.length) return;
    const ids = cats.map((c) => c.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { setCats(await api.post('admin/categories-order', { ids })); } catch (e: any) { toast(e.message, 'err'); }
  };

  const del = async (c: any) => {
    if (!confirm(`تمسح قسم «${c.name}»؟`)) return;
    try { setCats(await api.post('admin/category-delete', { id: c.id })); toast('القسم اتمسح'); } catch (e: any) { toast(e.message, 'err'); }
  };

  const Thumb: React.FC<{ src: string; onClick: () => void; loading?: boolean }> = ({ src, onClick, loading }) => (
    <button type="button" onClick={onClick} title="غيّر صورة القسم" className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-shelf border-2 border-dashed border-line hover:border-gold text-steel hover:text-gold-deep flex items-center justify-center">
      {loading ? <span className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        : src ? <><img src={src} alt="" className="w-full h-full object-cover" /><span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] font-bold py-0.5">تغيير</span></>
        : <ImagePlus className="w-5 h-5" />}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="أقسام المتجر" wide>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      <div className="bg-shelf rounded-xl p-3 mb-5">
        <p className="text-sm font-extrabold text-ink mb-2">قسم جديد</p>
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex items-center gap-2">
          <Thumb src={newImage} onClick={() => pickImage('')} loading={busy === 'new' && !name} />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم القسم (مثلاً: مكانس كهربائية)" />
          <Button type="submit" className="shrink-0" loading={busy === 'new' && !!name}><Plus className="w-4 h-4" /> ضيف</Button>
        </form>
      </div>

      <p className="text-sm font-extrabold text-ink mb-1">الأقسام الحالية</p>
      <ul className="divide-y divide-line">
        {cats.map((c, i) => {
          const d = draft(c);
          return (
            <li key={c.id} className="py-3 flex items-center gap-2">
              <div className="flex flex-col shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-steel hover:text-ink disabled:opacity-25" aria-label="طلّع القسم لفوق"><ChevronUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === cats.length - 1} className="p-1 text-steel hover:text-ink disabled:opacity-25" aria-label="نزّل القسم لتحت"><ChevronDown className="w-4 h-4" /></button>
              </div>
              <Thumb src={d.image} onClick={() => pickImage(c.id)} loading={busy === c.id && !dirty(c)} />
              <div className="flex-1 min-w-0">
                <Input value={d.name} onChange={(e) => setDraft(c, { name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') save(c, i); }} />
                <div className="flex items-center gap-3 mt-1 text-xs text-steel">
                  <span className="price">{c.count} منتج</span>
                  {d.image && <button type="button" onClick={() => setDraft(c, { image: '' })} className="hover:text-sale">شيل الصورة</button>}
                </div>
              </div>
              {dirty(c) && <Button className="shrink-0 h-10 px-3" onClick={() => save(c, i)} loading={busy === c.id}>حفظ</Button>}
              <button onClick={() => del(c)} className="p-2 text-steel hover:text-sale shrink-0" aria-label={`مسح ${c.name}`}><Trash2 className="w-4 h-4" /></button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-steel mt-3">اضغط على الصورة عشان تغيرها، عدّل الاسم واضغط «حفظ». الأسهم بترتب الأقسام في المتجر. لو القسم مالوش صورة، بتظهر صورة أول منتج فيه. القسم اللي فيه منتجات مينفعش يتمسح.</p>
    </Modal>
  );
};
