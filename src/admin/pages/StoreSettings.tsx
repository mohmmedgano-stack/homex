import React, { useEffect, useRef, useState } from 'react';
import { api, StoreSettings } from '../../lib/api';
import { Card, Spinner, Input, Field, Button, Toggle, Textarea, useToast } from '../ui';
import { ImagePlus, RotateCcw } from 'lucide-react';
import type { Admin } from '../AdminApp';

export const StoreSettingsPage: React.FC<{ admin: Admin }> = ({ admin }) => {
  const toast = useToast();
  const [s, setS] = useState<StoreSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const owner = admin.role === 'owner';

  useEffect(() => {
    api.get('admin/settings').then(setS).catch((e) => toast(e.message, 'err'));
  }, []);
  if (!s) return <Spinner />;

  const set = (k: keyof StoreSettings, v: string) => setS({ ...s, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      setS(await api.post('admin/settings', s));
      toast('الإعدادات اتحفظت، وظهرت على الموقع');
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (f?: File) => {
    if (!f) return;
    setUp(true);
    try {
      const { url } = await api.upload(f);
      set('logo', url);
      toast('اللوجو اترفع. اضغط «حفظ» عشان يظهر على الموقع');
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setUp(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">إعدادات المتجر</h1>
        {!owner && <p className="text-sm text-sale font-bold mt-1">تقدر تشوف الإعدادات بس، التعديل للمالك.</p>}
      </div>

      <fieldset disabled={!owner} className="space-y-4 sm:space-y-6">
        <Card title="اللوجو والهيدر">
          <div className="grid sm:grid-cols-[260px_1fr] gap-5">
            <div>
              <p className="text-sm font-bold text-ink mb-2">اللوجو</p>
              <div className="bg-ink rounded-xl h-28 flex items-center justify-center p-4">
                <img src={s.logo || '/logo.png'} alt="اللوجو" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" type="button" loading={up} onClick={() => fileRef.current?.click()} className="flex-1">
                  <ImagePlus className="w-4 h-4" /> غيّر اللوجو
                </Button>
                {s.logo && (
                  <Button variant="ghost" type="button" onClick={() => set('logo', '')} aria-label="رجّع اللوجو الأصلي" title="رجّع اللوجو الأصلي">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-steel mt-1.5">يُفضّل PNG بخلفية شفافة ولون أبيض، لأن الهيدر غامق.</p>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => uploadLogo(e.target.files?.[0])} />
            </div>
            <div className="space-y-4">
              <Field label="اسم المتجر">
                <Input value={s.store_name} onChange={(e) => set('store_name', e.target.value)} />
              </Field>
              <Field label="الشريط اللي فوق الهيدر" hint="بيظهر في أعلى كل صفحة">
                <Input value={s.top_bar_text} onChange={(e) => set('top_bar_text', e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card title="بيانات التواصل">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="رقم التليفون" hint="بيظهر في الهيدر والفوتر">
              <Input value={s.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" />
            </Field>
            <Field label="رقم الواتساب" hint="بيظهر زرار واتساب عائم في الموقع">
              <Input value={s.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} dir="ltr" inputMode="tel" placeholder="2010xxxxxxxx" />
            </Field>
            <Field label="الإيميل">
              <Input value={s.email} onChange={(e) => set('email', e.target.value)} dir="ltr" type="email" />
            </Field>
            <Field label="العنوان">
              <Input value={s.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="لينك فيسبوك"><Input value={s.facebook} onChange={(e) => set('facebook', e.target.value)} dir="ltr" placeholder="https://facebook.com/..." /></Field>
            <Field label="لينك إنستجرام"><Input value={s.instagram} onChange={(e) => set('instagram', e.target.value)} dir="ltr" placeholder="https://instagram.com/..." /></Field>
            <Field label="لينك تيك توك"><Input value={s.tiktok} onChange={(e) => set('tiktok', e.target.value)} dir="ltr" placeholder="https://tiktok.com/@..." /></Field>
          </div>
        </Card>

        <Card title="الشحن والدفع">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="مصاريف الشحن" hint="بتتضاف على كل طلب">
              <Input type="number" min="0" inputMode="decimal" value={s.shipping_fee} onChange={(e) => set('shipping_fee', e.target.value)} />
            </Field>
            <Field label="شحن مجاني للطلبات فوق" hint="سيبها 0 لو مفيش شحن مجاني">
              <Input type="number" min="0" inputMode="decimal" value={s.free_shipping_over} onChange={(e) => set('free_shipping_over', e.target.value)} />
            </Field>
          </div>
          <div className="mt-5 space-y-4">
            <Toggle checked={s.pay_cod === '1'} onChange={(v) => set('pay_cod', v ? '1' : '0')} label="الدفع عند الاستلام" />
            <Field label="رقم فودافون كاش" hint="لو كتبته، هيظهر كطريقة دفع للعميل">
              <Input value={s.pay_vodafone} onChange={(e) => set('pay_vodafone', e.target.value)} dir="ltr" inputMode="tel" />
            </Field>
            <Field label="حساب إنستاباي" hint="اسم الحساب أو الرقم">
              <Input value={s.pay_instapay} onChange={(e) => set('pay_instapay', e.target.value)} dir="ltr" />
            </Field>
          </div>
        </Card>

        <Card title="كلام الصفحة الرئيسية">
          <div className="space-y-4">
            <Field label="عنوان رئيسي" hint="اختياري، بيظهر فوق الأقسام">
              <Input value={s.hero_title} onChange={(e) => set('hero_title', e.target.value)} placeholder="كل أساسيات بيتك عندنا أسهل" />
            </Field>
            <Field label="جملة تحت العنوان" hint="اختياري">
              <Textarea rows={2} value={s.hero_subtitle} onChange={(e) => set('hero_subtitle', e.target.value)} />
            </Field>
          </div>
        </Card>
      </fieldset>

      {owner && (
        <div className="fixed bottom-0 inset-x-0 lg:right-64 bg-white/95 backdrop-blur border-t border-line p-3 flex justify-end z-20">
          <Button onClick={save} loading={busy} className="h-12 px-8 text-base w-full sm:w-auto">حفظ الإعدادات</Button>
        </div>
      )}
    </div>
  );
};
