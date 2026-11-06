import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Spinner, Button, useToast } from '../ui';
import { DatabaseBackup, Download, Images, Upload, ShieldCheck } from 'lucide-react';

type Info = { backups: { file: string; size: number; at: string; manual: boolean }[]; images: number; imagesSize: number };
const mb = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} ميجا` : `${Math.max(1, Math.round(b / 1024))} كيلو`);

/** Owner only: daily automatic copies of the data, manual copy, download, restore. */
export const Backups: React.FC = () => {
  const toast = useToast();
  const [d, setD] = useState<Info | null>(null);
  const [busy, setBusy] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.get('admin/backups').then(setD).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []);

  const now = async () => {
    setBusy('now');
    try { setD(await api.post('admin/backup-now', {})); toast('اتعملت نسخة احتياطية دلوقتي'); } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
  };
  const restore = async (f?: File) => {
    if (!f) return;
    if (!confirm(`هترجّع الموقع كله (المنتجات والطلبات والحسابات والإعدادات) للنسخة «${f.name}».\nالبيانات الحالية هتتحفظ نسخة قبلها عشان تقدر ترجعلها.\nمتأكد؟`)) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setBusy('restore');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await api.form('admin/backup-restore', fd);
      toast(`الموقع رجع للنسخة دي. النسخة اللي كانت قبلها اتحفظت باسم ${r.savedAs}`);
      setTimeout(() => location.reload(), 1500);
    } catch (e: any) { toast(e.message, 'err'); }
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">النسخ الاحتياطي</h1>
        <p className="text-sm text-steel mt-1">الموقع بياخد نسخة من كل البيانات لوحده كل يوم (المنتجات والطلبات والحسابات والمخزن والإعدادات)، وبيحتفظ بآخر 14 يوم.</p>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Button loading={busy === 'now'} onClick={now}><DatabaseBackup className="w-4 h-4" /> اعمل نسخة دلوقتي</Button>
          <a href="/api/?r=admin/images-download" className="h-11 px-4 rounded-lg text-sm font-bold inline-flex items-center gap-2 bg-white text-ink border border-line hover:border-ink">
            <Images className="w-4 h-4" /> نزّل كل الصور {d ? `(${d.images} صورة · ${mb(d.imagesSize)})` : ''}
          </a>
        </div>
        <p className="text-xs text-steel mt-3 flex items-start gap-1.5"><ShieldCheck className="w-4 h-4 text-save shrink-0" /> نصيحة: نزّل نسخة مرة في الأسبوع واحفظها على Google Drive، عشان لو حصل أي حاجة للسيرفر نفسه.</p>
      </Card>

      <Card title="النسخ المحفوظة على السيرفر">
        {!d ? <Spinner /> : d.backups.length === 0 ? (
          <p className="text-sm text-steel">لسه مفيش نسخ. أول نسخة تلقائية بتتعمل مع أول زيارة للموقع النهارده، أو دوس «اعمل نسخة دلوقتي».</p>
        ) : (
          <ul className="divide-y divide-line -my-2">
            {d.backups.map((b) => (
              <li key={b.file} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink price" dir="ltr" style={{ textAlign: 'right' }}>{b.at}</p>
                  <p className="text-xs text-steel">{b.file.includes('before-restore') ? 'اتحفظت قبل استرجاع' : b.manual ? 'يدوي' : 'تلقائي'} · {mb(b.size)}</p>
                </div>
                <a href={`/api/?r=admin/backup-download&f=${encodeURIComponent(b.file)}`} className="h-9 px-3 rounded-lg text-sm font-bold inline-flex items-center gap-1.5 bg-white text-ink border border-line hover:border-ink shrink-0">
                  <Download className="w-4 h-4" /> تحميل
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="استرجاع نسخة">
        <p className="text-sm text-steel mb-3">لو حصلت مشكلة (مسح بالغلط مثلاً)، ارفع ملف نسخة من اللي نزلتها (ملف ‎.sqlite) والموقع يرجع زي ما كان وقتها. البيانات الحالية بتتحفظ نسخة قبل الاسترجاع.</p>
        <input ref={fileRef} type="file" accept=".sqlite" hidden onChange={(e) => restore(e.target.files?.[0])} />
        <Button variant="danger" loading={busy === 'restore'} onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> ارفع نسخة واسترجعها</Button>
      </Card>
    </div>
  );
};
