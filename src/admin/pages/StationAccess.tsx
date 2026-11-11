import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Field, Input, Button, Spinner, useToast } from '../ui';
import { QrCode, ExternalLink, Copy } from 'lucide-react';

/** Owner only: the separate login for the barcode station at /codes/. */
export const StationAccess: React.FC = () => {
  const toast = useToast();
  const [s, setS] = useState<{ configured: boolean; username: string; updatedAt: string; updatedBy: string; path: string } | null>(null);
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('admin/station').then((r) => { setS(r); setU(r.username); }).catch((e) => toast(e.message, 'err')); }, []);
  const link = `${location.origin}/codes/`;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (p !== p2) return toast('الباسورد مش متطابق', 'err');
    setBusy(true);
    try { setS(await api.post('admin/station', { username: u, password: p })); setP(''); setP2(''); toast('اتحفظ — أي حد كان فاتح المحطة هيطلب دخول من جديد'); } catch (x: any) { toast(x.message, 'err'); }
    setBusy(false);
  };
  if (!s) return <Spinner />;
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <Card title={<span className="flex items-center gap-2"><QrCode className="w-5 h-5 text-gold-deep" /> محطة الباركود</span>}>
        <p className="text-sm text-steel leading-relaxed">
          صفحة لوحدها برّه المتجر ولوحة التحكم: طباعة أكواد QR بحرف التاجر والسنة/الإصدار ورقم الموديل، والسعر لو حابب، وكمان إضافة منتجات للموقع والمخزن وحركة المخزن. ليها يوزر وباسورد لوحدهم، فتقدر تديها لحد في المخزن من غير ما يدخل لوحة التحكم.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={link} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-lg text-sm font-bold inline-flex items-center gap-2 bg-ink text-white"><ExternalLink className="w-4 h-4" /> افتح المحطة</a>
          <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(link).then(() => toast('اتنسخ اللينك'))}><Copy className="w-4 h-4" /> <span dir="ltr">{link.replace(/^https?:\/\//, '')}</span></Button>
        </div>
        <p className="text-sm mt-4">
          {s.configured
            ? <>الحالة: <b className="text-save">شغالة</b> باسم المستخدم <b dir="ltr">{s.username}</b>{s.updatedAt ? <span className="text-steel"> · آخر تغيير {s.updatedAt}{s.updatedBy ? ` (${s.updatedBy})` : ''}</span> : null}</>
            : <>الحالة: <b className="text-sale">مقفولة</b> — حدد يوزر وباسورد عشان تشتغل.</>}
        </p>
      </Card>
      <Card title={s.configured ? 'تغيير اليوزر والباسورد' : 'حدد اليوزر والباسورد'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="اسم المستخدم" hint="حروف إنجليزي وأرقام، من 3 حروف"><Input dir="ltr" value={u} onChange={(e) => setU(e.target.value)} autoComplete="off" autoCapitalize="none" required /></Field>
          <Field label="الباسورد" hint="8 حروف أو أرقام على الأقل"><Input dir="ltr" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="new-password" required /></Field>
          <Field label="اكتب الباسورد تاني"><Input dir="ltr" type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" required /></Field>
          <Button type="submit" loading={busy}>حفظ</Button>
          <p className="text-xs text-steel">ده منفصل عن حسابات لوحة التحكم، ومينفعش يتغيّر غير من هنا. بعد التغيير أي جهاز فاتح المحطة بيطلب دخول من جديد.</p>
        </form>
      </Card>
    </div>
  );
};
