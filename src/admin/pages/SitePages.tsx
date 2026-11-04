import React, { useEffect, useState } from 'react';
import { api, SitePage } from '../../lib/api';
import { Card, Spinner, Input, Textarea, Field, Modal, Button, Toggle, useToast } from '../ui';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, ExternalLink, Eye, EyeOff } from 'lucide-react';

type Draft = { slug: string; title: string; content: string; inFooter: boolean; isNew?: boolean; builtin?: boolean; defaultContent?: string };

export const SitePages: React.FC = () => {
  const toast = useToast();
  const [pages, setPages] = useState<SitePage[] | null>(null);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [colTitle, setColTitle] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState('');

  useEffect(() => {
    api.get('admin/pages').then(setPages).catch((e) => toast(e.message, 'err'));
    api.get('admin/settings').then((s: any) => { setColTitle(s.footer_pages_title || 'خدمة العملاء'); setSavedTitle(s.footer_pages_title || 'خدمة العملاء'); }).catch(() => {});
  }, []);

  const move = async (i: number, d: number) => {
    if (!pages) return;
    const j = i + d;
    if (j < 0 || j >= pages.length) return;
    const slugs = pages.map((p) => p.slug);
    [slugs[i], slugs[j]] = [slugs[j], slugs[i]];
    try { setPages(await api.post('admin/pages-order', { slugs })); } catch (e: any) { toast(e.message, 'err'); }
  };

  const toggle = async (p: SitePage) => {
    try {
      setPages(await api.post('admin/page', { ...p, inFooter: !p.inFooter }));
      toast(p.inFooter ? `«${p.title}» اتشالت من الفوتر` : `«${p.title}» ظاهرة في الفوتر`);
    } catch (e: any) { toast(e.message, 'err'); }
  };

  const del = async (p: SitePage) => {
    if (!confirm(`تمسح صفحة «${p.title}»؟`)) return;
    try { setPages(await api.post('admin/page-delete', { slug: p.slug })); toast('الصفحة اتمسحت'); } catch (e: any) { toast(e.message, 'err'); }
  };

  const saveColTitle = async () => {
    const v = (colTitle || '').trim() || 'خدمة العملاء';
    try { await api.post('admin/settings', { footer_pages_title: v }); setSavedTitle(v); setColTitle(v); toast('عنوان العمود اتحفظ'); } catch (e: any) { toast(e.message, 'err'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">صفحات الموقع</h1>
        <Button onClick={() => setEdit({ slug: '', title: '', content: '', inFooter: true, isNew: true })}>
          <Plus className="w-4 h-4" /> صفحة جديدة
        </Button>
      </div>

      <Card>
        <Field label="عنوان العمود في آخر الموقع" hint="الكلمة اللي فوق اللينكات دي في الفوتر">
          <div className="flex gap-2">
            <Input value={colTitle ?? ''} onChange={(e) => setColTitle(e.target.value)} placeholder="خدمة العملاء" />
            {colTitle !== null && colTitle !== savedTitle && <Button className="shrink-0" onClick={saveColTitle}>حفظ</Button>}
          </div>
        </Field>
      </Card>

      <Card>
        {!pages ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-line -my-2">
            {pages.map((p, i) => (
              <li key={p.slug} className="py-3 flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-steel hover:text-ink disabled:opacity-25" aria-label="طلّع لفوق"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === pages.length - 1} className="p-1 text-steel hover:text-ink disabled:opacity-25" aria-label="نزّل لتحت"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm sm:text-base line-clamp-1 ${p.inFooter ? 'text-ink' : 'text-steel'}`}>{p.title}</p>
                  <p className="text-xs text-steel mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                    <span dir="ltr">/p/{p.slug}</span>
                    {p.builtin && <span className="text-gold-deep font-bold">أساسية</span>}
                    {!p.inFooter && <span>مخفية من الفوتر</span>}
                  </p>
                </div>
                <button onClick={() => toggle(p)} className="p-2 text-steel hover:text-ink shrink-0" aria-label={p.inFooter ? 'إخفاء من الفوتر' : 'إظهار في الفوتر'} title={p.inFooter ? 'إخفاء من الفوتر' : 'إظهار في الفوتر'}>
                  {p.inFooter ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="p-2 text-steel hover:text-ink shrink-0" aria-label="فتح الصفحة"><ExternalLink className="w-4 h-4" /></a>
                <Button variant="ghost" className="shrink-0 px-3" onClick={() => setEdit({ ...p })} aria-label="تعديل"><Pencil className="w-4 h-4" /> <span className="hidden sm:inline">تعديل</span></Button>
                {!p.builtin && <button onClick={() => del(p)} className="p-2 text-steel hover:text-sale shrink-0" aria-label="مسح"><Trash2 className="w-4 h-4" /></button>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-steel mt-4">الصفحات «الأساسية» شركات الدفع (Paymob وKashier وFawry) بتطلبها، تقدر تعدّل اسمها وكلامها أو تخفيها من الفوتر، بس متتمسحش.</p>
      </Card>

      {edit && <PageEditor initial={edit} onClose={() => setEdit(null)} onSaved={(l) => { setPages(l); setEdit(null); }} />}
    </div>
  );
};

const PageEditor: React.FC<{ initial: Draft; onClose: () => void; onSaved: (l: SitePage[]) => void }> = ({ initial, onClose, onSaved }) => {
  const toast = useToast();
  const [d, setD] = useState<Draft>({ ...initial, content: initial.content || '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Draft, v: any) => setD((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!d.title.trim()) return toast('اكتب عنوان الصفحة', 'err');
    if (d.isNew && d.slug && !/^[a-z0-9][a-z0-9-]{1,39}$/.test(d.slug)) return toast('رابط الصفحة: حروف إنجليزي صغيرة وأرقام وشَرطة بس', 'err');
    setBusy(true);
    try {
      onSaved(await api.post('admin/page', { slug: d.slug, title: d.title.trim(), content: d.content, inFooter: d.inFooter }));
      toast('الصفحة اتحفظت');
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title={d.isNew ? 'صفحة جديدة' : `تعديل «${initial.title}»`} wide
      footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button onClick={save} loading={busy}>حفظ الصفحة</Button></div>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="عنوان الصفحة (بيظهر في الفوتر وفوق الصفحة)">
            <Input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="مثلاً: الضمان ومراكز الصيانة" />
          </Field>
          {d.isNew ? (
            <Field label="رابط الصفحة (اختياري)" hint="إنجليزي صغير، مثلاً warranty — لو سبته فاضي هيتعمل لوحده">
              <Input dir="ltr" value={d.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="warranty" />
            </Field>
          ) : (
            <Field label="رابط الصفحة">
              <Input dir="ltr" value={`home-x.online/p/${d.slug}`} readOnly className="bg-shelf text-steel" />
            </Field>
          )}
        </div>
        <Field label="كلام الصفحة" hint="سيب سطر فاضي بين كل فقرة">
          <Textarea rows={14} value={d.content} onChange={(e) => set('content', e.target.value)} placeholder={d.defaultContent || 'اكتب كلام الصفحة هنا...'} />
        </Field>
        {d.builtin && !d.content.trim() && d.defaultContent && (
          <p className="text-xs text-steel -mt-2">
            الصفحة دلوقتي بتعرض الكلام المبدئي اللي ظاهر باهت فوق.{' '}
            <button type="button" className="text-gold-deep font-bold underline" onClick={() => set('content', d.defaultContent)}>انسخه وعدّل عليه</button>
          </p>
        )}
        <Toggle checked={d.inFooter} onChange={(v) => set('inFooter', v)} label="تظهر في آخر الموقع (الفوتر)" />
      </div>
    </Modal>
  );
};
